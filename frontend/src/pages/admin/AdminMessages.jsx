import { useEffect, useState } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Mail, MailOpen, Send, Reply } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function AdminMessages() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    api.get('/messages').then(r => setMessages(r.data.messages||[])).finally(() => setLoading(false))
  }, [])

  const markRead = async id => {
    try {
      await api.put(`/messages/${id}/read`)
      setMessages(prev => prev.map(m => m.id===id ? {...m, status:'read'} : m))
    } catch {}
  }

  const openMessage = msg => {
    setSelected(msg)
    setReplyText('')
    if (msg.status==='unread') markRead(msg.id)
  }

  const sendReply = async () => {
    if (!replyText.trim()) return
    setSending(true)
    try {
      await api.post('/messages/reply', {
        message_id: selected.id,
        reply: replyText,
        to_email: selected.sender?.email,
        to_name: selected.sender?.name,
        original_subject: selected.subject,
      })
      toast.success(`Reply sent to ${selected.sender?.name}!`)
      setReplyText('')
    } catch (err) {
      // Fallback: open email client
      const mailto = `mailto:${selected.sender?.email}?subject=Re: ${encodeURIComponent(selected.subject)}&body=${encodeURIComponent(replyText)}`
      window.open(mailto)
      toast.success('Opening email client...')
      setReplyText('')
    } finally { setSending(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>

  const unreadCount = messages.filter(m=>m.status==='unread').length

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Member Messages</h1>
          <p className="page-subtitle">{unreadCount > 0 ? `${unreadCount} unread` : 'All messages read'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6" style={{height:'calc(100vh - 200px)'}}>
        {/* Inbox */}
        <div className="lg:col-span-2 card overflow-hidden flex flex-col">
          <div className="card-header flex-shrink-0"><h2 className="font-montserrat font-bold text-navy text-sm">Inbox ({messages.length})</h2></div>
          <div className="flex-1 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">No messages yet.</div>
            ) : messages.map(msg => {
              const photoUrl = msg.sender?.photo_url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender?.name||'M')}&background=04003D&color=FF9700&size=200&bold=true`
              return (
                <div key={msg.id} onClick={() => openMessage(msg)}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-all ${selected?.id===msg.id?'bg-orange/5 border-l-2 border-l-orange':''} ${msg.status==='unread'?'bg-blue-50/30':''}`}>
                  <img src={photoUrl} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${msg.status==='unread'?'font-bold text-navy':'font-semibold text-gray-700'}`}>
                        {msg.sender?.name}
                      </span>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {msg.created_at ? formatDistanceToNow(new Date(msg.created_at),{addSuffix:true}) : ''}
                      </span>
                    </div>
                    <div className={`text-xs truncate ${msg.status==='unread'?'text-navy font-semibold':'text-gray-500'}`}>
                      {msg.subject}
                    </div>
                  </div>
                  {msg.status==='unread'
                    ? <Mail size={14} className="text-orange flex-shrink-0 mt-1" />
                    : <MailOpen size={14} className="text-gray-300 flex-shrink-0 mt-1" />}
                </div>
              )
            })}
          </div>
        </div>

        {/* Message Detail + Reply */}
        <div className="lg:col-span-3 card overflow-hidden flex flex-col">
          {selected ? (
            <>
              {/* Header */}
              <div className="card-header flex-shrink-0">
                <div>
                  <h2 className="font-montserrat font-bold text-navy text-sm">{selected.subject}</h2>
                  <div className="text-xs text-gray-400 mt-0.5">
                    From: <strong>{selected.sender?.name}</strong> ({selected.sender?.email})
                    {selected.sender?.mutcu_number && <span className="ml-2 badge badge-orange">{selected.sender.mutcu_number}</span>}
                  </div>
                </div>
              </div>

              {/* Message body */}
              <div className="flex-1 overflow-y-auto p-5">
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-6">
                  {selected.body}
                </div>

                {/* Reply section */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Reply size={14} className="text-orange" />
                    <span className="font-montserrat font-bold text-navy text-sm">Reply to {selected.sender?.name}</span>
                  </div>
                  <textarea
                    className="form-input mb-3"
                    rows={4}
                    placeholder={`Write your reply to ${selected.sender?.name}...`}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                  />
                  <div className="flex gap-3">
                    <button onClick={sendReply} disabled={sending || !replyText.trim()} className="btn-primary">
                      {sending ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Send size={14} />}
                      {sending ? 'Sending...' : 'Send Reply'}
                    </button>
                    <a href={`mailto:${selected.sender?.email}?subject=Re: ${encodeURIComponent(selected.subject)}`}
                      className="btn-outline btn-sm">
                      Open in Email App
                    </a>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Reply will be sent from your configured email address to {selected.sender?.email}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Mail size={48} className="text-gray-200 mx-auto mb-3" />
                <div className="text-gray-400 text-sm">Select a message to read and reply</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
