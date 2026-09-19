/**
 * MUTCU DMS — AI Library (Groq)
 * Powers all AI features in the DMS portal
 * Model: llama-3.1-70b-versatile (primary) with fallbacks (free tier: 14,400 req/day)
 */
require('dotenv').config()

const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
// Active Groq models (updated Sep 2026 — decommissioned models removed)
// Reference: https://console.groq.com/docs/models
const GROQ_MODELS = [
  'llama-3.1-70b-versatile',   // Most capable, free tier
  'llama-3.1-8b-instant',      // Fast, free tier
  'gemma2-9b-it',              // Google Gemma, free tier
  'mixtral-8x7b-32768',        // Mistral, free tier
]
const GROQ_MODEL = GROQ_MODELS[0] // primary

// ─── MUTCU Context ────────────────────────────────────────────
const MUTCU_CONTEXT = `You are an AI assistant for MUTCU (Murang'a University of Technology Christian Union) — a Christ-centred student fellowship in Kenya.
MUTCU motto: "Inspire Love, Hope and Godliness."
Financial year: 1 September → 31 August.
Currency: Kenyan Shillings (KES).
Ministries: Prayer, Music, Missions & Evangelism, Bible Study & Training, Discipleship, Creative Arts (CREAM), Technical & Media, Hospitality, Welfare Committee, Resource Mobilization Committee (RMC).
Be concise, professional, and Christ-centred in all responses.`

// ─── Core Groq caller — tries models in order ─────────────────
async function callGroq(messages, maxTokens = 600, temperature = 0.5) {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured on server')

  let lastError = null

  for (const model of GROQ_MODELS) {
    try {
      const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
          stream: false,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        const errMsg = err.error?.message || `Groq API error: ${response.status}`
        // If model not found or no access, try next model
        if (errMsg.includes('does not exist') || errMsg.includes('no access') || response.status === 404) {
          console.warn(`[GROQ] Model ${model} unavailable, trying next...`)
          lastError = new Error(errMsg)
          continue
        }
        throw new Error(errMsg)
      }

      const result = await response.json()
      const text = result.choices?.[0]?.message?.content
      if (!text) throw new Error('Empty response from Groq')
      if (model !== GROQ_MODELS[0]) console.log(`[GROQ] Used fallback model: ${model}`)
      return text.trim()
    } catch (err) {
      if (err.message?.includes('does not exist') || err.message?.includes('no access')) {
        lastError = err
        continue
      }
      throw err
    }
  }

  throw lastError || new Error('All Groq models unavailable')
}

// ─── Helper: parse JSON from AI response ─────────────────────
function parseJSON(text) {
  try {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
    if (match) return JSON.parse(match[0])
  } catch {}
  return null
}

// ─── Helper: clean markdown from AI response ─────────────────
function cleanText(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/^[-•]\s/gm, '')
    .trim()
}

// ═══════════════════════════════════════════════════════════════
// TREASURY AI FEATURES
// ═══════════════════════════════════════════════════════════════

/**
 * 1. AI REQUISITION REVIEWER
 * Analyzes a requisition and suggests a fair approved amount with reasoning.
 * @param {Object} requisition - Full requisition object with items
 * @param {Array} history - Past requisitions from same ministry
 * @param {Object} budget - Budget allocation for this ministry
 */
