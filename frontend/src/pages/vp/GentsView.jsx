import { useEffect, useState } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Users, Download, Search, X } from 'lucide-react'

export default function GentsView() {
  const [gents, setGents] = useState([])
  const [associates, setAssociates] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('gents')

  useEffect(() => {
    Promise.all([
      api.get('/members?gender=male&limit=300&status=active'),
      api.get('/members?membership_type=associate&limit=300'),
    ]).then(([gentsRes, assocRes]) => {
      setGents(gentsRes.data.members || [])
      setAssociates(assocRes.data.members || [])
    }).catch(() => toast.error('Failed to load data'))
    .finally(() => setLoading(false))
  }, [])

  const exportCSV = (data, filename) => {
    const headers = ['Name', 'Email', 'MUTCU Number', 'Year', 'Ministry', 'Phone', 'Student ID', 'County', 'Graduation Year']
    const rows = data.map(m => [
      m.name, m.email, m.mutcu_number || '', m.year_of_study || '',
      m.primary_ministry || 'General', m.phone || '', m.student_id || '',
      m.county || '', m.graduation_year || '',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  }

  const currentData = tab === 'gents' ? gents : associates
  const filtered = currentData.filter(m => {
    const q = search.toLowerCase()
    return !q || m.name?.toLowerCase().includes(q) || m.mutcu_number?.toLowerCase().includes(q)
  })

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Gents & Associates</h1>
          <p className="page-subtitle">2nd Vice Chairperson — Gents & Associates oversight</p>
        </div>
        <button onClick={() => exportCSV(filtered, `MUTCU-${tab === 'gents' ? 'Gents' : 'Associates'}-${new Date().toISOString().split('T')[0]}.csv`)}
          className="btn-outline btn-sm"><Download size={13} /> Export CSV</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
        <button onClick={() => setTab('gents')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'gents' ? 'bg-white text-navy shadow-sm' : 'text-gray-500'}`}>
          👨 All Gents ({gents.length})
        </button>
        <button onClick={() => setTab('associates')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'associates' ? 'bg-white text-navy shadow-sm' : 'text-gray-500'}`}>
          🎓 Associates ({associates.length})
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="form-input pl-8 py-1.5 text-sm" placeholder="Search by name or MUTCU number..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="card p-4 text-center">
          <div className="text-2xl font-montserrat font-bold text-navy">{filtered.length}</div>
          <div className="text-xs text-gray-400 mt-1">{tab === 'gents' ? 'Male Members' : 'Associate Members'}</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-montserrat font-bold text-teal">{filtered.filter(m => m.profile_complete).length}</div>
          <div className="text-xs text-gray-400 mt-1">Profiles Complete</div>
        </div>
        {tab === 'associates' ? (
          <div className="card p-4 text-center">
            <div className="text-2xl font-montserrat font-bold text-orange">{[...new Set(filtered.map(m => m.county).filter(Boolean))].length}</div>
            <div className="text-xs text-gray-400 mt-1">Counties Represented</div>
          </div>
        ) : (
          <div className="card p-4 text-center">
            <div className="text-2xl font-montserrat font-bold text-orange">{filtered.filter(m => m.year_of_study <= 2).length}</div>
            <div className="text-xs text-gray-400 mt-1">Year 1 & 2</div>
          </div>
        )}
      </div>

      {/* Member Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map(m => (
          <div key={m.id} className="card p-4 text-center hover:shadow-md transition-all cursor-pointer"
            onClick={() => setSelected(m)}>
            <img src={m.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=04003D&color=FF9700&size=80&bold=true`}
              alt="" className="w-14 h-14 rounded-full object-cover border-2 border-orange mx-auto mb-2" />
            <div className="font-semibold text-navy text-xs truncate">{m.name}</div>
            <div className="text-xs text-gray-400">{m.mutcu_number || '—'}</div>
            {tab === 'associates'
              ? <div className="text-xs text-teal mt-0.5">{m.county || 'County N/A'}</div>
              : <div className="text-xs text-orange mt-0.5">Year {m.year_of_study}</div>}
          </div>
        ))}
      </div>

      {/* Member Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-montserrat font-bold text-navy">Member Profile</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="text-center mb-4">
              <img src={selected.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selected.name)}&background=04003D&color=FF9700&size=120&bold=true`}
                alt="" className="w-20 h-20 rounded-full object-cover border-2 border-orange mx-auto mb-2" />
              <div className="font-montserrat font-bold text-navy">{selected.name}</div>
              <div className="text-orange text-sm font-semibold">{selected.mutcu_number}</div>
              <span className="badge badge-teal text-xs mt-1">{selected.membership_type} member</span>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ['Email', selected.email],
                ['Phone', selected.phone || '—'],
                ['Student ID', selected.student_id || '—'],
                ['Year of Study', selected.year_of_study ? `Year ${selected.year_of_study}` : '—'],
                ['Course Type', selected.course_type || '—'],
                ['Ministry', selected.primary_ministry || 'General'],
                ['County', selected.county || '—'],
                ['Graduation Year', selected.graduation_year || '—'],
                ['Membership', selected.membership_type],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-400 font-semibold">{label}</span>
                  <span className="text-navy font-semibold">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}