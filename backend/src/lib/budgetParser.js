/**
 * MUTCU Budget Excel Parser
 * Parses uploaded .xlsx/.xls files into structured budget rows
 * Expected columns (flexible header matching):
 *   Ministry | Category | Amount | Notes
 */
const XLSX = require('xlsx')

// Known MUTCU ministries for fuzzy matching
const KNOWN_MINISTRIES = [
  'Prayer Ministry',
  'Music Ministry',
  'Missions & Evangelism Ministry',
  'Bible Study & Training Ministry',
  'Discipleship Ministry',
  'Creative Arts Ministry',
  'Technical & Media Ministry',
  'Hospitality Ministry',
  'Welfare Committee',
  'Resource Mobilization Committee',
  'General / Administration',
  'General',
]

// Known categories
const KNOWN_CATEGORIES = [
  'General', 'Events', 'Equipment', 'Transport', 'Printing',
  'Welfare', 'Outreach', 'Training', 'Other',
]

// Column header aliases — maps various header names to our standard fields
const HEADER_ALIASES = {
  ministry: ['ministry', 'department', 'dept', 'ministry name', 'department name', 'section', 'unit'],
  category: ['category', 'cat', 'type', 'expense type', 'budget category', 'sub-category', 'subcategory'],
  amount: ['amount', 'budget', 'allocated', 'allocation', 'kes', 'amount (kes)', 'budget (kes)', 'allocated amount', 'total', 'total (kes)'],
  notes: ['notes', 'note', 'remarks', 'remark', 'description', 'details', 'comment', 'comments'],
}

/**
 * Normalize a header string for matching
 */
function normalizeHeader(h) {
  return String(h || '').toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ')
}

/**
 * Detect which column index maps to which field
 * Returns { ministry: colIdx, category: colIdx, amount: colIdx, notes: colIdx }
 */
function detectColumns(headers) {
  const normalized = headers.map(normalizeHeader)
  const mapping = {}

  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    for (let i = 0; i < normalized.length; i++) {
      if (aliases.some(alias => normalized[i].includes(alias) || alias.includes(normalized[i]))) {
        if (mapping[field] === undefined) mapping[field] = i
      }
    }
  }

  return mapping
}

/**
 * Clean and parse an amount value
 */
function parseAmount(val) {
  if (val === null || val === undefined || val === '') return null
  // Remove currency symbols, commas, spaces
  const cleaned = String(val).replace(/[KES,\s$£€]/gi, '').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

/**
 * Fuzzy match ministry name to known ministries
 */
function matchMinistry(val) {
  if (!val) return null
  const v = String(val).toLowerCase().trim()
  // Exact match first
  const exact = KNOWN_MINISTRIES.find(m => m.toLowerCase() === v)
  if (exact) return exact
  // Partial match
  const partial = KNOWN_MINISTRIES.find(m =>
    m.toLowerCase().includes(v) || v.includes(m.toLowerCase().replace(' ministry', '').replace(' committee', ''))
  )
  return partial || String(val).trim() // Return as-is if no match
}

/**
 * Fuzzy match category
 */
function matchCategory(val) {
  if (!val) return 'General'
  const v = String(val).toLowerCase().trim()
  const match = KNOWN_CATEGORIES.find(c => c.toLowerCase() === v || v.includes(c.toLowerCase()))
  return match || String(val).trim() || 'General'
}

/**
 * Main parser function
 * @param {Buffer} buffer - Excel file buffer
 * @returns {{ rows: Array, warnings: Array, columnMapping: Object, sheetName: string }}
 */
function parseExcelBudget(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' })

  // Use first sheet
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]

  // Convert to array of arrays
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  if (!raw || raw.length < 2) {
    throw new Error('Excel file appears empty or has no data rows. Please check the file.')
  }

  // Find header row — scan first 5 rows for one that looks like headers
  let headerRowIdx = 0
  let columnMapping = {}

  for (let i = 0; i < Math.min(5, raw.length); i++) {
    const row = raw[i]
    if (!row || row.every(cell => !cell)) continue
    const detected = detectColumns(row)
    if (detected.ministry !== undefined && detected.amount !== undefined) {
      headerRowIdx = i
      columnMapping = detected
      break
    }
  }

  // If no header found, try to auto-detect by position (Ministry=0, Category=1, Amount=2, Notes=3)
  if (columnMapping.ministry === undefined) {
    columnMapping = { ministry: 0, category: 1, amount: 2, notes: 3 }
  }

  const headers = raw[headerRowIdx]
  const dataRows = raw.slice(headerRowIdx + 1)

  const rows = []
  const warnings = []

  dataRows.forEach((row, idx) => {
    // Skip completely empty rows
    if (!row || row.every(cell => !cell && cell !== 0)) return

    const lineNum = headerRowIdx + idx + 2 // 1-based line number in file

    const rawMinistry = row[columnMapping.ministry]
    const rawCategory = columnMapping.category !== undefined ? row[columnMapping.category] : ''
    const rawAmount = row[columnMapping.amount]
    const rawNotes = columnMapping.notes !== undefined ? row[columnMapping.notes] : ''

    // Skip rows that look like subtotals or section headers (no amount)
    const amount = parseAmount(rawAmount)
    if (amount === null) {
      if (rawMinistry) {
        warnings.push(`Row ${lineNum}: Skipped — "${rawMinistry}" has no valid amount (found: "${rawAmount}")`)
      }
      return
    }

    if (!rawMinistry) {
      warnings.push(`Row ${lineNum}: Skipped — missing ministry name (amount was KES ${amount})`)
      return
    }

    if (amount <= 0) {
      warnings.push(`Row ${lineNum}: Skipped — amount must be greater than 0 (found: ${amount})`)
      return
    }

    const ministry = matchMinistry(rawMinistry)
    const category = matchCategory(rawCategory)
    const notes = String(rawNotes || '').trim()

    rows.push({
      ministry,
      category,
      allocated_amount: amount,
      notes: notes || null,
      _raw_ministry: String(rawMinistry).trim(),
      _line: lineNum,
    })
  })

  if (rows.length === 0) {
    throw new Error('No valid budget rows found. Make sure your Excel has Ministry and Amount columns with data.')
  }

  return {
    rows,
    warnings,
    columnMapping: {
      ministry: headers[columnMapping.ministry] || `Column ${columnMapping.ministry + 1}`,
      category: columnMapping.category !== undefined ? (headers[columnMapping.category] || `Column ${columnMapping.category + 1}`) : 'Not found',
      amount: headers[columnMapping.amount] || `Column ${columnMapping.amount + 1}`,
      notes: columnMapping.notes !== undefined ? (headers[columnMapping.notes] || `Column ${columnMapping.notes + 1}`) : 'Not found',
    },
    sheetName,
    totalRows: rows.length,
    totalAmount: rows.reduce((s, r) => s + r.allocated_amount, 0),
  }
}