async function reviewRequisition(requisition, history = [], budget = null) {
  const items = typeof requisition.items === 'string' ? JSON.parse(requisition.items) : (requisition.items || [])
  const itemList = items.map(i => `  - ${i.description}: ${i.quantity} × KES ${i.unit_cost} = KES ${i.total}`).join('\n')

  const historyText = history.length > 0
    ? history.slice(0, 5).map(h => `  - ${h.requisition_number}: KES ${h.total_requested} requested, KES ${h.total_approved || 'N/A'} approved (${h.status})`).join('\n')
    : '  No previous requisitions found for this ministry.'

  const budgetText = budget
    ? `Budget allocated for ${requisition.ministry}: KES ${budget.allocated} | Spent so far: KES ${budget.spent} | Remaining: KES ${budget.remaining}`
    : 'No budget allocation found for this ministry.'

  const prompt = `You are reviewing a financial requisition for MUTCU (Murang'a University of Technology Christian Union) in Kenya.

REQUISITION DETAILS:
- Number: ${requisition.requisition_number}
- Title: ${requisition.title}
- Ministry: ${requisition.ministry || 'General'}
- Purpose: ${requisition.purpose || 'Not specified'}
- Total Requested: KES ${requisition.total_requested}
- Items:
${itemList}

MINISTRY BUDGET STATUS:
${budgetText}

MINISTRY REQUISITION HISTORY (last 5):
${historyText}

Analyze this requisition and provide:
1. A suggested approved amount (in KES) — be fair but fiscally responsible
2. Your reasoning (2-3 sentences)
3. Any specific flags or concerns about individual items
4. An overall risk level: LOW, MEDIUM, or HIGH

Respond as valid JSON only:
{
  "suggested_amount": <number>,
  "reasoning": "<2-3 sentence explanation>",
  "flags": ["<flag1>", "<flag2>"],
  "risk_level": "LOW|MEDIUM|HIGH",
  "recommendation": "APPROVE|PARTIALLY_APPROVE|REQUEST_CLARIFICATION|REJECT",
  "notes_for_requester": "<optional message to send back to requester>"
}`

  const text = await callGroq([
    { role: 'system', content: MUTCU_CONTEXT },
    { role: 'user', content: prompt }
  ], 500, 0.3)

  const parsed = parseJSON(text)
  if (!parsed) throw new Error('Failed to parse AI review response')
  return parsed
}

/**
 * 2. AI BUDGET ADVISOR
 * Analyzes budget vs actual spending and generates ministry-level advisory notes.
 * @param {Array} vsActual - Array of {ministry, allocated, spent, remaining, utilization, over_budget}
 * @param {string} spiritualYear - e.g. "2026/2027"
 * @param {Object} balance - {total_income, total_expenses, balance}
 */
async function generateBudgetAdvice(vsActual, spiritualYear, balance = null) {
  const ministryLines = vsActual.map(m =>
    `  - ${m.ministry}: Allocated KES ${m.allocated?.toLocaleString() || 0}, Spent KES ${m.spent?.toLocaleString() || 0}, Remaining KES ${m.remaining?.toLocaleString() || 0} (${m.utilization ?? 'N/A'}% used)${m.over_budget ? ' ⚠️ OVER BUDGET' : ''}`
  ).join('\n')

  const balanceText = balance
    ? `Overall fund balance: Income KES ${balance.total_income?.toLocaleString()}, Expenses KES ${balance.total_expenses?.toLocaleString()}, Net KES ${balance.balance?.toLocaleString()}`
    : ''

  const prompt = `You are the financial advisor for MUTCU (Murang'a University of Technology Christian Union) in Kenya.

FINANCIAL YEAR: ${spiritualYear}
${balanceText}

MINISTRY BUDGET STATUS:
${ministryLines}

Provide a concise budget advisory report for the CU Treasurer covering:
1. Overall financial health assessment (1-2 sentences)
2. Ministries at risk (over budget or >80% utilized) — specific advice for each
3. Ministries with low utilization (<30%) — should they reallocate?
4. Top 2-3 actionable recommendations for the Treasurer
5. A brief encouraging closing note

Write in plain professional English. No markdown stars or bullet symbols — use numbered lists only. Keep it under 300 words.`

  const text = await callGroq([
    { role: 'system', content: MUTCU_CONTEXT },
    { role: 'user', content: prompt }
  ], 500, 0.5)

  return cleanText(text)
}

/**
 * 3. AI FINANCIAL SUMMARY GENERATOR
 * Generates a professional narrative for EC meetings / AGM.
 * @param {Object} data - { income, expenses, balance, byMinistry, byCategory, requisitionStats, spiritualYear }
 */
