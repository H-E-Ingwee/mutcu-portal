import { useEffect, useState } from 'react'
import api from '../lib/api'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement } from 'chart.js'
import { Doughnut, Bar, Line } from 'react-chartjs-2'
import { Download } from 'lucide-react'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement)

const COLORS = ['#04003D','#FF9700','#30D5C8','#FF1229','#6B7280','#9CA3AF','#1E40AF','#065F46','#7C3AED']

export default function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { api.get('/analytics').then(r => setData(r.data)).finally(() => setLoading(false)) }, [])

  const exportMembers = async () => {
    try {
      const response = await api.get('/admin/export/members', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a'); link.href=url; link.setAttribute('download','mutcu-members.csv'); document.body.appendChild(link); link.click(); link.remove()
    } catch (err) { alert('Export failed') }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" /></div>
  if (!data) return null

  const { stats, ministryData, yearData, genderData, schoolData, nominationStats, currentEC } = data

  const ministryChart = { labels: ministryData?.map(m=>m.name.replace(' Ministry',''))||[], datasets: [{ data: ministryData?.map(m=>m.count)||[], backgroundColor: COLORS, borderWidth: 2, borderColor: '#fff' }] }
  const yearChart = { labels: yearData?.map(y=>`Year ${y.year}`)||[], datasets: [{ label:'Members', data: yearData?.map(y=>y.count)||[], backgroundColor: '#30D5C8', borderRadius: 6 }] }
  const genderChart = { labels: ['Male','Female'], datasets: [{ data: [genderData?.male||0, genderData?.female||0], backgroundColor: ['#04003D','#FF9700'], borderWidth: 2, borderColor: '#fff' }] }
  const schoolChart = { labels: schoolData?.map(s=>s.school)||[], datasets: [{ label:'Members', data: schoolData?.map(s=>s.count)||[], backgroundColor: '#FF9700', borderRadius: 6 }] }

  const chartOptions = { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
  const doughnutOptions = { responsive: true, plugins: { legend: { position: 'right', labels: { font: { family: 'Lato', size: 11 }, padding: 12 } } } }

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Analytics Dashboard</h1><p className="page-subtitle">Membership and nomination data insights</p></div>
        <button onClick={exportMembers} className="btn-outline btn-sm"><Download size={14} />Export Members CSV</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label:'Total Members', value:stats?.total||0, color:'text-navy' },
          { label:'Active Members', value:stats?.active||0, color:'text-teal' },
          { label:'Male Members', value:genderData?.male||0, color:'text-navy' },
          { label:'Female Members', value:genderData?.female||0, color:'text-orange' },
        ].map((s,i) => (
          <div key={i} className="card p-4 text-center">
            <div className={`text-2xl font-montserrat font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs font-montserrat font-semibold text-gray-400 uppercase tracking-wide mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card"><div className="card-header"><h2 className="font-montserrat font-bold text-navy text-sm">Ministry Distribution</h2></div><div className="card-body"><Doughnut data={ministryChart} options={doughnutOptions} /></div></div>
        <div className="card"><div className="card-header"><h2 className="font-montserrat font-bold text-navy text-sm">Year of Study Distribution</h2></div><div className="card-body"><Bar data={yearChart} options={chartOptions} /></div></div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card"><div className="card-header"><h2 className="font-montserrat font-bold text-navy text-sm">Gender Ratio</h2></div><div className="card-body"><Doughnut data={genderChart} options={{...doughnutOptions, plugins:{...doughnutOptions.plugins, legend:{position:'bottom',labels:{font:{family:'Lato',size:12}}}}}} /></div></div>
        <div className="card"><div className="card-header"><h2 className="font-montserrat font-bold text-navy text-sm">School Distribution</h2></div><div className="card-body"><Bar data={schoolChart} options={chartOptions} /></div></div>
      </div>

      {/* Nomination Stats */}
      {nominationStats && (
        <div className="card mb-6">
          <div className="card-header"><h2 className="font-montserrat font-bold text-navy text-sm">Nomination Participation — {nominationStats.cycle}</h2></div>
          <div className="card-body">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[['Eligible Members',nominationStats.eligible],['Participated',nominationStats.participated],['Participation Rate',`${nominationStats.rate}%`],['Total Recommendations',nominationStats.total_recs]].map(([label,value],i) => (
                <div key={i} className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="text-2xl font-montserrat font-bold text-navy">{value}</div>
                  <div className="text-xs font-montserrat font-semibold text-gray-400 uppercase tracking-wide mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Current EC */}
      {currentEC?.length > 0 && (
        <div className="card">
          <div className="card-header"><h2 className="font-montserrat font-bold text-navy text-sm">Current Executive Council</h2></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Position</th><th>Member</th><th>Ministry</th></tr></thead>
              <tbody>
                {currentEC.map((appt,i) => {
                  const photoUrl = appt.user?.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(appt.user?.name||'M')}&background=04003D&color=FF9700&size=200&bold=true`
                  return (
                    <tr key={i}>
                      <td className="font-bold text-navy text-sm">{appt.position?.title}</td>
                      <td><div className="flex items-center gap-2.5"><img src={photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" /><span className="font-semibold text-navy text-sm">{appt.user?.name}</span></div></td>
                      <td className="text-sm text-gray-500">{appt.user?.primary_ministry||'General'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
