import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import { Plus, Upload, Search, Download } from 'lucide-react'

export default function MembersList() {
  const [members, setMembers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pendingCount, setPendingCount] = useState(0)
  const [filters, setFilters] = useState({ search:'', ministry:'', year:'', type:'', status:'' })
  const [ministries, setMinistries] = useState([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => { api.get('/ministries').then(r => setMinistries(r.data.ministries||[])).catch(()=>{}) }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ page, limit: 30, ...Object.fromEntries(Object.entries(filters).filter(([,v])=>v)) })
    Promise.all([
      api.get(`/members?${params}`),
      api.get('/members/pending'),
    ]).then(([membersRes, pendingRes]) => {
      setMembers(membersRes.data.members||[])
      setTotal(membersRes.data.total||0)
      setPendingCount(pendingRes.data.members?.length||0)
    }).finally(() => setLoading(false))
  }, [page, filters])

  const exportCSV = async () => {
    setExporting(true)
    try {
      const response = await api.get('/admin/export/members', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'mutcu-members.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      // Fallback: build CSV from current data
      const headers = ['Name','Email','MUTCU Number','Student ID','Gender','Year','Ministry','Status']
      const rows = members.map(m => [m.name,m.email,m.mutcu_number||'',m.student_id||'',m.gender||'',m.year_of_study||'',m.primary_ministry||'General',m.enrollment_status])
      const csv = [headers,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url2 = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href=url2; a.download='mutcu-members.csv'; a.click()
    } finally { setExporting(false) }
  }

  const totalPages = Math.ceil(total / 30)

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Member Register</h1><p className="page-subtitle">{total} registered members</p></div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/secretary/members/pending" className="btn-outline btn-sm relative">
            Pending {pendingCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-orange text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{pendingCount}</span>}
          </Link>
          <button onClick={exportCSV} disabled={exporting} className="btn-outline btn-sm">
            <Download size={14} />{exporting ? 'Exporting...' : 'Export CSV'}
          </button>
          <Link to="/secretary/members/import" className="btn-teal btn-sm"><Upload size={14} />Import</Link>
          <Link to="/secretary/members/create" className="btn-primary btn-sm"><Plus size={14} />Enroll Member</Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-5">
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex-1 min-w-48 relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" className="form-input pl-9 text-sm" placeholder="Search name, email, MUTCU number..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} /></div>
          <select className="form-select text-sm w-40" value={filters.ministry} onChange={e => setFilters({...filters, ministry: e.target.value})}><option value="">All Ministries</option>{ministries.map(m=><option key={m.id} value={m.name}>{m.name}</option>)}</select>
          <select className="form-select text-sm w-28" value={filters.year} onChange={e => setFilters({...filters, year: e.target.value})}><option value="">All Years</option>{[1,2,3,4,5,6].map(y=><option key={y} value={y}>Year {y}</option>)}</select>
          <select className="form-select text-sm w-32" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}><option value="">All Status</option><option value="active">Active</option><option value="pending">Pending</option><option value="inactive">Inactive</option></select>
          {Object.values(filters).some(Boolean) && <button onClick={() => setFilters({search:'',ministry:'',year:'',type:'',status:''})} className="btn-outline btn-sm">Clear</button>}
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Member</th><th>MUTCU No.</th><th>Student ID</th><th>Year</th><th>Ministry</th><th>Type</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8} className="text-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange mx-auto" /></td></tr>
              : members.length === 0 ? <tr><td colSpan={8} className="text-center py-8 text-gray-400">No members found.</td></tr>
              : members.map(m => {
                const photoUrl = m.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name||'M')}&background=04003D&color=FF9700&size=200&bold=true`
                return (
                  <tr key={m.id}>
                    <td><div className="flex items-center gap-2.5"><img src={photoUrl} alt={m.name} className="w-8 h-8 rounded-full object-cover border border-gray-200" /><div><div className="font-bold text-navy text-sm">{m.name}</div><div className="text-xs text-gray-400">{m.email}</div></div></div></td>
                    <td><span className="font-montserrat font-bold text-orange text-xs">{m.mutcu_number||'—'}</span></td>
                    <td className="text-sm text-gray-500">{m.student_id||'—'}</td>
                    <td>{m.year_of_study ? <span className="badge badge-navy">Yr {m.year_of_study}</span> : '—'}</td>
                    <td className="text-sm text-gray-500">{m.primary_ministry||'General'}</td>
                    <td><span className="badge badge-teal">{m.membership_type}</span></td>
                    <td>{m.enrollment_status==='active' ? <span className="badge badge-green">Active</span> : m.enrollment_status==='pending' ? <span className="badge badge-orange">Pending</span> : <span className="badge badge-gray">{m.enrollment_status}</span>}</td>
                    <td><Link to={`/secretary/members/${m.id}/edit`} className="btn-outline btn-sm text-xs">Edit</Link></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50">
            <div className="text-xs text-gray-400">Page {page} of {totalPages} · {total} members</div>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="btn-outline btn-sm">Previous</button>
              <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} className="btn-outline btn-sm">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
