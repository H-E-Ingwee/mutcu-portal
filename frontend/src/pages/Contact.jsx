import { useState } from 'react'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { Send, CheckCircle } from 'lucide-react'

export default function Contact() {
  const [form, setForm] = useState({ subject: '', body: '' })
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/messages', form)
      setSent(true)
      toast.success('Message sent to the CU Secretary and Admin!')
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to send') }
    finally { setLoading(false) }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="page-header"><div><h1 className="page-title">Contact Admin</h1><p className="page-subtitle">Send a message to the CU Secretary or Admin</p></div></div>
      <div className="card p-6">
        {sent ? (
          <div className="text-center py-6">
            <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
            <h3 className="font-montserrat font-bold text-navy text-lg mb-2">Message Sent!</h3>
            <p className="text-gray-500 text-sm mb-4">Your message has been sent to the CU Secretary and Admin. They will respond via email.</p>
            <button onClick={() => { setSent(false); setForm({ subject: '', body: '' }) }} className="btn-outline btn-sm">Send Another Message</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
              Your message will be sent to the CU Secretary and Admin via email. Please be respectful and specific.
            </div>
            <div><label className="form-label">Subject *</label><input type="text" className="form-input" placeholder="What is your message about?" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} required /></div>
            <div><label className="form-label">Message *</label><textarea className="form-input" rows={6} placeholder="Write your message here..." value={form.body} onChange={e => setForm({...form, body: e.target.value})} required minLength={20} /></div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Send size={15} />}
              {loading ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
