import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { ArrowLeft, Upload } from 'lucide-react'

export default function MembersImport() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    if (!file) return toast.error('Please select a CSV file')
    setLoading(true)
    const fd = new FormData(); fd.append('csv_file', file)
    try {
      const { data } = await api.post('/members/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success(data.message || 'Import successful')
    } catch (err) { toast.error(err.response?.data?.error || 'Import failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="page-header"><div><Link to="/secretary/members" className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-2"><ArrowLeft size={12} />Back</Link><h1 className="page-title">Import Members</h1></div></div>
      <div className="card p-5 mb-5">
        <h3 className="font-montserrat font-bold text-navy text-sm mb-2">CSV Format</h3>
        <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs text-navy mb-2">name,email,student_id,gender,year_of_study,membership_type,primary_ministry</div>
        <div className="text-xs text-gray-500 space-y-1">
          <div><strong>membership_type:</strong> full, special, or associate</div>
          <div><strong>gender:</strong> male or female</div>
          <div><strong>year_of_study:</strong> 1 through 6</div>
        </div>
      </div>
      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">CSV File *</label>
            <input type="file" accept=".csv,.txt" className="form-input" onChange={e => setFile(e.target.files[0])} required />
          </div>
          <button type="submit" disabled={loading} className="btn-primary"><Upload size={15} />{loading ? 'Importing...' : 'Import Members'}</button>
        </form>
      </div>
    </div>
  )
}
