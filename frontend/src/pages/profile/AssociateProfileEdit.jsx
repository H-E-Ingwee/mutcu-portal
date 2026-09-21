import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { Save, Camera, User, MapPin, Briefcase, BookOpen, Phone, Heart, X } from 'lucide-react'

const ALL_MINISTRIES = [
  { name: 'Prayer Ministry', desc: 'Intercession, prayer meetings and spiritual warfare' },
  { name: 'Music Ministry', desc: 'Praise & worship, choir, band and music production' },
  { name: 'Missions & Evangelism Ministry', desc: 'Campus outreach, Hope Ministry and Integral Mission' },
  { name: 'Bible Study & Training Ministry', desc: 'Small groups, BEST-P and discipleship classes' },
  { name: 'Discipleship Ministry', desc: 'Nurturing, accountability groups and years fellowships' },
  { name: 'Creative Arts Ministry', desc: 'Drama, dance, spoken word and creative expression' },
  { name: 'Technical & Media Ministry', desc: 'Sound, media, digital content and publicity' },
  { name: 'Hospitality Ministry', desc: 'Welcoming, visitor care and fellowship events' },
  { name: 'Welfare Committee', desc: 'Member support, counselling and pastoral care' },
]

const COUNTIES = ['Baringo','Bomet','Bungoma','Busia','Elgeyo-Marakwet','Embu','Garissa','Homa Bay','Isiolo','Kajiado','Kakamega','Kericho','Kiambu','Kilifi','Kirinyaga','Kisii','Kisumu','Kitui','Kwale','Laikipia','Lamu','Machakos','Makueni','Mandera','Marsabit','Meru','Migori','Mombasa',"Murang'a",'Nairobi','Nakuru','Nandi','Narok','Nyamira','Nyandarua','Nyeri','Samburu','Siaya','Taita-Taveta','Tana River','Tharaka-Nithi','Trans Nzoia','Turkana','Uasin Gishu','Vihiga','Wajir','West Pokot']

