const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')
const { authenticate, requireRole } = require('../middleware/auth')

const TREASURER = ['cu_treasurer', 'super_admin', 'ec_admin']
const CAN_VIEW = ['cu_treasurer', 'super_admin', 'ec_admin', 'cu_secretary']

// ═══════════════════════════════════════════════════════════════
// BUDGETS
// ═══════════════════════════════════════════════════════════════

// GET /api/treasury/budgets — list budgets (optionally filter by year)
router.get('/budgets', authenticate, requireRole(...CAN_VIEW), async (req, res) => {
  try {
    const { spiritual_year } = req.query
    let query = supabase.from('budgets')
      .select('*, creator:created_by(name)')
      .order('ministry').order('category')
    if (spiritual_year) query = query.eq('spiritual_year', spiritual_year)
    const { data, error } = await query
    if (error) throw error
    res.json({ budgets: data || [] })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/treasury/budgets — create or update budget allocation
router.post('/budgets', authenticate, requireRole(...TREASURER), async (req, res) => {
  try {
    const { spiritual_year, ministry, category = 'General', allocated_amount, notes } = req.body
    if (!spiritual_year || !ministry || allocated_amount === undefined) {
      return res.status(400).json({ error: 'spiritual_year, ministry, and allocated_amount are required' })
    }
    // Upsert by unique constraint
    const { data, error } = await supabase.from('budgets')
      .upsert({
        spiritual_year, ministry, category,
        allocated_amount: parseFloat(allocated_amount),
        notes, created_by: req.user.id, updated_by: req.user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'spiritual_year,ministry,category' })
      .select().single()
    if (error) throw error
    res.json({ budget: data, message: 'Budget saved successfully' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/treasury/budgets/:id
router.delete('/budgets/:id', authenticate, requireRole(...TREASURER), async (req, res) => {
  try {
    await supabase.from('budgets').delete().eq('id', req.params.id)
    res.json({ message: 'Budget entry deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/treasury/budgets/vs-actual — budget vs actual spending per ministry
router.get('/budgets/vs-actual', authenticate, requireRole(...CAN_VIEW), async (req, res) => {
  try {
    const { spiritual_year } = req.query
    if (!spiritual_year) return res.status(400).json({ error: 'spiritual_year required' })

    const [budgetsRes, reqRes] = await Promise.all([
      supabase.from('budgets').select('*').eq('spiritual_year', spiritual_year),
      supabase.from('requisitions').select('ministry,total_approved,total_requested,status')
        .eq('spiritual_year', spiritual_year)
        .in('status', ['approved', 'partially_approved', 'disbursed']),
    ])

    const budgets = budgetsRes.data || []
    const requisitions = reqRes.data || []

    // Aggregate actual spending per ministry
    const actual = {}
    requisitions.forEach(r => {
      const m = r.ministry || 'General'
      actual[m] = (actual[m] || 0) + parseFloat(r.total_approved || r.total_requested || 0)
    })

    // Merge budgets with actuals
    const allMinistries = [...new Set([...budgets.map(b => b.ministry), ...Object.keys(actual)])]
    const result = allMinistries.map(ministry => {
      const budgetEntries = budgets.filter(b => b.ministry === ministry)
      const totalBudget = budgetEntries.reduce((s, b) => s + parseFloat(b.allocated_amount || 0), 0)
      const totalActual = actual[ministry] || 0
      const utilization = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : null
      return {
        ministry,
        allocated: totalBudget,
        spent: totalActual,
        remaining: totalBudget - totalActual,
        utilization,
        over_budget: totalActual > totalBudget && totalBudget > 0,
        categories: budgetEntries,
      }
    }).sort((a, b) => b.allocated - a.allocated)

    res.json({ vs_actual: result, spiritual_year })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ═══════════════════════════════════════════════════════════════
// INCOME ENTRIES
// ═══════════════════════════════════════════════════════════════

// GET /api/treasury/income — list income entries
router.get('/income', authenticate, requireRole(...CAN_VIEW), async (req, res) => {
  try {
    const { spiritual_year, category, page = 1, limit = 30 } = req.query
    let query = supabase.from('income_entries')
      .select('*, recorder:recorded_by(name,role)', { count: 'exact' })
      .order('date', { ascending: false })
    if (spiritual_year) query = query.eq('spiritual_year', spiritual_year)
    if (category) query = query.eq('category', category)
    const offset = (parseInt(page) - 1) * parseInt(limit)
    query = query.range(offset, offset + parseInt(limit) - 1)
    const { data, error, count } = await query
    if (error) throw error
    res.json({ income: data || [], total: count || 0 })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/treasury/income — record new income
router.post('/income', authenticate, requireRole(...TREASURER), async (req, res) => {
  try {
    const { source, category = 'General', amount, date, spiritual_year, notes, received_by } = req.body
    if (!source || !amount || !date) {
      return res.status(400).json({ error: 'source, amount, and date are required' })
    }
    const { data, error } = await supabase.from('income_entries')
      .insert({
        source, category, amount: parseFloat(amount), date, spiritual_year,
        notes, received_by, recorded_by: req.user.id,
      }).select('*, recorder:recorded_by(name)').single()
    if (error) throw error
    res.status(201).json({ income: data, message: `Income ${data.income_number} recorded successfully` })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/treasury/income/:id — update income entry
router.put('/income/:id', authenticate, requireRole(...TREASURER), async (req, res) => {
  try {
    const { source, category, amount, date, spiritual_year, notes, received_by } = req.body
    const { data, error } = await supabase.from('income_entries')
      .update({ source, category, amount: parseFloat(amount), date, spiritual_year, notes, received_by, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single()
    if (error) throw error
    res.json({ income: data, message: 'Income entry updated' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/treasury/income/:id
router.delete('/income/:id', authenticate, requireRole(...TREASURER), async (req, res) => {
  try {
    await supabase.from('income_entries').delete().eq('id', req.params.id)
    res.json({ message: 'Income entry deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ═══════════════════════════════════════════════════════════════
// FUND BALANCE & LEDGER
// ═══════════════════════════════════════════════════════════════

// GET /api/treasury/balance — current fund balance
router.get('/balance', authenticate, requireRole(...CAN_VIEW), async (req, res) => {
  try {
    const { spiritual_year } = req.query

    let incomeQuery = supabase.from('income_entries').select('amount')
    let expenseQuery = supabase.from('requisitions').select('total_approved,total_requested').eq('status', 'disbursed')

    if (spiritual_year) {
      incomeQuery = incomeQuery.eq('spiritual_year', spiritual_year)
      expenseQuery = expenseQuery.eq('spiritual_year', spiritual_year)
    }

    const [incomeRes, expenseRes] = await Promise.all([incomeQuery, expenseQuery])

    const totalIncome = (incomeRes.data || []).reduce((s, r) => s + parseFloat(r.amount || 0), 0)
    const totalExpenses = (expenseRes.data || []).reduce((s, r) => s + parseFloat(r.total_approved || r.total_requested || 0), 0)
    const balance = totalIncome - totalExpenses

    res.json({ total_income: totalIncome, total_expenses: totalExpenses, balance, spiritual_year: spiritual_year || 'all' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/treasury/ledger — full transaction ledger (income + disbursements chronologically)
router.get('/ledger', authenticate, requireRole(...CAN_VIEW), async (req, res) => {
  try {
    const { spiritual_year, page = 1, limit = 50 } = req.query

    let incomeQuery = supabase.from('income_entries')
      .select('id,income_number,source,category,amount,date,notes,spiritual_year,recorded_by,created_at,recorder:recorded_by(name)')
    let expenseQuery = supabase.from('requisitions')
      .select('id,requisition_number,title,ministry,total_approved,total_requested,disbursed_at,disbursed_to,disbursement_method,spiritual_year,requester:requested_by(name)')
      .eq('status', 'disbursed')

    if (spiritual_year) {
      incomeQuery = incomeQuery.eq('spiritual_year', spiritual_year)
      expenseQuery = expenseQuery.eq('spiritual_year', spiritual_year)
    }

    const [incomeRes, expenseRes] = await Promise.all([incomeQuery, expenseQuery])

    // Combine and sort chronologically
    const incomeEntries = (incomeRes.data || []).map(i => ({
      ...i, type: 'income', amount: parseFloat(i.amount), date: i.date,
      description: i.source, reference: i.income_number,
    }))
    const expenseEntries = (expenseRes.data || []).map(e => ({
      ...e, type: 'expense',
      amount: parseFloat(e.total_approved || e.total_requested || 0),
      date: e.disbursed_at?.split('T')[0] || e.created_at?.split('T')[0],
      description: `${e.title} (${e.ministry || 'General'})`,
      reference: e.requisition_number,
    }))

    const all = [...incomeEntries, ...expenseEntries]
      .sort((a, b) => new Date(b.date) - new Date(a.date))

    // Running balance (from oldest to newest, then reverse)
    const sorted_asc = [...all].sort((a, b) => new Date(a.date) - new Date(b.date))
    let running = 0
    const withBalance = sorted_asc.map(t => {
      running += t.type === 'income' ? t.amount : -t.amount
      return { ...t, running_balance: running }
    })
    const final = withBalance.reverse()

    // Paginate
    const offset = (parseInt(page) - 1) * parseInt(limit)
    const paginated = final.slice(offset, offset + parseInt(limit))

    res.json({ ledger: paginated, total: final.length, spiritual_year: spiritual_year || 'all' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ═══════════════════════════════════════════════════════════════
// DISBURSEMENT RECEIPTS
// ═══════════════════════════════════════════════════════════════

// GET /api/treasury/receipts — list disbursement receipts
router.get('/receipts', authenticate, requireRole(...CAN_VIEW), async (req, res) => {
  try {
    const { data, error } = await supabase.from('disbursement_receipts')
      .select('*, requisition:requisition_id(requisition_number,title,ministry), disburser:disbursed_by(name)')
      .order('disbursed_at', { ascending: false })
    if (error) throw error
    res.json({ receipts: data || [] })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/treasury/receipts — create disbursement receipt (called when disbursing)
router.post('/receipts', authenticate, requireRole(...TREASURER), async (req, res) => {
  try {
    const { requisition_id, amount_disbursed, disbursed_to, disbursement_method, reference_number, notes } = req.body
    if (!requisition_id || !amount_disbursed) return res.status(400).json({ error: 'requisition_id and amount_disbursed required' })
    const { data, error } = await supabase.from('disbursement_receipts')
      .insert({ requisition_id, amount_disbursed, disbursed_to, disbursement_method: disbursement_method || 'Cash', reference_number, notes, disbursed_by: req.user.id })
      .select('*, requisition:requisition_id(requisition_number,title,ministry,items,total_approved), disburser:disbursed_by(name,role)').single()
    if (error) throw error
    res.status(201).json({ receipt: data, message: `Receipt ${data.receipt_number} generated` })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ═══════════════════════════════════════════════════════════════
// REQUISITION COMMENTS
// ═══════════════════════════════════════════════════════════════

// GET /api/treasury/requisitions/:id/comments
router.get('/requisitions/:id/comments', authenticate, async (req, res) => {
  try {
    const isPrivileged = ['cu_treasurer', 'super_admin', 'ec_admin', 'cu_secretary'].includes(req.user.role)
    let query = supabase.from('requisition_comments')
      .select('*, author:author_id(name,photo_url,role)')
      .eq('requisition_id', req.params.id)
      .order('created_at', { ascending: true })
    if (!isPrivileged) query = query.eq('is_internal', false)
    const { data, error } = await query
    if (error) throw error
    res.json({ comments: data || [] })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/treasury/requisitions/:id/comments
router.post('/requisitions/:id/comments', authenticate, async (req, res) => {
  try {
    const { comment, is_internal = false } = req.body
    if (!comment?.trim()) return res.status(400).json({ error: 'Comment is required' })
    const isPrivileged = ['cu_treasurer', 'super_admin', 'ec_admin', 'cu_secretary'].includes(req.user.role)
    const { data, error } = await supabase.from('requisition_comments')
      .insert({ requisition_id: req.params.id, author_id: req.user.id, comment: comment.trim(), is_internal: isPrivileged ? is_internal : false })
      .select('*, author:author_id(name,photo_url,role)').single()
    if (error) throw error
    res.status(201).json({ comment: data })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ═══════════════════════════════════════════════════════════════
// FINANCIAL REPORTS (CSV exports)
// ═══════════════════════════════════════════════════════════════

// GET /api/treasury/reports/income-expenditure — Income & Expenditure report CSV
router.get('/reports/income-expenditure', authenticate, requireRole(...CAN_VIEW), async (req, res) => {
  try {
    const { spiritual_year } = req.query
    let incomeQ = supabase.from('income_entries').select('*').order('date')
    let expenseQ = supabase.from('requisitions').select('*').eq('status', 'disbursed').order('disbursed_at')
    if (spiritual_year) { incomeQ = incomeQ.eq('spiritual_year', spiritual_year); expenseQ = expenseQ.eq('spiritual_year', spiritual_year) }
    const [incomeRes, expenseRes] = await Promise.all([incomeQ, expenseQ])

    const totalIncome = (incomeRes.data || []).reduce((s, r) => s + parseFloat(r.amount || 0), 0)
    const totalExpense = (expenseRes.data || []).reduce((s, r) => s + parseFloat(r.total_approved || r.total_requested || 0), 0)

    const rows = [
      ['MUTCU INCOME & EXPENDITURE STATEMENT'],
      [`Spiritual Year: ${spiritual_year || 'All Years'}`],
      [`Generated: ${new Date().toLocaleDateString('en-GB')}`],
      [],
      ['=== INCOME ==='],
      ['#', 'Date', 'Source', 'Category', 'Amount (KES)', 'Received By', 'Notes'],
      ...(incomeRes.data || []).map((r, i) => [i + 1, r.date, r.source, r.category, r.amount, r.received_by || '', r.notes || '']),
      [],
      ['', '', '', 'TOTAL INCOME', totalIncome, '', ''],
      [],
      ['=== EXPENDITURE ==='],
      ['#', 'Date', 'Requisition No.', 'Title', 'Ministry', 'Amount (KES)', 'Disbursed To'],
      ...(expenseRes.data || []).map((r, i) => [i + 1, r.disbursed_at?.split('T')[0] || '', r.requisition_number, r.title, r.ministry || 'General', r.total_approved || r.total_requested, r.disbursed_to || '']),
      [],
      ['', '', '', '', 'TOTAL EXPENDITURE', totalExpense, ''],
      [],
      ['', '', '', '', 'NET BALANCE', totalIncome - totalExpense, ''],
    ]

    const csv = rows.map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="mutcu-income-expenditure-${spiritual_year || 'all'}.csv"`)
    res.send(csv)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/treasury/reports/budget-utilization — Budget vs Actual CSV
router.get('/reports/budget-utilization', authenticate, requireRole(...CAN_VIEW), async (req, res) => {
  try {
    const { spiritual_year } = req.query
    if (!spiritual_year) return res.status(400).json({ error: 'spiritual_year required' })

    const [budgetsRes, reqRes] = await Promise.all([
      supabase.from('budgets').select('*').eq('spiritual_year', spiritual_year).order('ministry'),
      supabase.from('requisitions').select('ministry,total_approved,total_requested,status').eq('spiritual_year', spiritual_year).in('status', ['approved', 'partially_approved', 'disbursed']),
    ])

    const actual = {}
    ;(reqRes.data || []).forEach(r => {
      const m = r.ministry || 'General'
      actual[m] = (actual[m] || 0) + parseFloat(r.total_approved || r.total_requested || 0)
    })

    const rows = [
      ['MUTCU BUDGET UTILIZATION REPORT'],
      [`Spiritual Year: ${spiritual_year}`],
      [`Generated: ${new Date().toLocaleDateString('en-GB')}`],
      [],
      ['Ministry', 'Category', 'Allocated (KES)', 'Spent (KES)', 'Remaining (KES)', 'Utilization %', 'Status'],
      ...(budgetsRes.data || []).map(b => {
        const spent = actual[b.ministry] || 0
        const remaining = parseFloat(b.allocated_amount) - spent
        const util = b.allocated_amount > 0 ? Math.round((spent / b.allocated_amount) * 100) : 0
        return [b.ministry, b.category, b.allocated_amount, spent.toFixed(2), remaining.toFixed(2), `${util}%`, remaining < 0 ? 'OVER BUDGET' : util >= 90 ? 'Near Limit' : 'On Track']
      }),
    ]

    const csv = rows.map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="mutcu-budget-utilization-${spiritual_year}.csv"`)
    res.send(csv)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/treasury/reports/disbursement-register — All disbursements CSV
router.get('/reports/disbursement-register', authenticate, requireRole(...CAN_VIEW), async (req, res) => {
  try {
    const { spiritual_year } = req.query
    let query = supabase.from('requisitions')
      .select('requisition_number,title,ministry,total_requested,total_approved,disbursed_at,disbursed_to,disbursement_method,disbursement_reference,requester:requested_by(name),approver:approved_by(name)')
      .eq('status', 'disbursed').order('disbursed_at')
    if (spiritual_year) query = query.eq('spiritual_year', spiritual_year)
    const { data } = await query

    const rows = [
      ['MUTCU DISBURSEMENT REGISTER'],
      [`Spiritual Year: ${spiritual_year || 'All Years'}`],
      [`Generated: ${new Date().toLocaleDateString('en-GB')}`],
      [],
      ['#', 'Req. No.', 'Title', 'Ministry', 'Requested (KES)', 'Approved (KES)', 'Disbursed To', 'Method', 'Reference', 'Date', 'Approved By', 'Requested By'],
      ...(data || []).map((r, i) => [
        i + 1, r.requisition_number, r.title, r.ministry || 'General',
        r.total_requested, r.total_approved || r.total_requested,
        r.disbursed_to || '', r.disbursement_method || 'Cash', r.disbursement_reference || '',
        r.disbursed_at?.split('T')[0] || '', r.approver?.name || '', r.requester?.name || '',
      ]),
      [],
      ['', '', '', 'TOTAL', '', (data || []).reduce((s, r) => s + parseFloat(r.total_approved || r.total_requested || 0), 0).toFixed(2), '', '', '', '', '', ''],
    ]

    const csv = rows.map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="mutcu-disbursement-register-${spiritual_year || 'all'}.csv"`)
    res.send(csv)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/treasury/reports/annual-summary — Annual financial summary
router.get('/reports/annual-summary', authenticate, requireRole(...CAN_VIEW), async (req, res) => {
  try {
    const { spiritual_year } = req.query
    if (!spiritual_year) return res.status(400).json({ error: 'spiritual_year required' })

    const [incomeRes, reqRes, budgetRes] = await Promise.all([
      supabase.from('income_entries').select('*').eq('spiritual_year', spiritual_year),
      supabase.from('requisitions').select('*').eq('spiritual_year', spiritual_year),
      supabase.from('budgets').select('*').eq('spiritual_year', spiritual_year),
    ])

    const income = incomeRes.data || []
    const reqs = reqRes.data || []
    const budgets = budgetRes.data || []

    const totalIncome = income.reduce((s, r) => s + parseFloat(r.amount || 0), 0)
    const totalDisbursed = reqs.filter(r => r.status === 'disbursed').reduce((s, r) => s + parseFloat(r.total_approved || r.total_requested || 0), 0)
    const totalBudgeted = budgets.reduce((s, b) => s + parseFloat(b.allocated_amount || 0), 0)
    const totalRequested = reqs.reduce((s, r) => s + parseFloat(r.total_requested || 0), 0)
    const totalApproved = reqs.filter(r => ['approved', 'partially_approved', 'disbursed'].includes(r.status)).reduce((s, r) => s + parseFloat(r.total_approved || 0), 0)

    // Income by category
    const incomeByCategory = {}
    income.forEach(i => { incomeByCategory[i.category] = (incomeByCategory[i.category] || 0) + parseFloat(i.amount || 0) })

    // Spending by ministry
    const spendingByMinistry = {}
    reqs.filter(r => r.status === 'disbursed').forEach(r => {
      const m = r.ministry || 'General'
      spendingByMinistry[m] = (spendingByMinistry[m] || 0) + parseFloat(r.total_approved || r.total_requested || 0)
    })

    const rows = [
      ['MUTCU ANNUAL FINANCIAL SUMMARY'],
      [`Spiritual Year: ${spiritual_year}`],
      [`Generated: ${new Date().toLocaleDateString('en-GB')}`],
      [],
      ['=== OVERVIEW ==='],
      ['Metric', 'Amount (KES)'],
      ['Total Income', totalIncome.toFixed(2)],
      ['Total Disbursed', totalDisbursed.toFixed(2)],
      ['Net Balance', (totalIncome - totalDisbursed).toFixed(2)],
      ['Total Budgeted', totalBudgeted.toFixed(2)],
      ['Total Requested', totalRequested.toFixed(2)],
      ['Total Approved', totalApproved.toFixed(2)],
      [],
      ['=== INCOME BY CATEGORY ==='],
      ['Category', 'Amount (KES)'],
      ...Object.entries(incomeByCategory).map(([k, v]) => [k, v.toFixed(2)]),
      [],
      ['=== SPENDING BY MINISTRY ==='],
      ['Ministry', 'Amount Disbursed (KES)'],
      ...Object.entries(spendingByMinistry).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, v.toFixed(2)]),
      [],
      ['=== REQUISITION STATISTICS ==='],
      ['Status', 'Count'],
      ...Object.entries(reqs.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc }, {})).map(([k, v]) => [k.replace(/_/g, ' '), v]),
    ]

    const csv = rows.map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="mutcu-annual-summary-${spiritual_year}.csv"`)
    res.send(csv)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/treasury/spiritual-years — list all spiritual years with data
router.get('/spiritual-years', authenticate, requireRole(...CAN_VIEW), async (req, res) => {
  try {
    const [incomeRes, reqRes, budgetRes] = await Promise.all([
      supabase.from('income_entries').select('spiritual_year').not('spiritual_year', 'is', null),
      supabase.from('requisitions').select('spiritual_year').not('spiritual_year', 'is', null),
      supabase.from('budgets').select('spiritual_year').not('spiritual_year', 'is', null),
    ])
    const years = [...new Set([
      ...(incomeRes.data || []).map(r => r.spiritual_year),
      ...(reqRes.data || []).map(r => r.spiritual_year),
      ...(budgetRes.data || []).map(r => r.spiritual_year),
    ])].filter(Boolean).sort().reverse()
    res.json({ years })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router