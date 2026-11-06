import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import {
  BookOpen, TrendingUp, Bookmark, Users, Eye,
  ArrowLeft, RefreshCw, BarChart3, PieChart,
  Star, Tag, Award, Activity
} from 'lucide-react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
)

// ─── Category colours (matches Library.jsx) ───────────────────
const CAT_COLORS = {
  Faith:         { bg: '#3b82f6', light: '#eff6ff' },
  Leadership:    { bg: '#f59e0b', light: '#fffbeb' },
  Purpose:       { bg: '#22c55e', light: '#f0fdf4' },
  Relationships: { bg: '#f43f5e', light: '#fff1f2' },
}
const getCatColor = (cat) => CAT_COLORS[cat] || { bg: '#6b7280', light: '#f9fafb' }

// ─── Stat Card ────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = 'text-orange' }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gray-50`}>
        <Icon size={22} className={color} />
      </div>
      <div>
        <div className="font-montserrat font-bold text-2xl text-navy">{value}</div>
        <div className="text-xs font-semibold text-gray-500">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

// ─── Book Row ─────────────────────────────────────────────────
function BookRow({ rank, book, metric, metricLabel, metricIcon: Icon }) {
  const c = getCatColor(book.category)
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <span className="w-6 text-xs font-bold text-gray-300 text-center flex-shrink-0">{rank}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-navy truncate">{book.title}</p>
        <p className="text-xs text-gray-400 truncate">{book.author}</p>
      </div>
      <span
        className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
        style={{ background: c.light, color: c.bg }}
      >
        {book.category}
      </span>
      <div className="flex items-center gap-1 flex-shrink-0 text-xs font-bold text-gray-600 min-w-[40px] justify-end">
        <Icon size={11} className="text-gray-400" />
        {metric}
      </div>
    </div>
  )
}

