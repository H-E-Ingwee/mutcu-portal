import { useEffect, useState } from 'react'
import api from '../../lib/api'
import { TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react'

export default function GeneralLedger() {
  const [ledger, setLedger] = useState([])
  const [balance, setBalance] = useState(null)
  const [years, setYears] = useState([])
  const [selectedYear, setSelectedYear] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  

  const load = async (yr = selectedYear, pg = 1) => {
    if (!yr) return
    setLoading(true)
    try {
      const [ledgerRes, balanceRes] = await Promise.all([
        api.get(`/treasury/ledger?spiritual_year=${yr}&page=${pg}&limit=30`),
        api.get(`/treasury/balance?spiritual_year=${yr}`),
      ])
      setLedger(ledgerRes.data.ledger || [])
      setTotalCount(ledgerRes.data.total || 0)
      setBalance(balanceRes.data)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { load(selectedYear, 1); setPage(1) }, [selectedYear])

  const downloadCSV = async () => {
    try {
      const res = await fetch(`/api/treasury/reports/income-expenditure?spiritual_year=${selectedYear}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('mutcu_token')}` }
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `ledger-${selectedYear}.csv`; a.click()
    } catch {}
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">General Ledger</h1>
          <p className="page-subtitle">Complete transaction history and running balance</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select className="form-select text-sm py-1.5" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={downloadCSV} className="btn-outline btn-sm">Export CSV</button>
        </div>
      </div>

      {/* Balance Summary */}
      {balance && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="card p-5 border-l-4 border-teal">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal/10 rounded-xl flex items-center justify-center">
                <ArrowUpRight size={20} className="text-teal" />
              </div>
              <div>
                <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Total Income</div>
                <div className="text-xl font-montserrat font-bold text-teal">KES {parseFloat(balance.total_income || 0).toLocaleString()}</div>
              </div>
            </div>
          </div>
          <div className="card p-5 border-l-4 border-orange">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange/10 rounded-xl flex items-center justify-center">
                <ArrowDownRight size={20} className="text-orange" />
              </div>
              <div>
                <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Total Expenses</div>
                <div className="text-xl font-montserrat font-bold text-orange">KES {parseFloat(balance.total_expenses || 0).toLocaleString()}</div>
              </div>
            </div>
          </div>
          <div className={`card p-5 border-l-4 ${parseFloat(balance.balance) >= 0 ? 'border-green-500' : 'border-red'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${parseFloat(balance.balance) >= 0 ? 'bg-green-100' : 'bg-red/10'}`}>
                <DollarSign size={20} className={parseFloat(balance.balance) >= 0 ? 'text-green-600' : 'text-red'} />
              </div>
              <div>
                <div className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Current Balance</div>
                <div className={`text-xl font-montserrat font-bold ${parseFloat(balance.balance) >= 0 ? 'text-green-600' : 'text-red'}`}>
                  KES {parseFloat(balance.balance || 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-montserrat font-bold text-navy text-sm">Transaction Ledger — {selectedYear}</h2>
          <span className="text-xs text-gray-400">{totalCount} transactions</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange" /></div>
        ) : ledger.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <DollarSign size={32} className="mx-auto mb-2 text-gray-200" />
            <p className="text-sm">No transactions recorded for {selectedYear}.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Reference</th>
                    <th className="text-left px-4 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Description</th>
                    <th className="text-left px-4 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Type</th>
                    <th className="text-right px-4 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Amount (KES)</th>
                    <th className="text-right px-4 py-3 text-xs font-montserrat font-bold text-gray-400 uppercase">Balance (KES)</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((t, i) => (
                    <tr key={`${t.type}-${t.id}-${i}`} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {t.date ? new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono whitespace-nowrap">{t.reference || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-navy text-sm">{t.description}</div>
                        {t.type === 'income' && t.category && <div className="text-xs text-gray-400">{t.category}</div>}
                        {t.type === 'expense' && t.disbursed_to && <div className="text-xs text-gray-400">To: {t.disbursed_to}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-1 text-xs font-bold ${t.type === 'income' ? 'text-teal' : 'text-orange'}`}>
                          {t.type === 'income'
                            ? <><TrendingUp size={12} /> Income</>
                            : <><TrendingDown size={12} /> Expense</>}
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${t.type === 'income' ? 'text-teal' : 'text-orange'}`}>
                        {t.type === 'income' ? '+' : '-'} {t.amount.toLocaleString()}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${t.running_balance >= 0 ? 'text-navy' : 'text-red'}`}>
                        {t.running_balance?.toLocaleString() ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalCount > 30 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <span className="text-xs text-gray-400">Showing {((page - 1) * 30) + 1}–{Math.min(page * 30, totalCount)} of {totalCount}</span>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => { setPage(p => p - 1); load(selectedYear, page - 1) }} className="btn-outline btn-sm">← Prev</button>
                  <button disabled={page * 30 >= totalCount} onClick={() => { setPage(p => p + 1); load(selectedYear, page + 1) }} className="btn-outline btn-sm">Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}