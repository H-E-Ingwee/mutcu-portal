import { useEffect, useState } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { FileText, Download, Share2, BarChart3, TrendingUp, DollarSign, BookOpen, Printer } from 'lucide-react'
import AIFinancialPanel from '../../components/treasury/AIFinancialPanel'

const REPORTS = [
  {
    id: 'income-expenditure',
    title: 'Income & Expenditure Statement',
    description: 'Complete record of all income and disbursements. Equivalent to a Profit & Loss statement.',
    icon: TrendingUp,
    color: 'bg-teal/10 text-teal',
    endpoint: '/treasury/reports/income-expenditure',
    filename: 'income-expenditure',
    requiresYear: false,
  },
  {
    id: 'budget-utilization',
    title: 'Budget Utilization Report',
    description: 'Ministry-by-ministry breakdown of budget allocated vs actual spending.',
    icon: BarChart3,
    color: 'bg-orange/10 text-orange',
    endpoint: '/treasury/reports/budget-utilization',
    filename: 'budget-utilization',
    requiresYear: true,
  },
  {
    id: 'disbursement-register',
    title: 'Disbursement Register',
    description: 'Full register of all disbursed requisitions with dates, recipients, and methods.',
    icon: DollarSign,
    color: 'bg-navy/10 text-navy',
    endpoint: '/treasury/reports/disbursement-register',
    filename: 'disbursement-register',
    requiresYear: false,
  },
  {
    id: 'annual-summary',
    title: 'Annual Financial Summary',
    description: 'Comprehensive annual overview — income by category, spending by ministry, requisition statistics.',
    icon: BookOpen,
    color: 'bg-purple-100 text-purple-600',
    endpoint: '/treasury/reports/annual-summary',
    filename: 'annual-summary',
    requiresYear: true,
  },
]

