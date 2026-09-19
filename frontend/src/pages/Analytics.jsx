import { useEffect, useState, useRef } from 'react'
import api from '../lib/api'
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler
} from 'chart.js'
import { Doughnut, Bar, Line } from 'react-chartjs-2'
import { Download, Printer, RefreshCw, Users, TrendingUp, Award, Filter, FileText } from 'lucide-react'
import jsPDF from 'jspdf'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler)

const COLORS = ['#04003D','#FF9700','#30D5C8','#FF1229','#6B7280','#9CA3AF','#1E40AF','#065F46','#7C3AED']

export default function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [sortMinistry, setSortMinistry] = useState('count')
  const [sortSchool, setSortSchool] = useState('count')
  const [genderFilter, setGenderFilter] = useState('all')
  const [growthData, setGrowthData] = useState(null)
  const [attendanceData, setAttendanceData] = useState(null)
  const printRef = useRef(null)

  const fetchData = () => {
    setLoading(true)
    Promise.all([
      api.get('/analytics'),
      api.get('/analytics/growth').catch(() => ({ data: null })),
      api.get('/analytics/attendance').catch(() => ({ data: null })),
    ]).then(([mainRes, growthRes, attendRes]) => {
      setData(mainRes.data)
      if (growthRes.data) setGrowthData(growthRes.data)
      if (attendRes.data) setAttendanceData(attendRes.data)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const downloadReport = async (endpoint, filename) => {
    setExporting(true)
    try {
      const response = await api.get(endpoint, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      alert('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const exportCSV = () => downloadReport('/analytics/export/members', `MUTCU-Members-${new Date().toISOString().split('T')[0]}.csv`)

  // ── PDF Export ────────────────────────────────────────────────────────────────
  const exportPDF = (reportLabel) => {
    if (!data) return
    const { stats, ministryData, yearData, genderData } = data
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    const pageW = doc.internal.pageSize.getWidth()

    // Header
    doc.setFillColor(4, 0, 61)
    doc.rect(0, 0, pageW, 28, 'F')
    doc.setTextColor(255, 151, 0)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('MUTCU DMS', 14, 12)
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(11)
    doc.text(`Analytics Report — ${reportLabel}`, 14, 20)
    doc.setFontSize(8)
    doc.setTextColor(200, 200, 200)
    doc.text(`Generated: ${date}`, pageW - 14, 20, { align: 'right' })

    let y = 38

    // Stats summary
    doc.setTextColor(4, 0, 61)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Membership Overview', 14, y); y += 7

    const statItems = [
      ['Total Members', stats?.total_members || 0],
      ['Active Members', stats?.active_members || 0],
      ['Pending Approval', stats?.pending_members || 0],
      ['Full Members', stats?.full_members || 0],
    ]
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    statItems.forEach(([label, val], i) => {
      const x = 14 + (i % 2) * 90
      if (i % 2 === 0 && i > 0) y += 8
      doc.setTextColor(100, 100, 100)
      doc.text(label + ':', x, y)
      doc.setTextColor(4, 0, 61)
      doc.setFont('helvetica', 'bold')
      doc.text(String(val), x + 45, y)
      doc.setFont('helvetica', 'normal')
    })
    y += 14

    // Gender breakdown
    if (genderData) {
      doc.setFillColor(245, 247, 250)
      doc.rect(14, y - 4, pageW - 28, 18, 'F')
      doc.setTextColor(4, 0, 61)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('Gender', 18, y + 2)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 80)
      doc.text(`Male: ${genderData.male || 0}  |  Female: ${genderData.female || 0}`, 18, y + 9)
      y += 24
    }

    // Ministry breakdown
    if (ministryData?.length > 0) {
      doc.setTextColor(4, 0, 61)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text('Ministry Distribution', 14, y); y += 7
      doc.setFontSize(9)
      ministryData.slice(0, 12).forEach((m, i) => {
        if (y > 260) { doc.addPage(); y = 20 }
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(60, 60, 60)
        doc.text(`${i + 1}. ${m.ministry || 'General'}`, 18, y)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(4, 0, 61)
        doc.text(String(m.count), pageW - 18, y, { align: 'right' })
        y += 6
      })
      y += 6
    }

    // Year of study
    if (yearData?.length > 0) {
      if (y > 240) { doc.addPage(); y = 20 }
      doc.setTextColor(4, 0, 61)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text('Year of Study', 14, y); y += 7
      doc.setFontSize(9)
      yearData.forEach(yr => {
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(60, 60, 60)
        doc.text(`Year ${yr.year}`, 18, y)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(4, 0, 61)
        doc.text(String(yr.count), pageW - 18, y, { align: 'right' })
        y += 6
      })
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFillColor(245, 247, 250)
      doc.rect(0, 285, pageW, 12, 'F')
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text('Inspire Love, Hope & Godliness  ·  portal.mutcu.org', 14, 292)
      doc.text(`Page ${i} of ${pageCount}`, pageW - 14, 292, { align: 'right' })
    }

    doc.save(`MUTCU-Analytics-${reportLabel.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const REPORT_TYPES = [
    { label: 'Full Members Report', endpoint: '/analytics/export/members', file: 'MUTCU-Members', icon: 'fa-users', desc: 'All member details — name, email, ministry, year, status' },
    { label: 'Ministry Distribution', endpoint: '/analytics/export/ministry', file: 'MUTCU-Ministry', icon: 'fa-church', desc: 'Members grouped by ministry' },
    { label: 'Academic Report', endpoint: '/analytics/export/academic', file: 'MUTCU-Academic', icon: 'fa-graduation-cap', desc: 'Year of study, course type, school distribution' },
    { label: 'Nominations Report', endpoint: '/analytics/export/nominations', file: 'MUTCU-Nominations', icon: 'fa-vote-yea', desc: 'Recommendations and candidates for active cycle' },
    { label: 'Leadership History', endpoint: '/analytics/export/leadership', file: 'MUTCU-Leadership', icon: 'fa-crown', desc: 'All EC appointments and leadership history' },
    { label: 'Disciplinary Cases', endpoint: '/analytics/export/disciplinary', file: 'MUTCU-Disciplinary', icon: 'fa-gavel', desc: 'All disciplinary cases and outcomes' },
  ]

  // ── Print branded report ────────────────────────────────────────────────────
  const printReport = () => {
    const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>MUTCU Analytics Report — ${date}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #1a1a2e; background: #fff; }
          .header { background: linear-gradient(135deg, #04003D, #0a0060); color: white; padding: 28px 40px; display: flex; align-items: center; justify-content: space-between; }
          .header-left h1 { font-size: 22px; font-weight: 800; color: #FF9700; letter-spacing: 1px; }
          .header-left p { font-size: 10px; color: rgba(255,255,255,0.5); letter-spacing: 2px; text-transform: uppercase; margin-top: 3px; }
          .header-right { text-align: right; font-size: 10px; color: rgba(255,255,255,0.5); }
          .header-right strong { display: block; color: rgba(255,255,255,0.8); font-size: 12px; }
          .body { padding: 32px 40px; }
          .section-title { font-size: 13px; font-weight: 800; color: #04003D; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #FF9700; padding-bottom: 6px; margin: 24px 0 14px; }
          .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
          .stat-box { background: #F5F7FA; border-radius: 8px; padding: 14px; text-align: center; border-top: 3px solid #04003D; }
          .stat-box.orange { border-top-color: #FF9700; }
          .stat-box.teal { border-top-color: #30D5C8; }
          .stat-box.red { border-top-color: #FF1229; }
          .stat-num { font-size: 26px; font-weight: 800; color: #04003D; }
          .stat-label { font-size: 9px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 1px; margin-top: 3px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #04003D; color: #FF9700; padding: 8px 12px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; }
          td { padding: 7px 12px; border-bottom: 1px solid #F0F0F0; color: #374151; }
          tr:nth-child(even) td { background: #FAFAFA; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 9px; font-weight: 700; }
          .badge-navy { background: #04003D; color: #FF9700; }
          .badge-orange { background: #FF9700; color: #fff; }
          .badge-teal { background: #30D5C8; color: #fff; }
          .progress-bar { background: #E5E7EB; border-radius: 4px; height: 8px; overflow: hidden; }
          .progress-fill { background: linear-gradient(90deg, #04003D, #FF9700); height: 100%; border-radius: 4px; }
          .footer { background: #F5F7FA; padding: 16px 40px; text-align: center; font-size: 9px; color: #9CA3AF; border-top: 1px solid #E5E7EB; margin-top: 32px; }
          .footer strong { color: #FF9700; }
          .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <h1>MUTCU DMS</h1>
            <p>Murang'a University of Technology Christian Union</p>
          </div>
          <div class="header-right">
            <strong>Analytics Report</strong>
            Generated: ${date}<br>
            Inspire Love, Hope & Godliness
          </div>
        </div>

        <div class="body">
          <!-- Stats -->
          <div class="section-title">Membership Overview</div>
          <div class="stats-grid">
            <div class="stat-box">
              <div class="stat-num">${data?.stats?.total || 0}</div>
              <div class="stat-label">Total Members</div>
            </div>
            <div class="stat-box orange">
              <div class="stat-num">${data?.stats?.active || 0}</div>
              <div class="stat-label">Active Members</div>
            </div>
            <div class="stat-box teal">
              <div class="stat-num">${data?.genderData?.male || 0}</div>
              <div class="stat-label">Male Members</div>
            </div>
            <div class="stat-box red">
              <div class="stat-num">${data?.genderData?.female || 0}</div>
              <div class="stat-label">Female Members</div>
            </div>
          </div>

          <div class="two-col">
            <!-- Ministry Distribution -->
            <div>
              <div class="section-title">Ministry Distribution</div>
              <table>
                <thead><tr><th>#</th><th>Ministry</th><th>Members</th><th>Share</th></tr></thead>
                <tbody>
                  ${(sortedMinistry(data?.ministryData, sortMinistry)).map((m, i) => {
                    const total = data?.stats?.active || 1
                    const pct = Math.round(m.count / total * 100)
                    return `<tr>
                      <td>${i + 1}</td>
                      <td>${m.name.replace(' Ministry', '')}</td>
                      <td><span class="badge badge-navy">${m.count}</span></td>
                      <td>
                        <div style="display:flex;align-items:center;gap:6px;">
                          <div class="progress-bar" style="width:60px;"><div class="progress-fill" style="width:${pct}%;"></div></div>
                          <span style="font-size:9px;color:#6B7280;">${pct}%</span>
                        </div>
                      </td>
                    </tr>`
                  }).join('')}
                </tbody>
              </table>
            </div>

            <!-- School Distribution -->
            <div>
              <div class="section-title">School Distribution</div>
              <table>
                <thead><tr><th>#</th><th>School</th><th>Members</th><th>Share</th></tr></thead>
                <tbody>
                  ${(sortedSchool(data?.schoolData, sortSchool)).map((s, i) => {
                    const total = data?.stats?.active || 1
                    const pct = Math.round(s.count / total * 100)
                    return `<tr>
                      <td>${i + 1}</td>
                      <td>${s.school}</td>
                      <td><span class="badge badge-orange">${s.count}</span></td>
                      <td>
                        <div style="display:flex;align-items:center:gap:6px;">
                          <div class="progress-bar" style="width:60px;"><div class="progress-fill" style="width:${pct}%;"></div></div>
                          <span style="font-size:9px;color:#6B7280;">${pct}%</span>
                        </div>
                      </td>
                    </tr>`
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Year Distribution -->
          <div class="section-title">Year of Study Distribution</div>
          <table>
            <thead><tr><th>Year of Study</th><th>Members</th><th>Distribution</th></tr></thead>
            <tbody>
              ${(data?.yearData || []).map(y => {
                const total = data?.stats?.active || 1
                const pct = Math.round(y.count / total * 100)
                return `<tr>
                  <td>Year ${y.year}</td>
                  <td><span class="badge badge-teal">${y.count}</span></td>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px;">
                      <div class="progress-bar" style="width:120px;"><div class="progress-fill" style="width:${pct}%;"></div></div>
                      <span style="font-size:9px;color:#6B7280;">${pct}%</span>
                    </div>
                  </td>
                </tr>`
              }).join('')}
            </tbody>
          </table>

          <!-- Gender -->
          <div class="section-title">Gender Breakdown</div>
          <table>
            <thead><tr><th>Gender</th><th>Count</th><th>Percentage</th></tr></thead>
            <tbody>
              ${[['Male', data?.genderData?.male || 0], ['Female', data?.genderData?.female || 0]].map(([g, c]) => {
                const total = (data?.genderData?.male || 0) + (data?.genderData?.female || 0) || 1
                const pct = Math.round(c / total * 100)
                return `<tr>
                  <td>${g}</td>
                  <td><span class="badge badge-navy">${c}</span></td>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px;">
                      <div class="progress-bar" style="width:120px;"><div class="progress-fill" style="width:${pct}%;"></div></div>
                      <span style="font-size:9px;color:#6B7280;">${pct}%</span>
                    </div>
                  </td>
                </tr>`
              }).join('')}
            </tbody>
          </table>

          ${data?.nominationStats ? `
          <!-- Nomination Stats -->
          <div class="section-title">Nomination Participation — ${data.nominationStats.cycle}</div>
          <div class="stats-grid">
            <div class="stat-box"><div class="stat-num">${data.nominationStats.eligible}</div><div class="stat-label">Eligible Members</div></div>
            <div class="stat-box orange"><div class="stat-num">${data.nominationStats.participated}</div><div class="stat-label">Participated</div></div>
            <div class="stat-box teal"><div class="stat-num">${data.nominationStats.rate}%</div><div class="stat-label">Participation Rate</div></div>
            <div class="stat-box"><div class="stat-num">${data.nominationStats.total_recs}</div><div class="stat-label">Total Recommendations</div></div>
          </div>
          ` : ''}

          ${data?.currentEC?.length > 0 ? `
          <!-- Current EC -->
          <div class="section-title">Current Executive Council</div>
          <table>
            <thead><tr><th>#</th><th>Position</th><th>Member</th><th>Ministry</th></tr></thead>
            <tbody>
              ${data.currentEC.map((appt, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td><strong>${appt.position?.title}</strong></td>
                  <td>${appt.user?.name}</td>
                  <td>${appt.user?.primary_ministry || 'General'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          ` : ''}
        </div>

        <div class="footer">
          <strong>MUTCU Digital Management System v2.0</strong> &nbsp;·&nbsp;
          portal.mutcu.org &nbsp;·&nbsp;
          Report generated on ${date} &nbsp;·&nbsp;
          <em>Inspire Love, Hope & Godliness</em>
        </div>
      </body>
      </html>
    `
    const win = window.open('', '_blank')
    win.document.write(printContent)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 500)
  }

  // ── Sort helpers ────────────────────────────────────────────────────────────
  function sortedMinistry(arr, by) {
    if (!arr) return []
    return [...arr].sort((a, b) => by === 'name' ? a.name.localeCompare(b.name) : b.count - a.count)
  }
  function sortedSchool(arr, by) {
    if (!arr) return []
    return [...arr].sort((a, b) => by === 'name' ? a.school.localeCompare(b.school) : b.count - a.count)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange" />
    </div>
  )
  if (!data) return null

  const { stats, ministryData, yearData, genderData, schoolData, nominationStats, currentEC } = data

  const totalGender = (genderData?.male || 0) + (genderData?.female || 0) || 1
  const filteredMinistry = sortedMinistry(ministryData, sortMinistry)
  const filteredSchool = sortedSchool(schoolData, sortSchool)

  const ministryChart = {
    labels: filteredMinistry.map(m => m.name.replace(' Ministry', '')),
    datasets: [{ data: filteredMinistry.map(m => m.count), backgroundColor: COLORS, borderWidth: 2, borderColor: '#fff' }]
  }
  const yearChart = {
    labels: yearData?.map(y => `Year ${y.year}`) || [],
    datasets: [{ label: 'Members', data: yearData?.map(y => y.count) || [], backgroundColor: '#30D5C8', borderRadius: 6 }]
  }
  const genderChart = {
    labels: ['Male', 'Female'],
    datasets: [{ data: [genderData?.male || 0, genderData?.female || 0], backgroundColor: ['#04003D', '#FF9700'], borderWidth: 2, borderColor: '#fff' }]
  }
  const schoolChart = {
    labels: filteredSchool.map(s => s.school),
    datasets: [{ label: 'Members', data: filteredSchool.map(s => s.count), backgroundColor: '#FF9700', borderRadius: 6 }]
  }

  const chartOptions = { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
  const doughnutOptions = { responsive: true, plugins: { legend: { position: 'right', labels: { font: { family: 'Arial', size: 11 }, padding: 12 } } } }

  return (
    <div ref={printRef}>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics Dashboard</h1>
          <p className="page-subtitle">Membership and nomination data insights</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={fetchData} className="btn-outline btn-sm" title="Refresh">
            <RefreshCw size={14} />
          </button>
          <button onClick={printReport} className="btn-outline btn-sm">
            <Printer size={14} /> Print Report
          </button>
          <button onClick={exportCSV} disabled={exporting} className="btn-primary btn-sm">
            {exporting ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> : <Download size={14} />}
            {exporting ? 'Exporting...' : 'Export Members CSV'}
          </button>
        </div>
      </div>

      

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Members', value: stats?.total || 0, icon: Users, color: 'text-navy', border: 'border-t-navy' },
          { label: 'Active Members', value: stats?.active || 0, icon: TrendingUp, color: 'text-teal', border: 'border-t-teal' },
          { label: 'Male Members', value: genderData?.male || 0, icon: Users, color: 'text-navy', border: 'border-t-navy' },
          { label: 'Female Members', value: genderData?.female || 0, icon: Users, color: 'text-orange', border: 'border-t-orange' },
        ].map((s, i) => (
          <div key={i} className={`card p-4 text-center border-t-4 ${s.border}`}>
            <div className={`text-3xl font-montserrat font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs font-montserrat font-semibold text-gray-400 uppercase tracking-wide mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Charts Row 1 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <div className="card-header">
            <h2 className="font-montserrat font-bold text-navy text-sm">Ministry Distribution</h2>
            <div className="flex items-center gap-2">
              <Filter size={12} className="text-gray-400" />
              <select className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600"
                value={sortMinistry} onChange={e => setSortMinistry(e.target.value)}>
                <option value="count">By Count</option>
                <option value="name">By Name</option>
              </select>
            </div>
          </div>
          <div className="card-body"><Doughnut data={ministryChart} options={doughnutOptions} /></div>
        </div>
        <div className="card">
          <div className="card-header">
            <h2 className="font-montserrat font-bold text-navy text-sm">Year of Study Distribution</h2>
          </div>
          <div className="card-body"><Bar data={yearChart} options={chartOptions} /></div>
        </div>
      </div>

      {/* ── Charts Row 2 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <div className="card-header">
            <h2 className="font-montserrat font-bold text-navy text-sm">Gender Ratio</h2>
            <div className="flex gap-2 text-xs">
              <span className="badge badge-navy">♂ {genderData?.male || 0} ({Math.round((genderData?.male || 0) / totalGender * 100)}%)</span>
              <span className="badge badge-orange">♀ {genderData?.female || 0} ({Math.round((genderData?.female || 0) / totalGender * 100)}%)</span>
            </div>
          </div>
          <div className="card-body">
            <Doughnut data={genderChart} options={{ ...doughnutOptions, plugins: { ...doughnutOptions.plugins, legend: { position: 'bottom', labels: { font: { family: 'Arial', size: 12 } } } } }} />
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h2 className="font-montserrat font-bold text-navy text-sm">School Distribution</h2>
            <div className="flex items-center gap-2">
              <Filter size={12} className="text-gray-400" />
              <select className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600"
                value={sortSchool} onChange={e => setSortSchool(e.target.value)}>
                <option value="count">By Count</option>
                <option value="name">By Name</option>
              </select>
            </div>
          </div>
          <div className="card-body"><Bar data={schoolChart} options={chartOptions} /></div>
        </div>
      </div>

      <div className="card mb-6">
        <div className="card-header">
          <h2 className="font-montserrat font-bold text-navy text-sm">Ministry Breakdown</h2>
          <span className="text-xs text-gray-400">{filteredMinistry.length} ministries</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Ministry</th>
                <th>Members</th>
                <th>Share</th>
                <th>Distribution</th>
              </tr>
            </thead>
            <tbody>
              {filteredMinistry.map((m, i) => {
                const pct = Math.round(m.count / (stats?.active || 1) * 100)
                return (
                  <tr key={i}>
                    <td className="text-gray-400 text-xs">{i + 1}</td>
                    <td className="font-semibold text-navy text-sm">{m.name}</td>
                    <td><span className="badge badge-navy">{m.count}</span></td>
                    <td className="text-sm text-gray-500">{pct}%</td>
                    <td>
                      <div className="w-32 bg-gray-100 rounded-full h-2">
                        <div className="bg-gradient-to-r from-navy to-orange h-2 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Nomination Stats ── */}
      {nominationStats && (
        <div className="card mb-6">
          <div className="card-header">
            <h2 className="font-montserrat font-bold text-navy text-sm">
              Nomination Participation — {nominationStats.cycle}
            </h2>
            <Award size={16} className="text-orange" />
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {[
                ['Eligible Members', nominationStats.eligible, 'text-navy'],
                ['Participated', nominationStats.participated, 'text-teal'],
                ['Participation Rate', `${nominationStats.rate}%`, 'text-orange'],
                ['Total Recommendations', nominationStats.total_recs, 'text-navy'],
              ].map(([label, value, color], i) => (
                <div key={i} className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className={`text-2xl font-montserrat font-bold ${color}`}>{value}</div>
                  <div className="text-xs font-montserrat font-semibold text-gray-400 uppercase tracking-wide mt-1">{label}</div>
                </div>
              ))}
            </div>
            {/* Participation bar */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>Participation Rate</span>
                <span className="font-bold text-orange">{nominationStats.rate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-navy to-orange h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(nominationStats.rate, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0%</span><span>50%</span><span>100%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Current EC ── */}
      {currentEC?.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-montserrat font-bold text-navy text-sm">Current Executive Council</h2>
            <span className="badge badge-navy">{currentEC.length} members</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th>Position</th><th>Member</th><th>Ministry</th></tr>
              </thead>
              <tbody>
                {currentEC.map((appt, i) => {
                  const photoUrl = appt.user?.photo_url ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(appt.user?.name || 'M')}&background=04003D&color=FF9700&size=200&bold=true`
                  return (
                    <tr key={i}>
                      <td className="text-gray-400 text-xs">{i + 1}</td>
                      <td className="font-bold text-navy text-sm">{appt.position?.title}</td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <img src={photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                          <span className="font-semibold text-navy text-sm">{appt.user?.name}</span>
                        </div>
                      </td>
                      <td className="text-sm text-gray-500">{appt.user?.primary_ministry || 'General'}</td>
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