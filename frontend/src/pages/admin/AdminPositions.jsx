import { useEffect, useState } from 'react'
import api from '../../lib/api'

export default function AdminPositions() {
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { api.get('/positions').then(r => setPositions(r.data.positions||[])).finally(() => setLoading(false)) }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>

  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">EC Positions</h1><p className="page-subtitle">The 13 Executive Council positions defined in the MUTCU Constitution</p></div></div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Position</th><th>Gender Constraint</th><th>Max Terms</th><th>Status</th></tr></thead>
            <tbody>
              {positions.map(pos => (
                <tr key={pos.id}>
                  <td className="text-gray-400 text-sm">{pos.display_order}</td>
                  <td><div className="font-bold text-navy text-sm">{pos.title}</div></td>
                  <td>{pos.gender_constraint ? <span className="badge badge-navy">{pos.gender_constraint}</span> : <span className="text-gray-400 text-sm">Any</span>}</td>
                  <td className="text-sm text-gray-500">{pos.chair_max_one_term ? '1 term (Chair)' : `${pos.max_terms} terms`}</td>
                  <td>{pos.is_active ? <span className="badge badge-teal">Active</span> : <span className="badge badge-gray">Inactive</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