export default function AssociateProfileEdit() {
  const { user } = useAuth()
  const [form, setForm] = useState({
    phone: '', county: '', occupation: '', course_studied: '', primary_ministry: '',
  })
  const [saving, setSaving] = useState(false)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoRef = useRef(null)

  useEffect(() => {
    if (user) {
      setForm({
        phone: user.phone || '',
        county: user.county || '',
        occupation: user.occupation || '',
        course_studied: user.course_studied || '',
        primary_ministry: user.primary_ministry || '',
      })
      setPhotoPreview(user.photo_url || '')
    }
  }, [user])

  const validatePhone = (phone) => {
    const cleaned = phone.replace(/\s/g, '')
    return !phone || /^(\+254|0)[17]\d{8}$/.test(cleaned) || /^0[0-9]{9}$/.test(cleaned)
  }

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const uploadPhoto = async () => {
    if (!photoFile) return
    setUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.append('photo', photoFile)
      await api.post('/upload/photo', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Photo updated!')
      setPhotoFile(null)
    } catch { toast.error('Photo upload failed') }
    finally { setUploadingPhoto(false) }
  }

  const save = async () => {
    if (form.phone && !validatePhone(form.phone)) {
      return toast.error('Please enter a valid Kenyan phone number (e.g. 0712345678)')
    }
    setSaving(true)
    try {
      if (photoFile) await uploadPhoto()
      await api.put(`/users/profile`, {
        phone: form.phone || null,
        county: form.county || null,
        occupation: form.occupation || null,
        course_studied: form.course_studied || null,
        primary_ministry: form.primary_ministry || null,
      })
      toast.success('Profile updated successfully!')
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save') }
    finally { setSaving(false) }
  }

  const photoUrl = photoPreview || user?.photo_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'A')}&background=04003D&color=FF9700&size=200&bold=true`

  return (
    <div className="max-w-2xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Associate Member — {user?.mutcu_number}</p>
        </div>
      </div>

      {/* Photo */}
      <div className="card p-5 mb-5">
        <h2 className="font-montserrat font-bold text-navy text-sm mb-4 flex items-center gap-2">
          <User size={14} className="text-orange" /> Profile Photo
        </h2>
        <div className="flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <img src={photoUrl} alt={user?.name}
              className="w-20 h-20 rounded-full object-cover border-2 border-orange" />
            <button onClick={() => photoRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-orange rounded-full flex items-center justify-center shadow-sm hover:bg-orange/80">
              <Camera size={13} className="text-white" />
            </button>
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
          </div>
          <div>
            <div className="font-montserrat font-bold text-navy">{user?.name}</div>
            <div className="text-xs text-gray-400 mt-0.5">{user?.email}</div>
            <div className="text-xs text-orange font-semibold mt-1">{user?.mutcu_number} · Associate Member</div>
            {photoFile && (
              <div className="text-xs text-teal mt-1 flex items-center gap-1">
                <Camera size={11} /> {photoFile.name} — will upload on save
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contact Details */}
      <div className="card p-5 mb-5">
        <h2 className="font-montserrat font-bold text-navy text-sm mb-4 flex items-center gap-2">
          <Phone size={14} className="text-orange" /> Contact Details
        </h2>
        <div className="space-y-3">
          <div>
            <label className="form-label">Phone Number</label>
            <input className="form-input" placeholder="e.g. 0712345678 or +254712345678"
              value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            {form.phone && !validatePhone(form.phone) && (
              <p className="text-xs text-red mt-1">Please enter a valid Kenyan phone number</p>
            )}
          </div>
          <div>
            <label className="form-label">County of Residence</label>
            <select className="form-select" value={form.county} onChange={e => setForm(f => ({ ...f, county: e.target.value }))}>
              <option value="">Select county...</option>
              {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Professional Details */}
      <div className="card p-5 mb-5">
        <h2 className="font-montserrat font-bold text-navy text-sm mb-4 flex items-center gap-2">
          <Briefcase size={14} className="text-orange" /> Professional Details
        </h2>
        <div className="space-y-3">
          <div>
            <label className="form-label">Current Occupation</label>
            <input className="form-input" placeholder="e.g. Software Engineer, Teacher, Graduate Student"
              value={form.occupation} onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Course / Programme Studied at MUT</label>
            <input className="form-input" placeholder="e.g. BSc Computer Science, Diploma in Business"
              value={form.course_studied} onChange={e => setForm(f => ({ ...f, course_studied: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Ministry Support */}
      <div className="card p-5 mb-5">
        <h2 className="font-montserrat font-bold text-navy text-sm mb-1 flex items-center gap-2">
          <Heart size={14} className="text-orange" /> How Would You Like to Support MUTCU?
        </h2>
        <p className="text-xs text-gray-400 mb-4">Select the ministry that aligns with your gifts and availability as an alumnus.</p>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          <div onClick={() => setForm(f => ({ ...f, primary_ministry: '' }))}
            className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${!form.primary_ministry ? 'border-navy bg-navy/5' : 'border-gray-100 hover:border-gray-200'}`}>
            <div className="font-semibold text-navy text-sm">No preference yet</div>
            <div className="text-xs text-gray-400">I will decide later</div>
          </div>
          {ALL_MINISTRIES.map(m => (
            <div key={m.name} onClick={() => setForm(f => ({ ...f, primary_ministry: m.name }))}
              className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${form.primary_ministry === m.name ? 'border-orange bg-orange/5' : 'border-gray-100 hover:border-gray-200'}`}>
              <div className="font-semibold text-navy text-sm">{m.name}</div>
              <div className="text-xs text-gray-400">{m.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Read-only info */}
      <div className="card p-5 mb-5 bg-gray-50">
        <h2 className="font-montserrat font-bold text-navy text-sm mb-3">MUT Alumni Details (Read-only)</h2>
        <div className="space-y-2 text-sm">
          {[
            ['Year Completed at MUT', user?.year_completed || '—'],
            ['County at Registration', user?.county || '—'],
            ['Membership Type', 'Associate Member'],
            ['MUTCU Number', user?.mutcu_number || 'Pending'],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-400 text-xs font-semibold">{label}</span>
              <span className="text-navy text-xs font-semibold">{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <button onClick={save} disabled={saving || uploadingPhoto} className="btn-primary w-full justify-center mb-6">
        {saving || uploadingPhoto
          ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> {uploadingPhoto ? 'Uploading photo...' : 'Saving...'}</>
          : <><Save size={15} /> Save Profile</>}
      </button>

      {/* Change Password */}
      <div className="card p-4 text-center">
        <a href="/change-password" className="text-sm text-orange font-semibold hover:underline">Change Password</a>
      </div>
    </div>
  )
}