import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Download, Share2, ExternalLink } from 'lucide-react'
import QRCode from 'qrcode'
import toast from 'react-hot-toast'

// MUTCU logo as inline SVG data URL (works with html2canvas — no CORS issues)
const MUTCU_LOGO_URL = '/mutcu-icon.png'

export default function MemberCard() {
  const { user } = useAuth()
  const cardRef = useRef(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [logoDataUrl, setLogoDataUrl] = useState('')
  const [downloading, setDownloading] = useState(false)

  const photoUrl = user?.photo_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'M')}&background=04003D&color=FF9700&size=200&bold=true`

  // Convert logo to data URL for html2canvas compatibility
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      canvas.getContext('2d').drawImage(img, 0, 0)
      setLogoDataUrl(canvas.toDataURL('image/png'))
    }
    img.onerror = () => setLogoDataUrl('')
    img.src = MUTCU_LOGO_URL
  }, [])

  // Generate QR code
  useEffect(() => {
    if (user?.mutcu_number) {
      QRCode.toDataURL(`${window.location.origin}/member/${user.mutcu_number}`, {
        width: 100, margin: 1, color: { dark: '#04003D', light: '#ffffff' }
      }).then(url => setQrDataUrl(url)).catch(() => {})
    }
  }, [user])

  const downloadCard = async () => {
    setDownloading(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      })
      const link = document.createElement('a')
      link.download = `MUTCU-Card-${user?.mutcu_number || 'member'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      toast.success('Member card downloaded!')
    } catch (err) {
      console.error(err)
      toast.error('Download failed. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  const shareCard = async () => {
    const url = `${window.location.origin}/member/${user?.mutcu_number}`
    if (navigator.share) {
      await navigator.share({ title: 'MUTCU Member Profile', url })
    } else {
      navigator.clipboard.writeText(url)
      toast.success('Profile link copied!')
    }
  }

  const validPeriod = user?.graduation_year
    ? `${user?.enrollment_year || new Date().getFullYear()} – ${user.graduation_year}`
    : 'Active Period'

  return (
    <div className="max-w-2xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Member Card</h1>
          <p className="page-subtitle">Your official MUTCU digital membership card</p>
        </div>
        <div className="flex gap-2">
          {user?.mutcu_number && (
            <button onClick={shareCard} className="btn-outline btn-sm">
              <Share2 size={14} /> Share Profile
            </button>
          )}
          <button onClick={downloadCard} disabled={downloading} className="btn-primary">
            {downloading
              ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              : <Download size={15} />
            }
            {downloading ? 'Downloading...' : 'Download Card'}
          </button>
        </div>
      </div>

      {/* ── Card Preview ── */}
      <div className="flex justify-center mb-6">
        <div
          ref={cardRef}
          style={{
            width: 360,
            fontFamily: 'Arial, sans-serif',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 12px 40px rgba(4,0,61,0.25)',
            position: 'relative',
          }}
        >
          {/* ── Header ── */}
          <div style={{
            background: 'linear-gradient(135deg, #04003D 0%, #0a0060 100%)',
            padding: '20px 20px 16px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Watermark logo — large faded behind content */}
            {logoDataUrl && (
              <img
                src={logoDataUrl}
                alt=""
                style={{
                  position: 'absolute', right: -10, top: -10,
                  width: 110, height: 110,
                  opacity: 0.07, objectFit: 'contain',
                  pointerEvents: 'none',
                }}
              />
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
              {/* Logo badge */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img
                  src={photoUrl}
                  alt={user?.name}
                  crossOrigin="anonymous"
                  style={{
                    width: 72, height: 72, borderRadius: '50%',
                    objectFit: 'cover', border: '3px solid #FF9700',
                  }}
                />
                {/* Small logo badge on photo */}
                {logoDataUrl && (
                  <div style={{
                    position: 'absolute', bottom: -2, right: -2,
                    width: 22, height: 22,
                    background: '#fff', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1.5px solid #FF9700', overflow: 'hidden', padding: 2,
                  }}>
                    <img src={logoDataUrl} alt="MUTCU" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 7, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 3 }}>
                  MUTCU Member Card
                </div>
                <div style={{ color: '#fff', fontSize: 15, fontWeight: 800, marginBottom: 2, lineHeight: 1.2 }}>
                  {user?.name}
                </div>
                <div style={{ color: '#FF9700', fontSize: 12, fontWeight: 700, marginBottom: 2 }}>
                  {user?.mutcu_number || 'Pending'}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 8, fontWeight: 600 }}>
                  {user?.primary_ministry || 'General Member'}
                </div>
              </div>

              {/* QR Code */}
              {qrDataUrl && (
                <div style={{ flexShrink: 0 }}>
                  <img
                    src={qrDataUrl}
                    alt="QR"
                    style={{
                      width: 60, height: 60, borderRadius: 8,
                      background: '#fff', padding: 4,
                      border: '2px solid rgba(255,151,0,0.4)',
                    }}
                  />
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 6, textAlign: 'center', marginTop: 2 }}>
                    Scan to verify
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Body ── */}
          <div style={{ background: '#fff', padding: '14px 20px', position: 'relative' }}>
            {/* Subtle watermark in body */}
            {logoDataUrl && (
              <img
                src={logoDataUrl}
                alt=""
                style={{
                  position: 'absolute', left: '50%', top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 80, height: 80,
                  opacity: 0.04, objectFit: 'contain',
                  pointerEvents: 'none',
                }}
              />
            )}
            {[
              ['Student Reg. No.', user?.student_id || '—'],
              ['Gender', user?.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : '—'],
              ['Membership', `${(user?.membership_type || 'Full').charAt(0).toUpperCase() + (user?.membership_type || 'full').slice(1)} Member`],
              ['Valid Period', validPeriod],
            ].map(([label, value], i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 0',
                borderBottom: i < 3 ? '1px solid #F0F0F0' : 'none',
                fontSize: 10, position: 'relative', zIndex: 1,
              }}>
                <span style={{ color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  {label}
                </span>
                <span style={{ color: '#04003D', fontWeight: 700 }}>{value}</span>
              </div>
            ))}
          </div>

          {/* ── Footer ── */}
          <div style={{
            background: 'linear-gradient(90deg, #04003D 0%, #0a0060 100%)',
            padding: '8px 20px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            {logoDataUrl && (
              <img src={logoDataUrl} alt="MUTCU" style={{ width: 18, height: 18, objectFit: 'contain', opacity: 0.7 }} />
            )}
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 6.5, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase' }}>
              MURANG'A UNIVERSITY OF TECHNOLOGY CHRISTIAN UNION
            </span>
            <span style={{ color: '#FF9700', fontSize: 6.5, fontStyle: 'italic' }}>
              v2.0
            </span>
          </div>
        </div>
      </div>

      {/* ── Card Info ── */}
      <div className="card mb-4">
        <div className="card-header">
          <h2 className="font-montserrat font-bold text-navy text-sm">Card Details</h2>
          {user?.mutcu_number && (
            <a
              href={`/member/${user.mutcu_number}`}
              target="_blank"
              rel="noreferrer"
              className="btn-outline btn-sm text-xs"
            >
              <ExternalLink size={12} /> View Public Profile
            </a>
          )}
        </div>
        <div>
          {[
            ['MUTCU Number', user?.mutcu_number || 'Pending assignment'],
            ['Full Name', user?.name || '—'],
            ['Ministry', user?.primary_ministry || 'General Member'],
            ['Issued', new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })],
            ['Valid Until', user?.graduation_year ? `End of ${user.graduation_year} Academic Year` : 'Active membership period'],
            ['Public Profile', user?.mutcu_number ? `${window.location.origin}/member/${user.mutcu_number}` : 'Pending'],
          ].map(([label, value], i, arr) => (
            <div key={i} className={`flex justify-between items-center px-5 py-3 text-sm ${i < arr.length - 1 ? 'border-b border-gray-50' : ''}`}>
              <span className="text-gray-400 text-xs font-montserrat font-semibold uppercase tracking-wide">{label}</span>
              <span className="font-semibold text-navy text-right max-w-xs break-all">{value}</span>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 bg-orange/5 text-xs text-orange rounded-b-xl">
          🔒 The QR code links to your public verification profile. Your email is not publicly visible.
        </div>
      </div>
    </div>
  )
}