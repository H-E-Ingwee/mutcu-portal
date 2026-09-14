import { useState } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Sparkles, AlertTriangle, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'

const RISK_CONFIG = {
  LOW:    { color: 'text-teal',   bg: 'bg-teal/10',   border: 'border-teal/30',   icon: CheckCircle,    label: 'Low Risk' },
  MEDIUM: { color: 'text-orange', bg: 'bg-orange/10', border: 'border-orange/30', icon: AlertTriangle,  label: 'Medium Risk' },
  HIGH:   { color: 'text-red',    bg: 'bg-red/10',    border: 'border-red/30',    icon: XCircle,        label: 'High Risk' },
  CLEAR:  { color: 'text-teal',   bg: 'bg-teal/10',   border: 'border-teal/30',   icon: CheckCircle,    label: 'Clear' },
}

const REC_CONFIG = {
  APPROVE:              { color: 'text-teal',   label: '✅ Recommend Approve' },
  PARTIALLY_APPROVE:    { color: 'text-orange', label: '⚠️ Recommend Partial Approval' },
  REQUEST_CLARIFICATION:{ color: 'text-orange', label: '❓ Request Clarification' },
  REJECT:               { color: 'text-red',    label: '❌ Recommend Reject' },
}

export default function AIRequisitionReview({ requisitionId, requisitionNumber, onApplySuggestion }) {
  const [loading, setLoading] = useState(false)
  const [review, setReview] = useState(null)
  const [expanded, setExpanded] = useState(true)
  const [error, setError] = useState(null)

  const runReview = async () => {
    setLoading(true)
    setError(null)
    setReview(null)
    try {
      const res = await api.post('/ai/treasury/review-requisition', { requisition_id: requisitionId })
      setReview(res.data.review)
      setExpanded(true)
    } catch (err) {
      setError(err.response?.data?.error || 'AI review failed. Please try again.')
      toast.error('AI review failed')
    } finally { setLoading(false) }
  }

  const riskCfg = review ? (RISK_CONFIG[review.risk_level] || RISK_CONFIG.LOW) : null
  const recCfg = review ? (REC_CONFIG[review.recommendation] || {}) : null

  return (
    <div className="card border border-purple-100">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center">
            <Sparkles size={14} className="text-purple-600" />
          </div>
          <div>
            <span className="font-montserrat font-bold text-navy text-sm">AI Review Assistant</span>
            <span className="ml-2 text-xs text-gray-400">{requisitionNumber}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {review && (
            <button onClick={() => setExpanded(e => !e)} className="text-gray-400 hover:text-navy p-1">
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
          <button onClick={runReview} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50">
            {loading
              ? <><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> Analyzing...</>
              : <><Sparkles size={12} /> {review ? 'Re-analyze' : 'Analyze with AI'}</>}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 text-sm text-red bg-red/5">{error}</div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Analyzing requisition against ministry history and budget...</p>
        </div>
      )}

      {/* Review Result */}
      {review && expanded && !loading && (
        <div className="p-4 space-y-3">
          {/* Risk + Recommendation */}
          <div className="flex items-center gap-3 flex-wrap">
            {riskCfg && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold ${riskCfg.color} ${riskCfg.bg} ${riskCfg.border}`}>
                <riskCfg.icon size={13} />
                {riskCfg.label}
              </div>
            )}
            {recCfg && (
              <div className={`text-xs font-bold ${recCfg.color}`}>{recCfg.label}</div>
            )}
          </div>

          {/* Suggested Amount */}
          {review.suggested_amount && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
              <div className="text-xs text-purple-500 font-semibold uppercase tracking-wide mb-1">Suggested Approved Amount</div>
              <div className="flex items-center justify-between">
                <div className="text-xl font-montserrat font-bold text-purple-700">
                  KES {parseFloat(review.suggested_amount).toLocaleString()}
                </div>
                {onApplySuggestion && (
                  <button onClick={() => onApplySuggestion(review.suggested_amount)}
                    className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-all font-semibold">
                    Apply Amount
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Reasoning */}
          {review.reasoning && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">AI Reasoning</div>
              <p className="text-sm text-gray-600 leading-relaxed">{review.reasoning}</p>
            </div>
          )}

          {/* Flags */}
          {review.flags?.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Flags</div>
              <div className="space-y-1">
                {review.flags.map((flag, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-orange bg-orange/5 rounded-lg px-3 py-2">
                    <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                    {flag}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes for requester */}
          {review.notes_for_requester && (
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Suggested Note to Requester</div>
              <p className="text-xs text-gray-600 italic">"{review.notes_for_requester}"</p>
            </div>
          )}

          <div className="text-xs text-gray-300 text-right">Powered by MUTCU AI Assistant</div>
        </div>
      )}

      {/* Empty state */}
      {!review && !loading && !error && (
        <div className="p-4 text-center text-gray-400 text-sm">
          <Sparkles size={20} className="mx-auto mb-2 text-purple-200" />
          Click <strong>Analyze with AI</strong> to get an instant review of this requisition including suggested approval amount, risk assessment, and flags.
        </div>
      )}
    </div>
  )
}