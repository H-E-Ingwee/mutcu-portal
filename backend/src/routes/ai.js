const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')
const { authenticate, requireRole } = require('../middleware/auth')
const ai = require('../lib/ai')

const TREASURER = ['cu_treasurer', 'super_admin', 'ec_admin']
const CAN_VIEW = ['cu_treasurer', 'super_admin', 'ec_admin', 'cu_secretary']

// GET /api/ai/status — check if AI is available
router.get('/status', authenticate, async (req, res) => {
  res.json({ available: ai.isAvailable(), model: 'llama-3.3-70b-versatile', provider: 'groq' })
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

module.exports = router