async function generateFinancialNarrative(data) {
  const { spiritualYear, totalIncome, totalExpenses, balance, incomeByCategory, spendingByMinistry, requisitionStats } = data

  const incomeLines = Object.entries(incomeByCategory || {})
    .map(([k, v]) => `${k}: KES ${v.toLocaleString()}`)
    .join(', ')

  const spendingLines = Object.entries(spendingByMinistry || {})
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}: KES ${v.toLocaleString()}`)
    .join(', ')

  const reqStats = Object.entries(requisitionStats || {})
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
    .join(', ')

  const prompt = `Write a professional financial summary report for MUTCU (Murang'a University of Technology Christian Union) for the ${spiritualYear} spiritual year. This will be presented at the EC meeting / AGM.

FINANCIAL DATA:
- Total Income: KES ${totalIncome?.toLocaleString() || 0}
- Total Expenditure: KES ${totalExpenses?.toLocaleString() || 0}
- Net Balance: KES ${balance?.toLocaleString() || 0}
- Income by Category: ${incomeLines || 'No data'}
- Spending by Ministry: ${spendingLines || 'No data'}
- Requisition Statistics: ${reqStats || 'No data'}

Write a 4-5 paragraph professional narrative that:
1. Opens with an overview of the financial year
2. Discusses income sources and trends
3. Discusses expenditure by ministry
4. Comments on financial health and stewardship
5. Closes with a forward-looking statement and acknowledgment of God's provision

Write in formal but accessible English. No markdown. Use paragraph breaks only.`

  const text = await callGroq([
    { role: 'system', content: MUTCU_CONTEXT },
    { role: 'user', content: prompt }
  ], 700, 0.6)

  return cleanText(text)
}

/**
 * 4. AI ANOMALY DETECTOR
 * Checks a new requisition for unusual patterns.
 * @param {Object} requisition - New requisition being submitted
 * @param {Array} history - Past requisitions from same ministry/requester
 * @param {Object} budget - Budget status for ministry
 */
async function detectAnomalies(requisition, history = [], budget = null) {
  const avgHistorical = history.length > 0
    ? history.reduce((s, h) => s + parseFloat(h.total_requested || 0), 0) / history.length
    : null

  const recentByRequester = history.filter(h => h.requested_by === requisition.requested_by).length

  const items = typeof requisition.items === 'string' ? JSON.parse(requisition.items) : (requisition.items || [])
  const hasVagueItems = items.some(i => !i.description || i.description.toLowerCase().includes('miscellaneous') || i.description.toLowerCase().includes('other'))
  const hasHighUnitCost = items.some(i => parseFloat(i.unit_cost) > 10000)

  const flags = []
  let riskScore = 0

  // Rule-based checks (fast, no AI needed for these)
  if (avgHistorical && parseFloat(requisition.total_requested) > avgHistorical * 2) {
    flags.push(`Amount (KES ${parseFloat(requisition.total_requested).toLocaleString()}) is ${Math.round(parseFloat(requisition.total_requested) / avgHistorical)}x the ministry average (KES ${Math.round(avgHistorical).toLocaleString()})`)
    riskScore += 30
  }

  if (budget && budget.remaining < parseFloat(requisition.total_requested)) {
    flags.push(`Exceeds remaining budget by KES ${(parseFloat(requisition.total_requested) - budget.remaining).toLocaleString()}`)
    riskScore += 25
  }

  if (recentByRequester >= 3) {
    flags.push(`Requester has submitted ${recentByRequester} requisitions recently`)
    riskScore += 15
  }

  if (hasVagueItems) {
    flags.push('Contains vague item descriptions (e.g. "Miscellaneous" or "Other")')
    riskScore += 20
  }

  if (hasHighUnitCost) {
    flags.push('Contains items with unit cost above KES 10,000 — verify with receipts/quotes')
    riskScore += 10
  }

  // Only call AI if there are flags worth analyzing
  let aiInsight = null
  if (flags.length > 0) {
    try {
      const prompt = `A requisition for MUTCU has triggered automated flags. Provide a brief (2-3 sentence) risk assessment.

Requisition: "${requisition.title}" from ${requisition.ministry || 'General'} ministry
Amount: KES ${parseFloat(requisition.total_requested).toLocaleString()}
Flags detected: ${flags.join('; ')}

Is this likely a genuine concern or a false positive? What should the Treasurer look for when reviewing?
Write in plain English, no markdown.`

      aiInsight = cleanText(await callGroq([
        { role: 'system', content: MUTCU_CONTEXT },
        { role: 'user', content: prompt }
      ], 200, 0.3))
    } catch {}
  }

  const riskLevel = riskScore >= 50 ? 'HIGH' : riskScore >= 25 ? 'MEDIUM' : flags.length > 0 ? 'LOW' : 'CLEAR'

  return {
    risk_level: riskLevel,
    risk_score: riskScore,
    flags,
    ai_insight: aiInsight,
    has_anomalies: flags.length > 0,
  }
}

/**
 * 5. AI INCOME FORECASTER
 * Forecasts remaining income for the year based on historical patterns.
 * @param {Array} incomeHistory - Past income entries for the year
 * @param {string} spiritualYear - e.g. "2026/2027"
 * @param {string} yearEndDate - e.g. "2027-08-31"
 */
async function forecastIncome(incomeHistory, spiritualYear, yearEndDate) {
  if (!incomeHistory || incomeHistory.length === 0) {
    return { forecast: null, message: 'Not enough income data to generate a forecast. Record at least 4 weeks of income first.' }
  }

  // Calculate weekly averages by category
  const byCategory = {}
  incomeHistory.forEach(entry => {
    const cat = entry.category || 'General'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(parseFloat(entry.amount || 0))
  })

  const categoryAverages = Object.entries(byCategory).map(([cat, amounts]) => ({
    category: cat,
    count: amounts.length,
    total: amounts.reduce((s, a) => s + a, 0),
    average: amounts.reduce((s, a) => s + a, 0) / amounts.length,
  }))

  const totalSoFar = incomeHistory.reduce((s, e) => s + parseFloat(e.amount || 0), 0)
  const weeksRemaining = Math.max(0, Math.ceil((new Date(yearEndDate) - new Date()) / (7 * 24 * 60 * 60 * 1000)))

  const categoryLines = categoryAverages.map(c =>
    `${c.category}: ${c.count} entries, total KES ${c.total.toLocaleString()}, average KES ${Math.round(c.average).toLocaleString()} per entry`
  ).join('\n')

  const prompt = `You are forecasting income for MUTCU (Murang'a University of Technology Christian Union) for the ${spiritualYear} financial year.

INCOME RECORDED SO FAR: KES ${totalSoFar.toLocaleString()} (${incomeHistory.length} entries)
WEEKS REMAINING IN YEAR: ${weeksRemaining}
YEAR END DATE: ${yearEndDate}

INCOME BY CATEGORY:
${categoryLines}

Based on this data, provide:
1. Projected total income for the full year (low and high estimate)
2. Key assumptions behind the forecast
3. Any recommendations to increase income

Respond as valid JSON only:
{
  "projected_low": <number>,
  "projected_high": <number>,
  "projected_midpoint": <number>,
  "recorded_so_far": ${totalSoFar},
  "weeks_remaining": ${weeksRemaining},
  "assumptions": "<2-3 key assumptions>",
  "recommendations": ["<rec1>", "<rec2>"],
  "confidence": "LOW|MEDIUM|HIGH"
}`

  const text = await callGroq([
    { role: 'system', content: MUTCU_CONTEXT },
    { role: 'user', content: prompt }
  ], 400, 0.4)

  const parsed = parseJSON(text)
  if (!parsed) throw new Error('Failed to parse forecast response')
  return parsed
}

// ─── Status check ─────────────────────────────────────────────
function isAvailable() {
  return !!GROQ_API_KEY
}

module.exports = {
  callGroq,
  reviewRequisition,
  generateBudgetAdvice,
  generateFinancialNarrative,
  detectAnomalies,
  forecastIncome,
  isAvailable,
  MUTCU_CONTEXT,
}