/**
 * Generate a downloadable Excel template buffer
 */
function generateBudgetTemplate() {
  const wb = XLSX.utils.book_new()

  const templateData = [
    ['Ministry', 'Category', 'Amount (KES)', 'Notes'],
    ['Prayer Ministry', 'General', 8000, 'Weekly prayer meetings and keshas'],
    ['Music Ministry', 'Events', 15000, 'MULEWO and outreach events'],
    ['Music Ministry', 'Equipment', 5000, 'Sound equipment maintenance'],
    ['Missions & Evangelism Ministry', 'Outreach', 12000, 'Hope Ministry hospital visits'],
    ['Bible Study & Training Ministry', 'Training', 6000, 'BEST-P materials and training'],
    ['Discipleship Ministry', 'General', 4000, 'Nurturing classes and accountability'],
    ['Creative Arts Ministry', 'Events', 10000, 'Drama, SPARCS, Christmas Cantata'],
    ['Technical & Media Ministry', 'Equipment', 7000, 'Sound and media equipment'],
    ['Hospitality Ministry', 'General', 3000, 'Guest welcoming and refreshments'],
    ['Welfare Committee', 'Welfare', 5000, 'Member support and counselling'],
    ['Resource Mobilization Committee', 'General', 2000, 'Fundraising activities'],
    ['General / Administration', 'General', 8000, 'EC operations and administration'],
  ]

  const ws = XLSX.utils.aoa_to_sheet(templateData)

  // Column widths
  ws['!cols'] = [
    { wch: 40 }, // Ministry
    { wch: 20 }, // Category
    { wch: 18 }, // Amount
    { wch: 40 }, // Notes
  ]

  // Style header row (bold) — basic styling
  const headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: '04003D' } } }
  ;['A1', 'B1', 'C1', 'D1'].forEach(cell => {
    if (ws[cell]) ws[cell].s = headerStyle
  })

  XLSX.utils.book_append_sheet(wb, ws, 'Budget')

  // Add instructions sheet
  const instructions = [
    ['MUTCU Budget Template — Instructions'],
    [''],
    ['1. Fill in the Ministry column with the exact ministry name (or a recognizable variation)'],
    ['2. Category is optional — use: General, Events, Equipment, Transport, Printing, Welfare, Outreach, Training, Other'],
    ['3. Amount must be a number in KES (no currency symbols needed)'],
    ['4. Notes are optional — add any relevant context'],
    ['5. You can have multiple rows for the same ministry with different categories'],
    ['6. Do not delete the header row'],
    ['7. Save as .xlsx before uploading'],
    [''],
    ['Recognized Ministry Names:'],
    ['- Prayer Ministry'],
    ['- Music Ministry'],
    ['- Missions & Evangelism Ministry'],
    ['- Bible Study & Training Ministry'],
    ['- Discipleship Ministry'],
    ['- Creative Arts Ministry'],
    ['- Technical & Media Ministry'],
    ['- Hospitality Ministry'],
    ['- Welfare Committee'],
    ['- Resource Mobilization Committee'],
    ['- General / Administration'],
  ]
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions)
  wsInstructions['!cols'] = [{ wch: 70 }]
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions')

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

module.exports = { parseExcelBudget, generateBudgetTemplate }