// ─── Main Analytics Page ──────────────────────────────────────
export default function LibraryAnalytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview') // overview | books | categories

  const fetchAnalytics = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/library/analytics')
      setData(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAnalytics() }, [])

  // ── Chart configs ────────────────────────────────────────────
  const weeklyChart = data ? {
    labels: data.weekly_activity.labels,
    datasets: [{
      label: 'Bookmarks',
      data: data.weekly_activity.data,
      fill: true,
      borderColor: '#FF9700',
      backgroundColor: 'rgba(255,151,0,0.12)',
      borderWidth: 2.5,
      pointBackgroundColor: '#FF9700',
      pointRadius: 4,
      tension: 0.4,
    }],
  } : null

  const monthlyChart = data ? {
    labels: data.monthly_added.labels,
    datasets: [{
      label: 'Books Added',
      data: data.monthly_added.data,
      backgroundColor: 'rgba(4,0,61,0.85)',
      borderRadius: 8,
      borderSkipped: false,
    }],
  } : null

  const categoryDonut = data ? {
    labels: data.category_stats.map(c => c.name),
    datasets: [{
      data: data.category_stats.map(c => c.count),
      backgroundColor: data.category_stats.map(c => getCatColor(c.name).bg),
      borderWidth: 0,
      hoverOffset: 6,
    }],
  } : null

  const categoryViewsChart = data ? {
    labels: data.category_stats.map(c => c.name),
    datasets: [
      {
        label: 'Views',
        data: data.category_stats.map(c => c.views),
        backgroundColor: data.category_stats.map(c => getCatColor(c.name).bg),
        borderRadius: 6,
        borderSkipped: false,
      },
      {
        label: 'Bookmarks',
        data: data.category_stats.map(c => c.bookmarks),
        backgroundColor: data.category_stats.map(c => getCatColor(c.name).bg + '66'),
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  } : null

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#04003D',
        titleFont: { family: 'Montserrat', weight: 'bold', size: 12 },
        bodyFont: { family: 'Montserrat', size: 11 },
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { family: 'Montserrat', size: 11 } } },
      y: { grid: { color: '#f1f5f9' }, ticks: { font: { family: 'Montserrat', size: 11 } }, beginAtZero: true },
    },
  }

  const lineOptions = {
    ...chartOptions,
    plugins: { ...chartOptions.plugins, legend: { display: false } },
  }

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { font: { family: 'Montserrat', size: 11 }, padding: 16, usePointStyle: true },
      },
      tooltip: chartOptions.plugins.tooltip,
    },
    cutout: '65%',
  }

  const multiBarOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      legend: {
        display: true,
        position: 'top',
        labels: { font: { family: 'Montserrat', size: 11 }, usePointStyle: true, padding: 16 },
      },
    },
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange mx-auto mb-3" />
          <p className="text-sm text-gray-400 font-montserrat font-semibold">Loading analytics…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl border border-gray-100 p-8 max-w-sm w-full">
          <BarChart3 size={40} className="text-gray-200 mx-auto mb-3" />
          <h3 className="font-montserrat font-bold text-navy mb-2">Analytics Unavailable</h3>
          <p className="text-sm text-gray-400 mb-4">{error}</p>
          <button onClick={fetchAnalytics} className="px-5 py-2 bg-navy text-white rounded-xl text-sm font-bold hover:bg-navy/90">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const { summary, top_viewed, top_bookmarked, category_stats, monthly_added, weekly_activity } = data

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="bg-navy text-white px-4 py-6 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                to="/library"
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
              >
                <ArrowLeft size={16} />
              </Link>
              <div>
                <h1 className="font-montserrat font-bold text-lg">Library Analytics</h1>
                <p className="text-white/60 text-xs">Reading activity & engagement insights</p>
              </div>
            </div>
            <button
              onClick={fetchAnalytics}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl text-xs font-bold transition-colors"
            >
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* ── Summary Stats ───────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={BookOpen}  label="Total Books"      value={summary.total_books}      color="text-blue-500" />
          <StatCard icon={Eye}       label="Total Views"      value={summary.total_views}      color="text-orange" />
          <StatCard icon={Bookmark}  label="Total Bookmarks"  value={summary.total_bookmarks}  color="text-green-500" />
          <StatCard icon={Users}     label="Unique Readers"   value={summary.unique_readers}   color="text-purple-500" />
        </div>

        {/* ── Tabs ────────────────────────────────────────── */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1 mb-6 shadow-sm">
          {[
            { id: 'overview',    label: 'Overview',    icon: Activity },
            { id: 'books',       label: 'Top Books',   icon: Award },
            { id: 'categories',  label: 'Categories',  icon: Tag },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === id ? 'bg-navy text-white shadow-sm' : 'text-gray-500 hover:text-navy'
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Weekly bookmark activity */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-montserrat font-bold text-navy">Reading Activity</h3>
                  <p className="text-xs text-gray-400">Bookmarks saved — last 7 days</p>
                </div>
                <div className="w-8 h-8 bg-orange/10 rounded-lg flex items-center justify-center">
                  <Activity size={16} className="text-orange" />
                </div>
              </div>
              <div className="h-52">
                {weeklyChart && <Line data={weeklyChart} options={lineOptions} />}
              </div>
            </div>

            {/* Monthly books added */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-montserrat font-bold text-navy">Books Added</h3>
                  <p className="text-xs text-gray-400">New books per month — last 6 months</p>
                </div>
                <div className="w-8 h-8 bg-navy/10 rounded-lg flex items-center justify-center">
                  <BookOpen size={16} className="text-navy" />
                </div>
              </div>
              <div className="h-52">
                {monthlyChart && <Bar data={monthlyChart} options={chartOptions} />}
              </div>
            </div>

            {/* Category donut */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-montserrat font-bold text-navy">Category Distribution</h3>
                  <p className="text-xs text-gray-400">Books by category</p>
                </div>
                <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                  <PieChart size={16} className="text-green-500" />
                </div>
              </div>
              <div className="h-64">
                {categoryDonut && <Doughnut data={categoryDonut} options={donutOptions} />}
              </div>
            </div>
          </div>
        )}

        {/* ── TOP BOOKS TAB ───────────────────────────────── */}
        {activeTab === 'books' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Most Viewed */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-50">
                <div className="w-7 h-7 bg-orange/10 rounded-lg flex items-center justify-center">
                  <Eye size={14} className="text-orange" />
                </div>
                <div>
                  <h3 className="font-montserrat font-bold text-navy text-sm">Most Viewed</h3>
                  <p className="text-xs text-gray-400">Top 10 by total views</p>
                </div>
              </div>
              <div>
                {top_viewed.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-6">No view data yet</p>
                ) : (
                  top_viewed.map((book, i) => (
                    <BookRow
                      key={book.id}
                      rank={i + 1}
                      book={book}
                      metric={book.view_count}
                      metricLabel="views"
                      metricIcon={Eye}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Most Bookmarked */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-50">
                <div className="w-7 h-7 bg-green-50 rounded-lg flex items-center justify-center">
                  <Bookmark size={14} className="text-green-500" />
                </div>
                <div>
                  <h3 className="font-montserrat font-bold text-navy text-sm">Most Bookmarked</h3>
                  <p className="text-xs text-gray-400">Top 10 by saves</p>
                </div>
              </div>
              <div>
                {top_bookmarked.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-6">No bookmark data yet</p>
                ) : (
                  top_bookmarked.map((book, i) => (
                    <BookRow
                      key={book.id}
                      rank={i + 1}
                      book={book}
                      metric={book.bookmark_count}
                      metricLabel="saves"
                      metricIcon={Bookmark}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── CATEGORIES TAB ──────────────────────────────── */}
        {activeTab === 'categories' && (
          <div className="space-y-5">
            {/* Category cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {category_stats.map(cat => {
                const c = getCatColor(cat.name)
                return (
                  <div
                    key={cat.name}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
                    style={{ borderLeftColor: c.bg, borderLeftWidth: 3 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: c.light, color: c.bg }}
                      >
                        {cat.name}
                      </span>
                      <span className="font-montserrat font-bold text-xl text-navy">{cat.count}</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Eye size={10} /> Views</span>
                        <span className="font-bold text-navy">{cat.views}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Bookmark size={10} /> Saves</span>
                        <span className="font-bold text-navy">{cat.bookmarks}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Avg views/book</span>
                        <span className="font-bold text-navy">
                          {cat.count > 0 ? Math.round(cat.views / cat.count) : 0}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Category views vs bookmarks chart */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-montserrat font-bold text-navy">Views vs Bookmarks by Category</h3>
                  <p className="text-xs text-gray-400">Engagement comparison across categories</p>
                </div>
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                  <BarChart3 size={16} className="text-blue-500" />
                </div>
              </div>
              <div className="h-64">
                {categoryViewsChart && <Bar data={categoryViewsChart} options={multiBarOptions} />}
              </div>
            </div>

            {/* Category popularity table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-montserrat font-bold text-navy mb-4 pb-3 border-b border-gray-50">
                Category Summary Table
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 font-bold uppercase tracking-wide">
                      <th className="text-left pb-3">Category</th>
                      <th className="text-right pb-3">Books</th>
                      <th className="text-right pb-3">Total Views</th>
                      <th className="text-right pb-3">Total Saves</th>
                      <th className="text-right pb-3">Avg Views</th>
                      <th className="text-right pb-3">Engagement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {category_stats
                      .sort((a, b) => b.views - a.views)
                      .map(cat => {
                        const c = getCatColor(cat.name)
                        const avgViews = cat.count > 0 ? Math.round(cat.views / cat.count) : 0
                        const engagement = cat.views > 0
                          ? Math.round((cat.bookmarks / cat.views) * 100)
                          : 0
                        return (
                          <tr key={cat.name} className="border-t border-gray-50">
                            <td className="py-3">
                              <span
                                className="text-xs font-bold px-2.5 py-1 rounded-full"
                                style={{ background: c.light, color: c.bg }}
                              >
                                {cat.name}
                              </span>
                            </td>
                            <td className="text-right py-3 font-bold text-navy">{cat.count}</td>
                            <td className="text-right py-3 text-gray-600">{cat.views}</td>
                            <td className="text-right py-3 text-gray-600">{cat.bookmarks}</td>
                            <td className="text-right py-3 text-gray-600">{avgViews}</td>
                            <td className="text-right py-3">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                engagement >= 20 ? 'bg-green-50 text-green-600' :
                                engagement >= 10 ? 'bg-amber-50 text-amber-600' :
                                'bg-gray-50 text-gray-500'
                              }`}>
                                {engagement}%
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}