import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../lib/api'
import { CheckCircle } from 'lucide-react'

export default function PublicProfile() {
  const { mutcuNumber } = useParams()
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get(`/members/public/${mutcuNumber}`)
      .then(r => setMember(r.data.member))
      .catch(() => setError('Member not found'))
      .finally(() => setLoading(false))
  }, [mutcuNumber])

  const photoUrl = member?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member?.name||'M')}&background=04003D&color=FF9700&size=200&bold=true`

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>
  if (error) return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><div className="text-gray-400 text-lg mb-2">Member not found</div><div className="text-gray-300 text-sm">{mutcuNumber}</div></div></div>

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-br from-navy to-[#0a0060] p-6 text-center">
            <img src={photoUrl} alt={member?.name} className="w-24 h-24 rounded-full object-cover border-4 border-orange mx-auto mb-3" />
            <div className="font-montserrat font-bold text-white text-lg mb-0.5">{member?.name}</div>
            <div className="font-montserrat font-bold text-orange text-sm">{member?.mutcu_number}</div>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-center gap-2 bg-green-50 border border-green-200 rounded-lg p-2.5 mb-4">
              <CheckCircle size={16} className="text-green-600" />
              <span className="text-green-700 text-xs font-montserrat font-bold">Verified MUTCU Member</span>
            </div>
            {[['MUTCU Number', member?.mutcu_number],['Membership', `${member?.membership_type||'Full'} Member`],['Ministry', member?.primary_ministry||'General Member'],['Member Since', member?.membership_year||'—'],['Status', 'Active']].map(([label, value], i) => (
              <div key={i} className={`flex justify-between py-2.5 text-sm ${i<4?'border-b border-gray-50':''}`}>
                <span className="text-gray-400 text-xs font-montserrat font-semibold uppercase tracking-wide">{label}</span>
                <span className="font-bold text-navy">{value}</span>
              </div>
            ))}
          </div>
          <div className="bg-navy px-5 py-3 text-center">
            <div className="text-white/30 text-xs">Murang'a University of Technology Christian Union</div>
            <div className="text-orange text-xs italic mt-0.5">Inspire Love, Hope & Godliness</div>
          </div>
        </div>
      </div>
    </div>
  )
}
