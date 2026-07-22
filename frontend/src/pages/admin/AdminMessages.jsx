import { useEffect, useState } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Mail, MailOpen } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function AdminMessages() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => { api.get('/messages').then(r => setMessages(r.data.messages||[])).finally(() => setLoading(false)) }, [])

  const markRead = async id => {
    try {
      await api.put(`/messages/${id}/read`)
      setMessages(prev => prev.map(m => m.id === id ? {...m, status: 'read'} : m))
    } catch {}
  }

  const openMessage = msg => {
    setSelected(msg)
    if (msg.status === 'unread') markRead(msg.id)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>

  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Member Messages</h1><p className="page-subtitle">{messages.filter(m=>m.status==='unread').length} unread messages</p></div></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header"><h2 className="font-montserrat font-bold text-navy text-sm">Inbox</h2></div>
          <div>
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">No messages yet.</div>
            ) : messages.map(msg => {
              const photoUrl = msg.sender?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender?.name||'M')}&background=04003D&color=FF9700&size=200&bold=true`
              return (
                <div key={msg.id} onClick={() => openMessage(msg)}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-all ${selected?.id===msg.id?'bg-orange/5':''} ${msg.status==='unread'?'bg-blue-50/50':''}`}>
                  <img src={photoUrl} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${msg.status==='unread'?'font-bold text-navy':'font-semibold text-gray-700'}`}>{msg.sender?.name}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">{msg.created_at ? formatDistanceToNow(new Date(msg.created_at),{addSuffix:true}) : ''}</span>
                    </div>
                    <div className={`text-xs truncate ${msg.status==='unread'?'text-navy font-semibold':'text-gray-500'}`}>{msg.subject}</div>
                  </div>
                  {msg.status==='unread' ? <Mail size={14} className="text-orange flex-shrink-0 mt-1" /> : <MailOpen size={14} className="text-gray-300 flex-shrink-0 mt-1" />}
                </div>
              )
            })}
          </div>
        </div>

        <div className="card">
          {selected ? (
            <>
              <div className="card-header">
                <div>
                  <h2 className="font-montserrat font-bold text-navy text-sm">{selected.subject}</h2>
                  <div className="text-xs text-gray-400 mt-0.5">From: {selected.sender?.name} ({selected.sender?.email})</div>
                </div>
              </div>
              <div className="card-body">
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-4">{selected.body}</div>
                <a href={`mailto:${selected.sender?.email}?subject=Re: ${selected.subject}`} className="btn-primary btn-sm">Reply via Email</a>
              </div>
            </>
          ) : (
            <div className="card-body text-center py-12">
              <Mail size={40} className="text-gray-200 mx-auto mb-3" />
              <div className="text-gray-400 text-sm">Select a message to read</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
