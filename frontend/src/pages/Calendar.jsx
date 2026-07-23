import { useEffect, useState } from 'react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import {
  Calendar, Plus, Edit2, Trash2, X, Check, ChevronLeft, ChevronRight, Filter
} from 'lucide-react'

const EVENT_TYPES = [
  { value: 'prayer',      label: 'Prayer',       color: 'bg-navy text-white',    dot: 'bg-navy' },
  { value: 'fellowship',  label: 'Fellowship',   color: 'bg-teal text-white',    dot: 'bg-teal' },
  { value: 'outreach',    label: 'Outreach',     color: 'bg-orange text-white',  dot: 'bg-orange' },
  { value: 'agm',         label: 'AGM',          color: 'bg-red text-white',     dot: 'bg-red' },
  { value: 'special',     label: 'Special',      color: 'bg-purple-500 text-white', dot: 'bg-purple-500' },
  { value: 'academic',    label: 'Academic',     color: 'bg-blue-500 text-white', dot: 'bg-blue-500' },
  { value: 'nomination',  label: 'Nomination',   color: 'bg-yellow-500 text-white', dot: 'bg-yellow-500' },
]

const typeInfo = (type) => EVENT_TYPES.find(t => t.value === type) || EVENT_TYPES[0]

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function CalendarPage() {
  const { isAdmin } = useAuth()
  const [events, setEvents] = useState([])
  const [years, setYears] = useState([])
  const [selectedYear, setSelectedYear] = useState('')
  const [filterType, setFilterType] = useState('')
  const [viewMode, setViewMode] = useState('list') // 'list' | 'month'
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'new' | event object
  const [form, setForm] = useState({
    spiritual_year: '', title: '', event_type: 'prayer',
    event_date: '', end_date: '', description: '', is_recurring: false, is_published: true,
  })
  const [saving, setSaving] = useState(false)

  const admin = isAdmin && isAdmin()

  useEffect(() => {
    api.get('/calendar/years').then(r => {
      const y = r.data.years || []
      setYears(y)
      if (y.length > 0) setSelectedYear(y[0])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const endpoint = admin ? '/calendar/all' : '/calendar'
    const params = new URLSearchParams()
    if (selectedYear) params.set('year', selectedYear)
    if (filterType) params.set('type', filterType)
    api.get(`${endpoint}?${params}`).then(r => setEvents(r.data.events || []))
      .catch(() => {}).finally(() => setLoading(false))
  }, [selectedYear, filterType, admin])

  const openModal = (event = null) => {
    if (event) {
      setForm({
        spiritual_year: event.spiritual_year,
        title: event.title,
        event_type: event.event_type,
        event_date: event.event_date,
        end_date: event.end_date || '',
        description: event.description || '',
        is_recurring: event.is_recurring || false,
        is_published: event.is_published !== false,
      })
      setModal(event)
    } else {
      setForm({
        spiritual_year: selectedYear || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
        title: '', event_type: 'prayer',
        event_date: new Date().toISOString().split('T')[0],
        end_date: '', description: '', is_recurring: false, is_published: true,
      })
      setModal('new')
    }
  }

  const saveEvent = async () => {
    if (!form.title || !form.event_date || !form.spiritual_year) {
      return toast.error('Title, date and spiritual year are required')
    }
    setSaving(true)
    try {
      if (modal === 'new') {
        const { data } = await api.post('/calendar', form)
        setEvents(prev => [...prev, data.event].sort((a, b) => new Date(a.event_date) - new Date(b.event_date)))
        toast.success('Event added!')
      } else {
        const { data } = await api.put(`/calendar/${modal.id}`, form)
        setEvents(prev => prev.map(e => e.id === modal.id ? data.event : e))
        toast.success('Event updated!')
      }
      setModal(null)
    } catch (err) { toast.error(err.response?.data?.error || 'Failed') }
    finally { setSaving(false) }
  }

  const deleteEvent = async (id) => {
    if (!window.confirm('Delete this event?')) return
    try {
      await api.delete(`/calendar/${id}`)
      setEvents(prev => prev.filter(e => e.id !== id))
      toast.success('Event deleted')
    } catch { toast.error('Failed to delete') }
  }

  // Group events by month for list view
  const groupedByMonth = {}
  events.forEach(e => {
    const d = new Date(e.event_date)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (!groupedByMonth[key]) groupedByMonth[key] = { month: d.getMonth(), year: d.getFullYear(), events: [] }
    groupedByMonth[key].events.push(e)
  })
  const monthGroups = Object.values(groupedByMonth).sort((a, b) =>
    new Date(a.year, a.month) - new Date(b.year, b.month)
  )

  // Month view — get days in month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDay = new Date(currentYear, currentMonth, 1).getDay()
  const monthEvents = events.filter(e => {
    const d = new Date(e.event_date)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  })

  const eventsOnDay = (day) => monthEvents.filter(e => new Date(e.event_date).getDate() === day)

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Spiritual Year Calendar</h1>
          <p className="page-subtitle">MUTCU events, activities and key dates</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {['list','month'].map(v => (
              <button key={v} onClick={() => setViewMode(v)}
                className={`px-3 py-1.5 rounded-md text-xs font-montserrat font-bold transition-all capitalize ${viewMode === v ? 'bg-white text-navy shadow-sm' : 'text-gray-500'}`}>
                {v}
              </button>
            ))}
          </div>
          {admin && (
            <button onClick={() => openModal()} className="btn-primary btn-sm">
              <Plus size={14} />Add Event
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <select className="form-select text-sm w-44" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
            <option value="">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <select className="form-select text-sm w-36" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {/* Legend */}
        <div className="flex gap-2 flex-wrap ml-auto">
          {EVENT_TYPES.map(t => (
            <div key={t.value} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${t.dot}`} />
              <span className="text-xs text-gray-500">{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" />
        </div>
      ) : events.length === 0 ? (
        <div className="card p-12 text-center">
          <Calendar size={48} className="text-gray-200 mx-auto mb-3" />
          <div className="text-gray-400 text-sm mb-2">No events scheduled yet.</div>
          {admin && <button onClick={() => openModal()} className="btn-primary btn-sm mx-auto">Add First Event</button>}
        </div>
      ) : viewMode === 'list' ? (
        /* ── List View ── */
        <div className="space-y-6">
          {monthGroups.map(group => (
            <div key={`${group.year}-${group.month}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="font-montserrat font-bold text-navy text-sm">{MONTH_FULL[group.month]} {group.year}</div>
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400">{group.events.length} event{group.events.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-2">
                {group.events.map(event => {
                  const info = typeInfo(event.event_type)
                  const date = new Date(event.event_date)
                  const isPast = date < new Date()
                  return (
                    <div key={event.id} className={`card p-4 flex items-start gap-4 transition-all hover:shadow-md ${isPast ? 'opacity-70' : ''} ${!event.is_published ? 'border-dashed border-gray-300' : ''}`}>
                      {/* Date block */}
                      <div className="flex-shrink-0 text-center w-12">
                        <div className="text-2xl font-montserrat font-bold text-navy leading-none">{date.getDate()}</div>
                        <div className="text-xs text-gray-400 uppercase">{MONTHS[date.getMonth()]}</div>
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${info.color}`}>{info.label}</span>
                          {event.is_recurring && <span className="text-xs text-gray-400">🔄 Recurring</span>}
                          {!event.is_published && <span className="badge badge-gray text-xs">Draft</span>}
                          {event.spiritual_year && <span className="text-xs text-gray-400">{event.spiritual_year}</span>}
                        </div>
                        <div className="font-semibold text-navy text-sm">{event.title}</div>
                        {event.end_date && event.end_date !== event.event_date && (
                          <div className="text-xs text-gray-400">Until {new Date(event.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                        )}
                        {event.description && <div className="text-xs text-gray-500 mt-1 line-clamp-2">{event.description}</div>}
                      </div>
                      {/* Admin actions */}
                      {admin && (
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => openModal(event)} className="text-gray-400 hover:text-navy transition-colors p-1">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => deleteEvent(event.id)} className="text-gray-400 hover:text-red transition-colors p-1">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── Month View ── */
        <div className="card overflow-hidden">
          {/* Month navigation */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
            <button onClick={() => {
              if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
              else setCurrentMonth(m => m - 1)
            }} className="text-gray-400 hover:text-navy transition-colors p-1">
              <ChevronLeft size={18} />
            </button>
            <div className="font-montserrat font-bold text-navy">{MONTH_FULL[currentMonth]} {currentYear}</div>
            <button onClick={() => {
              if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
              else setCurrentMonth(m => m + 1)
            }} className="text-gray-400 hover:text-navy transition-colors p-1">
              <ChevronRight size={18} />
            </button>
          </div>
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="text-center text-xs font-montserrat font-bold text-gray-400 py-2">{d}</div>
            ))}
          </div>
          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-20 border-b border-r border-gray-50" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dayEvents = eventsOnDay(day)
              const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear()
              return (
                <div key={day} className={`min-h-20 border-b border-r border-gray-50 p-1.5 ${isToday ? 'bg-orange/5' : ''}`}>
                  <div className={`text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-orange text-white' : 'text-gray-500'}`}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map(e => {
                      const info = typeInfo(e.event_type)
                      return (
                        <div key={e.id} className={`text-xs px-1.5 py-0.5 rounded font-semibold truncate ${info.color}`} title={e.title}>
                          {e.title}
                        </div>
                      )
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-gray-400 px-1">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Event Modal ── */}
      {modal !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-montserrat font-bold text-navy">{modal === 'new' ? 'Add Calendar Event' : 'Edit Event'}</h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="form-label">Event Title *</label>
                <input type="text" className="form-input" placeholder="e.g. Weekly Prayer Meeting"
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Event Type *</label>
                  <select className="form-select" value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}>
                    {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Spiritual Year *</label>
                  <input type="text" className="form-input" placeholder="2025/2026"
                    value={form.spiritual_year} onChange={e => setForm(f => ({ ...f, spiritual_year: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Start Date *</label>
                  <input type="date" className="form-input"
                    value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">End Date <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
                  <input type="date" className="form-input"
                    value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="form-label">Description <span className="text-gray-400 font-normal normal-case">(optional)</span></label>
                <textarea className="form-input" rows={2} placeholder="Additional details..."
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="accent-orange" checked={form.is_recurring}
                    onChange={e => setForm(f => ({ ...f, is_recurring: e.target.checked }))} />
                  <span className="text-sm text-gray-700">Recurring event</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="accent-orange" checked={form.is_published}
                    onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))} />
                  <span className="text-sm text-gray-700">Published (visible to members)</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={saveEvent} disabled={saving} className="btn-primary flex-1 justify-center">
                <Check size={15} />{saving ? 'Saving...' : 'Save Event'}
              </button>
              <button onClick={() => setModal(null)} className="btn-outline flex-1 justify-center">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}