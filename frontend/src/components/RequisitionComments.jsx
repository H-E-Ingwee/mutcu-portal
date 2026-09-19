import { useEffect, useState } from 'react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { MessageSquare, Send, Lock, Eye } from 'lucide-react'

export default function RequisitionComments({ requisitionId, requestedById }) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const isPrivileged = ['cu_treasurer', 'super_admin', 'ec_admin', 'cu_secretary'].includes(user?.role)

  useEffect(() => {
    if (!requisitionId) return
    api.get(`/treasury/requisitions/${requisitionId}/comments`)
      .then(r => setComments(r.data.comments || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [requisitionId])

  const submit = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    setSubmitting(true)
    try {
      const res = await api.post(`/treasury/requisitions/${requisitionId}/comments`, {
        comment: text.trim(),
        is_internal: isPrivileged ? isInternal : false,
      })
      setComments(prev => [...prev, res.data.comment])
      setText('')
      setIsInternal(false)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to post comment')
    } finally { setSubmitting(false) }
  }

  const formatTime = (d) => d ? new Date(d).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  }) : ''

  return (
    <div className="border-t border-gray-100 pt-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare size={14} className="text-navy" />
        <h4 className="font-montserrat font-bold text-navy text-sm">
          Comments {comments.length > 0 && <span className="text-gray-400 font-normal">({comments.length})</span>}
        </h4>
      </div>

      {/* Comments list */}
      {loading ? (
        <div className="text-xs text-gray-400 py-2">Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="text-xs text-gray-400 py-2 text-center">No comments yet. Add one below.</div>
      ) : (
        <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
          {comments.map(c => {
            const isMe = c.author_id === user?.id
            const isInternalComment = c.is_internal
            return (
              <div key={c.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                <img
                  src={c.author?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.author?.name || 'M')}&background=04003D&color=FF9700&size=40&bold=true`}
                  alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-0.5" />
                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={`flex items-center gap-1.5 mb-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <span className="text-xs font-semibold text-navy">{isMe ? 'You' : c.author?.name}</span>
                    {isInternalComment && (
                      <span className="flex items-center gap-0.5 text-xs text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded-full">
                        <Lock size={9} /> Internal
                      </span>
                    )}
                    <span className="text-xs text-gray-300">{formatTime(c.created_at)}</span>
                  </div>
                  <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    isMe
                      ? 'bg-navy text-white rounded-tr-sm'
                      : isInternalComment
                        ? 'bg-purple-50 text-purple-800 border border-purple-200 rounded-tl-sm'
                        : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                  }`}>
                    {c.comment}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Input */}
      <form onSubmit={submit} className="space-y-2">
        <div className="flex gap-2">
          <input
            className="form-input flex-1 text-sm py-2"
            placeholder="Add a comment..."
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={500}
          />
          <button type="submit" disabled={submitting || !text.trim()}
            className="btn-primary px-3 py-2 flex-shrink-0">
            {submitting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Send size={15} />}
          </button>
        </div>
        {isPrivileged && (
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)}
              className="accent-purple-600" />
            <Lock size={11} className="text-purple-500" />
            <span>Internal note (only visible to Treasurer & Admin)</span>
          </label>
        )}
      </form>
    </div>
  )
}