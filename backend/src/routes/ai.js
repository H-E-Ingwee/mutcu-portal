const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')
const { authenticate, requireRole } = require('../middleware/auth')
const ai = require('../lib/ai')

const TREASURER = ['cu_treasurer', 'super_admin', 'ec_admin']
const CAN_VIEW = ['cu_treasurer', 'super_admin', 'ec_admin', 'cu_secretary']

// GET /api/ai/status — check if AI is available
router.get('/status', authenticate, async (req, res) => {
  res.json({ available: ai.isAvailable(), model: 'llama-3.1-70b-versatile', provider: 'groq' })
})

// ═══════════════════════════════════════════════════════════════
// 1. AI REQUISITION REVIEWER
// POST /api/ai/treasury/review-requisition
// ═══════════════════════════════════════════════════════════════
router.post('/treasury/review-requisition', authenticate, requireRole(...TREASURER), async (req, res) => {
  try {
    if (!ai.isAvailable()) return res.status(503).json({ error: 'AI service not configured. Add GROQ_API_KEY to environment.' })

    const { requisition_id } = req.body
    if (!requisition_id) return res.status(400).json({ error: 'requisition_id required' })

    // Fetch requisition
    const { data: req_data, error: reqErr } = await supabase.from('requisitions')
      .select('*, requester:requested_by(name,role,primary_ministry)')
      .eq('id', requisition_id).single()
    if (reqErr || !req_data) return res.status(404).json({ error: 'Requisition not found' })

    // Fetch ministry history (last 10 requisitions from same ministry)
    const { data: history } = await supabase.from('requisitions')
      .select('requisition_number,total_requested,total_approved,status,requested_by')
      .eq('ministry', req_data.ministry || '')
      .neq('id', requisition_id)
      .order('created_at', { ascending: false })
      .limit(10)

    // Fetch budget for this ministry and year
    let budget = null
    if (req_data.spiritual_year && req_data.ministry) {
      const { data: vsActual } = await supabase.rpc
        ? null // RPC not used here
        : { data: null }

      // Simple budget lookup
      const { data: budgetData } = await supabase.from('budgets')
        .select('allocated_amount')
        .eq('spiritual_year', req_data.spiritual_year)
        .eq('ministry', req_data.ministry)

      if (budgetData && budgetData.length > 0) {
        const allocated = budgetData.reduce((s, b) => s + parseFloat(b.allocated_amount || 0), 0)
        // Get spent amount
        const { data: spent } = await supabase.from('requisitions')
          .select('total_approved,total_requested')
          .eq('spiritual_year', req_data.spiritual_year)
          .eq('ministry', req_data.ministry)
          .in('status', ['approved', 'partially_approved', 'disbursed'])
        const spentTotal = (spent || []).reduce((s, r) => s + parseFloat(r.total_approved || r.total_requested || 0), 0)
        budget = { allocated, spent: spentTotal, remaining: allocated - spentTotal }
      }
    }

    const review = await ai.reviewRequisition(req_data, history || [], budget)

    // Store the AI review in the requisition (optional — as a note)
    await supabase.from('requisitions').update({
      review_notes: `[AI Review] ${review.recommendation} — ${review.reasoning}`,
      updated_at: new Date().toISOString(),
    }).eq('id', requisition_id).then(() => {}).catch(() => {})

    res.json({ review, requisition_number: req_data.requisition_number })
  } catch (err) {
    console.error('[AI REVIEW ERROR]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════
// 2. AI BUDGET ADVISOR
// POST /api/ai/treasury/budget-advice
// ═══════════════════════════════════════════════════════════════
router.post('/treasury/budget-advice', authenticate, requireRole(...CAN_VIEW), async (req, res) => {
  try {
    if (!ai.isAvailable()) return res.status(503).json({ error: 'AI service not configured.' })

    const { spiritual_year } = req.body
    if (!spiritual_year) return res.status(400).json({ error: 'spiritual_year required' })

    // Fetch budget vs actual
    const [budgetsRes, reqRes, balanceRes] = await Promise.all([
      supabase.from('budgets').select('*').eq('spiritual_year', spiritual_year),
      supabase.from('requisitions').select('ministry,total_approved,total_requested,status')
        .eq('spiritual_year', spiritual_year)
        .in('status', ['approved', 'partially_approved', 'disbursed']),
      supabase.from('income_entries').select('amount').eq('spiritual_year', spiritual_year),
    ])

    const budgets = budgetsRes.data || []
    const reqs = reqRes.data || []
    const incomeEntries = balanceRes.data || []

    // Build vs-actual
    const actual = {}
    reqs.forEach(r => {
      const m = r.ministry || 'General'
      actual[m] = (actual[m] || 0) + parseFloat(r.total_approved || r.total_requested || 0)
    })

    const allMinistries = [...new Set([...budgets.map(b => b.ministry), ...Object.keys(actual)])]
    const vsActual = allMinistries.map(ministry => {
      const allocated = budgets.filter(b => b.ministry === ministry).reduce((s, b) => s + parseFloat(b.allocated_amount || 0), 0)
      const spent = actual[ministry] || 0
      return {
        ministry,
        allocated,
        spent,
        remaining: allocated - spent,
        utilization: allocated > 0 ? Math.round((spent / allocated) * 100) : null,
        over_budget: spent > allocated && allocated > 0,
      }
    }).sort((a, b) => b.allocated - a.allocated)

    const totalIncome = incomeEntries.reduce((s, e) => s + parseFloat(e.amount || 0), 0)
    const totalExpenses = reqs.reduce((s, r) => s + parseFloat(r.total_approved || r.total_requested || 0), 0)
    const balance = { total_income: totalIncome, total_expenses: totalExpenses, balance: totalIncome - totalExpenses }

    const advice = await ai.generateBudgetAdvice(vsActual, spiritual_year, balance)

    res.json({ advice, spiritual_year, generated_at: new Date().toISOString() })
  } catch (err) {
    console.error('[AI BUDGET ADVICE ERROR]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════
// 3. AI FINANCIAL SUMMARY GENERATOR
// POST /api/ai/treasury/financial-narrative
// ═══════════════════════════════════════════════════════════════
router.post('/treasury/financial-narrative', authenticate, requireRole(...CAN_VIEW), async (req, res) => {
  try {
    if (!ai.isAvailable()) return res.status(503).json({ error: 'AI service not configured.' })

    const { spiritual_year } = req.body
    if (!spiritual_year) return res.status(400).json({ error: 'spiritual_year required' })

    const [incomeRes, reqRes] = await Promise.all([
      supabase.from('income_entries').select('*').eq('spiritual_year', spiritual_year),
      supabase.from('requisitions').select('*').eq('spiritual_year', spiritual_year),
    ])

    const income = incomeRes.data || []
    const reqs = reqRes.data || []

    const totalIncome = income.reduce((s, r) => s + parseFloat(r.amount || 0), 0)
    const totalExpenses = reqs.filter(r => r.status === 'disbursed').reduce((s, r) => s + parseFloat(r.total_approved || r.total_requested || 0), 0)

    const incomeByCategory = {}
    income.forEach(i => { incomeByCategory[i.category] = (incomeByCategory[i.category] || 0) + parseFloat(i.amount || 0) })

    const spendingByMinistry = {}
    reqs.filter(r => r.status === 'disbursed').forEach(r => {
      const m = r.ministry || 'General'
      spendingByMinistry[m] = (spendingByMinistry[m] || 0) + parseFloat(r.total_approved || r.total_requested || 0)
    })

    const requisitionStats = reqs.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc }, {})

    const narrative = await ai.generateFinancialNarrative({
      spiritualYear: spiritual_year,
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      incomeByCategory,
      spendingByMinistry,
      requisitionStats,
    })

    res.json({ narrative, spiritual_year, generated_at: new Date().toISOString() })
  } catch (err) {
    console.error('[AI NARRATIVE ERROR]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════
// 4. AI ANOMALY DETECTOR
// POST /api/ai/treasury/anomaly-check
// ═══════════════════════════════════════════════════════════════
router.post('/treasury/anomaly-check', authenticate, async (req, res) => {
  try {
    if (!ai.isAvailable()) return res.json({ risk_level: 'CLEAR', flags: [], has_anomalies: false })

    const { requisition_id } = req.body
    if (!requisition_id) return res.status(400).json({ error: 'requisition_id required' })

    const { data: req_data } = await supabase.from('requisitions')
      .select('*').eq('id', requisition_id).single()
    if (!req_data) return res.status(404).json({ error: 'Requisition not found' })

    // History: same ministry + same requester
    const { data: history } = await supabase.from('requisitions')
      .select('requisition_number,total_requested,total_approved,status,requested_by,ministry')
      .or(`ministry.eq.${req_data.ministry || ''},requested_by.eq.${req_data.requested_by}`)
      .neq('id', requisition_id)
      .order('created_at', { ascending: false })
      .limit(20)

    // Budget
    let budget = null
    if (req_data.spiritual_year && req_data.ministry) {
      const { data: budgetData } = await supabase.from('budgets')
        .select('allocated_amount')
        .eq('spiritual_year', req_data.spiritual_year)
        .eq('ministry', req_data.ministry)
      if (budgetData?.length > 0) {
        const allocated = budgetData.reduce((s, b) => s + parseFloat(b.allocated_amount || 0), 0)
        const { data: spent } = await supabase.from('requisitions')
          .select('total_approved,total_requested')
          .eq('spiritual_year', req_data.spiritual_year)
          .eq('ministry', req_data.ministry)
          .in('status', ['approved', 'partially_approved', 'disbursed'])
        const spentTotal = (spent || []).reduce((s, r) => s + parseFloat(r.total_approved || r.total_requested || 0), 0)
        budget = { allocated, spent: spentTotal, remaining: allocated - spentTotal }
      }
    }

    const result = await ai.detectAnomalies(req_data, history || [], budget)
    res.json(result)
  } catch (err) {
    console.error('[AI ANOMALY ERROR]', err.message)
    res.json({ risk_level: 'CLEAR', flags: [], has_anomalies: false }) // Fail silently
  }
})

// ═══════════════════════════════════════════════════════════════
// 5. AI INCOME FORECASTER
// POST /api/ai/treasury/income-forecast
// ═══════════════════════════════════════════════════════════════
router.post('/treasury/income-forecast', authenticate, requireRole(...CAN_VIEW), async (req, res) => {
  try {
    if (!ai.isAvailable()) return res.status(503).json({ error: 'AI service not configured.' })

    const { spiritual_year } = req.body
    if (!spiritual_year) return res.status(400).json({ error: 'spiritual_year required' })

    // Get year end date
    const { data: yearData } = await supabase.from('financial_years')
      .select('end_date').eq('label', spiritual_year).single()
    const yearEndDate = yearData?.end_date || `${spiritual_year.split('/')[1]}-08-31`

    const { data: incomeHistory } = await supabase.from('income_entries')
      .select('*').eq('spiritual_year', spiritual_year).order('date', { ascending: true })

    if (!incomeHistory || incomeHistory.length < 2) {
      return res.json({
        forecast: null,
        message: 'Not enough income data to generate a forecast. Record at least 2 income entries first.',
      })
    }

    const forecast = await ai.forecastIncome(incomeHistory, spiritual_year, yearEndDate)
    res.json({ forecast, spiritual_year, generated_at: new Date().toISOString() })
  } catch (err) {
    console.error('[AI FORECAST ERROR]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════
// AI PHASE 6B — NOMINATIONS AI
// ═══════════════════════════════════════════════════════════════

// POST /api/ai/nominations/draft-announcement — draft cycle announcement
router.post('/nominations/draft-announcement', authenticate, requireRole('super_admin', 'ec_admin', 'nc_chair'), async (req, res) => {
  try {
    if (!ai.isAvailable()) return res.status(503).json({ error: 'AI service not configured' })
    const { cycle_title, spiritual_year, nomination_open_date, nomination_close_date, agm_date, positions } = req.body

    const prompt = `Draft a clear, exciting nomination cycle announcement for MUTCU (Murang'a University of Technology Christian Union).

Cycle: ${cycle_title}
Spiritual Year: ${spiritual_year}
Nominations Open: ${nomination_open_date}
Nominations Close: ${nomination_close_date}
AGM Date: ${agm_date || 'TBA'}
Positions: ${positions || 'All EC positions'}

Create TWO versions:
1. WhatsApp message (short, emoji-friendly, max 200 words)
2. Notice board text (formal, max 150 words)

Respond as valid JSON only:
{
  "whatsapp": "...",
  "notice_board": "...",
  "subject_line": "..."
}`

    const text = await ai.callGroq([
      { role: 'system', content: ai.MUTCU_CONTEXT },
      { role: 'user', content: prompt }
    ], 600, 0.6)

    const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}')
    res.json({ announcement: parsed, generated_at: new Date().toISOString() })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/ai/nominations/eligibility-check — AI eligibility pre-check for all candidates
router.post('/nominations/eligibility-check', authenticate, requireRole('nc_chair', 'nc_secretary', 'ec_admin', 'super_admin'), async (req, res) => {
  try {
    if (!ai.isAvailable()) return res.status(503).json({ error: 'AI service not configured' })
    const { cycle_id } = req.body
    if (!cycle_id) return res.status(400).json({ error: 'cycle_id required' })

    // Get all candidates with their eligibility data
    const { data: recommendations } = await supabase.from('recommendations')
      .select('candidate_id, position_id, position:position_id(title,gender_constraint,max_terms), candidate:candidate_id(name,year_of_study,is_finalist,disciplinary_status,sgc_executive_role,faith_declaration_signed,gender,course_type,membership_type)')
      .eq('cycle_id', cycle_id)

    if (!recommendations || recommendations.length === 0) {
      return res.json({ checks: [], message: 'No candidates found for this cycle' })
    }

    // Group by candidate
    const candidateMap = {}
    recommendations.forEach(r => {
      const id = r.candidate_id
      if (!candidateMap[id]) {
        candidateMap[id] = { candidate: r.candidate, positions: [] }
      }
      candidateMap[id].positions.push(r.position)
    })

    // Run eligibility checks
    const checks = Object.entries(candidateMap).map(([id, { candidate, positions }]) => {
      const flags = []
      let status = 'green'

      if (!candidate.faith_declaration_signed) { flags.push('Faith declaration not signed'); status = 'red' }
      if (candidate.year_of_study <= 1) { flags.push('First year — not eligible'); status = 'red' }
      if (candidate.is_finalist) { flags.push('Finalist — cannot be nominated'); status = 'red' }
      if (candidate.disciplinary_status !== 'clear') { flags.push(`Disciplinary status: ${candidate.disciplinary_status}`); status = 'red' }
      if (candidate.sgc_executive_role) { flags.push('Holds SGC executive role'); status = 'yellow' }
      if (candidate.membership_type !== 'full') { flags.push(`Membership type: ${candidate.membership_type}`); status = 'yellow' }

      // Gender checks per position
      positions.forEach(pos => {
        if (pos?.gender_constraint && pos.gender_constraint !== candidate.gender) {
          flags.push(`${pos.title} requires ${pos.gender_constraint} — candidate is ${candidate.gender}`)
          status = 'red'
        }
      })

      if (flags.length === 0) flags.push('All eligibility checks passed')
      else if (status === 'green') status = 'yellow'

      return {
        candidate_id: id,
        name: candidate.name,
        year_of_study: candidate.year_of_study,
        positions: positions.map(p => p?.title).filter(Boolean),
        status,
        flags,
      }
    })

    // AI summary of overall eligibility landscape
    const redCount = checks.filter(c => c.status === 'red').length
    const yellowCount = checks.filter(c => c.status === 'yellow').length
    let aiSummary = null

    if (redCount > 0 || yellowCount > 0) {
      try {
        const summaryPrompt = `Summarize the eligibility check results for MUTCU nomination cycle in 2-3 sentences. ${redCount} candidates have critical issues (ineligible), ${yellowCount} have warnings, ${checks.length - redCount - yellowCount} are fully eligible. Be concise and actionable.`
        aiSummary = await ai.callGroq([
          { role: 'system', content: ai.MUTCU_CONTEXT },
          { role: 'user', content: summaryPrompt }
        ], 200, 0.4)
      } catch {}
    }

    res.json({ checks, summary: aiSummary, total: checks.length, red: redCount, yellow: yellowCount, green: checks.length - redCount - yellowCount })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/ai/nominations/draft-reminder — draft deadline reminder
router.post('/nominations/draft-reminder', authenticate, requireRole('ec_admin', 'super_admin', 'nc_chair'), async (req, res) => {
  try {
    if (!ai.isAvailable()) return res.status(503).json({ error: 'AI service not configured' })
    const { cycle_title, days_remaining, total_members, nominated_count, close_date } = req.body

    const prompt = `Draft a nomination deadline reminder for MUTCU members.

Cycle: ${cycle_title}
Days remaining: ${days_remaining}
Members who have nominated: ${nominated_count} of ${total_members}
Deadline: ${close_date}

Write a short, urgent but encouraging WhatsApp reminder (max 120 words, use emojis). Remind members to prayerfully nominate before the deadline. Include the portal URL: portal.mutcu.org`

    const text = await ai.callGroq([
      { role: 'system', content: ai.MUTCU_CONTEXT },
      { role: 'user', content: prompt }
    ], 250, 0.7)

    res.json({ reminder: text.trim(), generated_at: new Date().toISOString() })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ═══════════════════════════════════════════════════════════════
// AI PHASE 6C — ADMIN AI
// ═══════════════════════════════════════════════════════════════

// POST /api/ai/admin/meeting-minutes — summarize raw meeting notes
router.post('/admin/meeting-minutes', authenticate, requireRole('super_admin', 'ec_admin', 'cu_secretary'), async (req, res) => {
  try {
    if (!ai.isAvailable()) return res.status(503).json({ error: 'AI service not configured' })
    const { raw_notes, meeting_date, attendees } = req.body
    if (!raw_notes) return res.status(400).json({ error: 'raw_notes required' })

    const prompt = `You are formatting EC meeting minutes for MUTCU (Murang'a University of Technology Christian Union).

Meeting Date: ${meeting_date || 'Not specified'}
Attendees: ${attendees || 'Not specified'}

Raw Notes:
${raw_notes}

Format these into clean, official MUTCU EC meeting minutes with these sections:
1. Meeting Details (date, venue, attendees, apologies)
2. Agenda Items Discussed
3. Decisions Made (numbered)
4. Action Items (person responsible + deadline)
5. Next Meeting

Write in formal but clear English. No markdown stars. Use numbered lists for decisions and action items.`

    const text = await ai.callGroq([
      { role: 'system', content: ai.MUTCU_CONTEXT },
      { role: 'user', content: prompt }
    ], 800, 0.4)

    res.json({ minutes: text.trim(), generated_at: new Date().toISOString() })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/ai/admin/engagement-analysis — analyze member engagement data
router.post('/admin/engagement-analysis', authenticate, requireRole('super_admin', 'ec_admin', 'cu_secretary'), async (req, res) => {
  try {
    if (!ai.isAvailable()) return res.status(503).json({ error: 'AI service not configured' })
    const { tier_counts, avg_score, total, low_engagement } = req.body

    const prompt = `Analyze MUTCU member engagement data and provide actionable insights for the EC.

Total Members: ${total}
Average Score: ${avg_score}/100
Highly Engaged: ${tier_counts?.highly_engaged || 0}
Active: ${tier_counts?.active || 0}
Moderate: ${tier_counts?.moderate || 0}
Low Engagement: ${tier_counts?.low || 0}
Inactive: ${tier_counts?.inactive || 0}
Members needing follow-up: ${low_engagement}

Provide:
1. Overall assessment (1-2 sentences)
2. Key concern areas
3. 3 specific actionable recommendations for the EC
4. Which ministry/welfare team should follow up

Write in plain English, no markdown. Keep it under 200 words.`

    const text = await ai.callGroq([
      { role: 'system', content: ai.MUTCU_CONTEXT },
      { role: 'user', content: prompt }
    ], 400, 0.5)

    res.json({ analysis: text.trim(), generated_at: new Date().toISOString() })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/ai/admin/disciplinary-advice — constitutional disciplinary guidance
router.post('/admin/disciplinary-advice', authenticate, requireRole('super_admin', 'ec_admin'), async (req, res) => {
  try {
    if (!ai.isAvailable()) return res.status(503).json({ error: 'AI service not configured' })
    const { offense_description, severity, member_history } = req.body
    if (!offense_description) return res.status(400).json({ error: 'offense_description required' })

    const prompt = `You are advising the MUTCU Executive Council on a disciplinary matter, guided by the MUTCU Constitution 2025.

Offense: ${offense_description}
Severity: ${severity || 'Not specified'}
Member History: ${member_history || 'No prior cases'}

Based on MUTCU Constitution Article 8.5 (disciplinary provisions), advise:
1. Appropriate disciplinary process to follow
2. Required steps (written notice, hearing, quorum, etc.)
3. Recommended outcome range based on severity
4. Timeline for the process
5. Any constitutional requirements to observe

Be specific and reference constitutional articles where relevant. Write in plain English.`

    const text = await ai.callGroq([
      { role: 'system', content: ai.MUTCU_CONTEXT },
      { role: 'user', content: prompt }
    ], 500, 0.4)

    res.json({ advice: text.trim(), generated_at: new Date().toISOString() })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/ai/admin/compose-announcement — draft an announcement
router.post('/admin/compose-announcement', authenticate, requireRole('super_admin', 'ec_admin', 'cu_secretary'), async (req, res) => {
  try {
    if (!ai.isAvailable()) return res.status(503).json({ error: 'AI service not configured' })
    const { topic, tone, additional_details } = req.body
    if (!topic) return res.status(400).json({ error: 'topic required' })

    const prompt = `Draft a MUTCU announcement for the member portal.

Topic: ${topic}
Tone: ${tone || 'Professional and warm'}
Additional details: ${additional_details || 'None'}

Write a clear, engaging announcement (100-200 words) suitable for the MUTCU DMS announcements section. Include a clear call to action if relevant. Write in plain English, no markdown.`

    const text = await ai.callGroq([
      { role: 'system', content: ai.MUTCU_CONTEXT },
      { role: 'user', content: prompt }
    ], 350, 0.7)

    res.json({ announcement: text.trim(), generated_at: new Date().toISOString() })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router