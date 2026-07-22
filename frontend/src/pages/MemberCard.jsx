import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Download, QrCode } from 'lucide-react'
import QRCode from 'qrcode'
import toast from 'react-hot-toast'

export default function MemberCard() {
  const { user } = useAuth()
  const cardRef = useRef(null)
  const [qrDataUrl, setQrDataUrl] = useState('')

  const photoUrl = user?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name||'M')}&background=04003D&color=FF9700&size=200&bold=true`

  useEffect(() => {
    if (user?.mutcu_number) {
      QRCode.toDataURL(`${window.location.origin}/member/${user.mutcu_number}`, { width: 80, margin: 1 })
        .then(url => setQrDataUrl(url))
        .catch(() => {})
    }
  }, [user])

  const downloadCard = async () => {
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(cardRef.current, { scale: 3, useCORS: true, backgroundColor: null })
      const link = document.createElement('a')
      link.download = `MUTCU-Card-${user?.mutcu_number || 'member'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      toast.success('Member card downloaded!')
    } catch (err) {
      toast.error('Download failed. Please try again.')
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="page-header">
        <div><h1 className="page-title">My Member Card</h1><p className="page-subtitle">Your official MUTCU digital membership card</p></div>
        <button onClick={downloadCard} className="btn-primary"><Download size={15} />Download Card</button>
      </div>

      {/* Card Preview */}
      <div className="flex justify-center mb-6">
        <div ref={cardRef} style={{ width: 340, fontFamily: 'Montserrat, sans-serif', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
          {/* Card Top */}
          <div style={{ background: 'linear-gradient(135deg, #04003D 0%, #0a0060 100%)', padding: '20px 20px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <img src={photoUrl} alt={user?.name} crossOrigin="anonymous" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid #FF9700', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>MUTCU Member Card</div>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 800, marginBottom: 2 }}>{user?.name}</div>
              <div style={{ color: '#FF9700', fontSize: 11, fontWeight: 700 }}>{user?.mutcu_number || 'Pending'}</div>
            </div>
            {qrDataUrl && <img src={qrDataUrl} alt="QR" style={{ width: 56, height: 56, borderRadius: 6, background: '#fff', padding: 3, flexShrink: 0 }} />}
          </div>
          {/* Card Body */}
          <div style={{ background: '#fff', padding: '14px 20px' }}>
            {[
              ['Student Reg. No.', user?.student_id || '—'],
              ['Ministry', user?.primary_ministry || 'General Member'],
              ['Membership', `${user?.membership_type || 'Full'} Member`],
              ['Valid Period', user?.graduation_year ? `${user?.enrollment_year || '—'} – ${user.graduation_year}` : 'Active Period'],
            ].map(([label, value], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: i < 3 ? '1px solid #F0F0F0' : 'none', fontSize: 10 }}>
                <span style={{ color: '#718096', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
                <span style={{ color: '#04003D', fontWeight: 700 }}>{value}</span>
              </div>
            ))}
          </div>
          {/* Card Footer */}
          <div style={{ background: '#04003D', padding: '8px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 7, fontWeight: 700, letterSpacing: 1 }}>MURANG'A UNIVERSITY OF TECHNOLOGY CHRISTIAN UNION</span>
            <span style={{ color: '#FF9700', fontSize: 7, fontStyle: 'italic' }}>Inspire Love, Hope & Godliness</span>
          </div>
        </div>
      </div>

      {/* Card Info */}
      <div className="card">
        <div className="card-header"><h2 className="font-montserrat font-bold text-navy text-sm">Card Information</h2></div>
        <div>
          {[['MUTCU Number', user?.mutcu_number||'Pending assignment'],['Issued', new Date().toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'})],['Valid Until', user?.graduation_year ? `End of ${user.graduation_year} Academic Year` : 'Active membership period'],['Public Profile', user?.mutcu_number ? `${window.location.origin}/member/${user.mutcu_number}` : 'Pending']].map(([label, value], i) => (
            <div key={i} className={`flex justify-between items-center px-5 py-3 text-sm ${i<3?'border-b border-gray-50':''}`}>
              <span className="text-gray-400 text-xs font-montserrat font-semibold uppercase tracking-wide">{label}</span>
              <span className="font-semibold text-navy text-right max-w-xs break-all">{value}</span>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 bg-blue-50 text-xs text-blue-600 rounded-b-xl">The QR code links to your public profile for verification. Your student ID and email are not publicly visible.</div>
      </div>
    </div>
  )
}