export default function FinancialReports() {
  const [years, setYears] = useState([])
  const [selectedYear, setSelectedYear] = useState('')
  const [downloading, setDownloading] = useState({})
  const [balance, setBalance] = useState(null)
  const [loadingBalance, setLoadingBalance] = useState(false)

  useEffect(() => {
    api.get('/treasury/spiritual-years').then(r => {
      const yrs = r.data.years || []
      const currentYear = `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`
      if (!yrs.includes(currentYear)) yrs.unshift(currentYear)
      setYears(yrs)
      setSelectedYear(yrs[0] || currentYear)
    }).catch(() => {
      const currentYear = `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`
      setYears([currentYear])
      setSelectedYear(currentYear)
    })
  }, [])

  useEffect(() => {
    if (!selectedYear) return
    setLoadingBalance(true)
    api.get(`/treasury/balance?spiritual_year=${selectedYear}`)
      .then(r => setBalance(r.data))
      .catch(() => {})
      .finally(() => setLoadingBalance(false))
  }, [selectedYear])

  const download = async (report) => {
    if (report.requiresYear && !selectedYear) return toast.error('Please select a spiritual year')
    setDownloading(prev => ({ ...prev, [report.id]: true }))
    try {
      const url = `${report.endpoint}${selectedYear ? `?spiritual_year=${selectedYear}` : ''}`
      const res = await fetch(`/api${url}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('mutcu_token')}` }
      })
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `mutcu-${report.filename}-${selectedYear || 'all'}.csv`
      a.click()
      URL.revokeObjectURL(objectUrl)
      toast.success(`${report.title} downloaded!`)
    } catch (err) {
      toast.error('Download failed. Please try again.')
    } finally {
      setDownloading(prev => ({ ...prev, [report.id]: false }))
    }
  }

  const share = async (report) => {
    const text = `MUTCU Financial Report: ${report.title} (${selectedYear || 'All Years'}) — Generated ${new Date().toLocaleDateString('en-GB')}`
    if (navigator.share) {
      try { await navigator.share({ title: `MUTCU ${report.title}`, text }) } catch {}
    } else {
      await navigator.clipboard.writeText(text)
      toast.success('Report info copied to clipboard!')
    }
  }

  const printSummary = () => {
    if (!balance) return
    const content = `
      <html><head><title>MUTCU Financial Summary</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #04003D; }
        h1 { color: #04003D; border-bottom: 3px solid #FF9700; padding-bottom: 10px; }
        h2 { color: #04003D; margin-top: 30px; }
        .stat { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .stat-label { font-weight: bold; }
        .income { color: #30D5C8; }
        .expense { color: #FF9700; }
        .balance { color: ${parseFloat(balance.balance) >= 0 ? '#16a34a' : '#dc2626'}; font-size: 1.2em; font-weight: bold; }
        .footer { margin-top: 40px; font-size: 12px; color: #999; }
      </style></head><body>
      <h1>MUTCU Financial Summary</h1>
      <p>Murang'a University of Technology Christian Union</p>
      <p><em>Inspire Love, Hope & Godliness</em></p>
      <p>Spiritual Year: <strong>${selectedYear || 'All Years'}</strong></p>
      <p>Generated: ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      <h2>Financial Overview</h2>
      <div class="stat"><span class="stat-label">Total Income</span><span class="income">KES ${parseFloat(balance.total_income || 0).toLocaleString()}</span></div>
      <div class="stat"><span class="stat-label">Total Expenses (Disbursed)</span><span class="expense">KES ${parseFloat(balance.total_expenses || 0).toLocaleString()}</span></div>
      <div class="stat"><span class="stat-label">Current Balance</span><span class="balance">KES ${parseFloat(balance.balance || 0).toLocaleString()}</span></div>
      <div class="footer">
        <p>This report was generated from the MUTCU Digital Management System (portal.mutcu.org)</p>
        <p>For official use only. Prepared by the CU Treasurer.</p>
      </div>
      </body></html>
    `
    const win = window.open('', '_blank')
    win.document.write(content)
    win.document.close()
    win.print()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Financial Reports</h1>
          <p className="page-subtitle">Download, print, and share official MUTCU financial reports</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select className="form-select text-sm py-1.5" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
            <option value="">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Quick Balance Summary */}
      {balance && (
        <div className="card p-5 mb-6 bg-gradient-to-r from-navy to-[#0a0060] text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-white/50 text-xs font-semibold uppercase tracking-wide mb-1">
                {selectedYear || 'All Years'} — Financial Position
              </div>
              <div className="text-3xl font-montserrat font-bold text-orange">
                KES {parseFloat(balance.balance || 0).toLocaleString()}
              </div>
              <div className="text-white/60 text-sm mt-1">Current Balance</div>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-teal font-bold text-lg">KES {parseFloat(balance.total_income || 0).toLocaleString()}</div>
                <div className="text-white/50 text-xs">Total Income</div>
              </div>
              <div className="text-center">
                <div className="text-orange font-bold text-lg">KES {parseFloat(balance.total_expenses || 0).toLocaleString()}</div>
                <div className="text-white/50 text-xs">Total Expenses</div>
              </div>
            </div>
            <button onClick={printSummary} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all">
              <Printer size={15} /> Print Summary
            </button>
          </div>
        </div>
      )}

      {/* Report Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {REPORTS.map(report => (
          <div key={report.id} className="card p-5">
            <div className="flex items-start gap-4 mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${report.color}`}>
                <report.icon size={22} />
              </div>
              <div className="flex-1">
                <h3 className="font-montserrat font-bold text-navy text-sm mb-1">{report.title}</h3>
                <p className="text-gray-400 text-xs leading-relaxed">{report.description}</p>
                {report.requiresYear && !selectedYear && (
                  <div className="mt-2 text-xs text-orange">⚠️ Select a spiritual year to generate this report</div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => download(report)}
                disabled={downloading[report.id] || (report.requiresYear && !selectedYear)}
                className="btn-primary btn-sm flex-1 justify-center">
                {downloading[report.id]
                  ? <><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> Generating...</>
                  : <><Download size={13} /> Download CSV</>}
              </button>
              <button onClick={() => share(report)} className="btn-outline btn-sm px-3" title="Share">
                <Share2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5 mt-6">
        <h3 className="font-montserrat font-bold text-navy text-sm mb-3">📋 How to Use These Reports</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-start gap-2">
            <span className="text-orange font-bold flex-shrink-0">1.</span>
            <span>Select the <strong>Spiritual Year</strong> from the dropdown above to filter reports by year.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-orange font-bold flex-shrink-0">2.</span>
            <span>Click <strong>Download CSV</strong> to export the report. Open in Excel or Google Sheets for further analysis.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-orange font-bold flex-shrink-0">3.</span>
            <span>Use <strong>Print Summary</strong> on the balance card above for a quick printable financial position statement.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-orange font-bold flex-shrink-0">4.</span>
            <span>The <strong>Income & Expenditure</strong> report is the primary document for EC meetings and AGM financial presentations.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-orange font-bold flex-shrink-0">5.</span>
            <span>Share reports via the <strong>Share</strong> button or WhatsApp for EC review before meetings.</span>
          </div>
        </div>
      </div>
    </div>
  )
}