import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Heart, CheckCircle, AlertTriangle, Shield } from 'lucide-react'

const DECLARATION_TEXT = `I, in joining this Union, declare my faith in Jesus Christ as my Savior, my Lord and God and it is my desire by the grace of God to live a life consistent with this declaration.`

export default function FaithDeclaration({ onComplete }) {
  const { user } = useAuth()
  const [agreed, setAgreed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const lastRenewed = user?.faith_declaration_renewed_at || user?.declaration_signed_at
  const lastRenewedDate = lastRenewed ? new Date(lastRenewed).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null
  const currentYear = new Date().getFullYear()
  const renewedThisYear = lastRenewed && new Date(lastRenewed).getFullYear() === currentYear

  const renew = async () => {
    if (!agreed) return toast.error('Please check the declaration box to confirm')
    setSaving(true)
    try {
      await api.put('/users/faith-declaration-renew')
      setDone(true)
      toast.success('Faith declaration renewed successfully!')
      if (onComplete) onComplete()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to renew declaration')
    } finally { setSaving(false) }
  }

  if (done || renewedThisYear) {
    return (
      <div className="card p-6 text-center">
        <div className="w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-teal" />
        </div>
        <h3 className="font-montserrat font-bold text-navy text-lg mb-2">Faith Declaration Active</h3>
        <p className="text-gray-500 text-sm mb-2">
          Your faith declaration is current for {currentYear}.
        </p>
        {lastRenewedDate && (
          <div className="bg-teal/5 border border-teal/20 rounded-xl px-4 py-2 inline-block">
            <span className="text-xs text-teal font-semibold">Last renewed: {lastRenewedDate}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 bg-orange/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <Heart size={24} className="text-orange" />
        </div>
        <div>
          <h3 className="font-montserrat font-bold text-navy text-lg">Annual Faith Declaration</h3>
          <p className="text-gray-400 text-sm">Required annually — MUTCU Constitution Art. 8.2(I)</p>
        </div>
      </div>

      {!renewedThisYear && lastRenewedDate && (
        <div className="bg-orange/5 border border-orange/20 rounded-xl p-3 mb-4 flex items-start gap-2">
          <AlertTriangle size={15} className="text-orange flex-shrink-0 mt-0.5" />
          <div className="text-sm text-orange">
            Your last declaration was on <strong>{lastRenewedDate}</strong>. Please renew for {currentYear}.
          </div>
        </div>
      )}

      <div className="bg-navy/5 border border-navy/10 rounded-xl p-5 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={14} className="text-navy" />
          <span className="font-montserrat font-bold text-navy text-sm">MUTCU Faith Declaration</span>
        </div>
        <p className="text-gray-700 text-sm leading-relaxed italic">"{DECLARATION_TEXT}"</p>
        <p className="text-xs text-gray-400 mt-3">— MUTCU Constitution, Article 8.2(I)</p>
      </div>

      <label className="flex items-start gap-3 cursor-pointer mb-5 p-3 rounded-xl border border-gray-100 hover:border-orange/30 hover:bg-orange/5 transition-all">
        <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
          className="accent-orange mt-0.5 flex-shrink-0" />
        <span className="text-sm text-gray-700 leading-relaxed">
          I, <strong>{user?.name}</strong>, affirm this faith declaration for the {currentYear}/{currentYear + 1} spiritual year. I declare my faith in Jesus Christ as my Savior, Lord and God, and commit to live consistently with this declaration.
        </span>
      </label>

      <button onClick={renew} disabled={saving || !agreed} className="btn-primary w-full justify-center">
        {saving
          ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Renewing...</>
          : <><Heart size={15} /> Renew Faith Declaration for {currentYear}</>}
      </button>
    </div>
  )
}