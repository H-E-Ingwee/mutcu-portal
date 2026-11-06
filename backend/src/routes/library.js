const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')
const { authenticate, requireRole } = require('../middleware/auth')

// ─── Roles ────────────────────────────────────────────────────
// Admin roles: can add/edit/delete books & articles, view analytics
const ADMIN_ROLES = [
  'super_admin', 'ec_admin', 'cu_secretary', 'vice_secretary',
]

// ─── Cover image generator ────────────────────────────────────
function getCoverUrl(title, category) {
  const colors = {
    Faith:         { bg: '04003D', text: 'FF9700' },
    Leadership:    { bg: '1a3a5c', text: 'f0a500' },
    Purpose:       { bg: '2d4a1e', text: 'a8d060' },
    Relationships: { bg: '5c1a1a', text: 'f0a0a0' },
  }
  const c = colors[category] || colors.Faith
  const short = title.length > 28 ? title.substring(0, 28) + '...' : title
  return `https://placehold.co/400x560/${c.bg}/${c.text}?font=montserrat&text=${encodeURIComponent(short)}`
}

// ─── GET /api/library/books ────────────────────────────────────
// Query params: categories (comma-sep), q, sort, page, limit,
//               date_from (YYYY-MM-DD), date_to (YYYY-MM-DD)
router.get('/books', authenticate, async (req, res) => {
  try {
    const {
      categories, q,
      sort = 'newest',
      page = 1, limit = 20,
      date_from, date_to,
    } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)

    let query = supabase
      .from('library_books')
      .select('*', { count: 'exact' })

    // Multi-category filter (comma-separated)
    if (categories && categories !== 'All') {
      const catList = categories.split(',').map(c => c.trim()).filter(Boolean)
      if (catList.length === 1) {
        query = query.eq('category', catList[0])
      } else if (catList.length > 1) {
        query = query.in('category', catList)
      }
    }

    // Full-text search on title + author + description
    if (q && q.trim()) {
      query = query.or(
        `title.ilike.%${q.trim()}%,author.ilike.%${q.trim()}%,description.ilike.%${q.trim()}%`
      )
    }

    // Date range filter (by created_at)
    if (date_from) query = query.gte('created_at', date_from)
    if (date_to)   query = query.lte('created_at', date_to + 'T23:59:59Z')

    // Sorting
    if (sort === 'popular' || sort === 'weekly') {
      query = query.order('view_count', { ascending: false })
    } else if (sort === 'az') {
      query = query.order('title', { ascending: true })
    } else if (sort === 'za') {
      query = query.order('title', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    query = query.range(offset, offset + parseInt(limit) - 1)

    const { data: books, error, count } = await query
    if (error) throw error

    // Bookmark status for current user
    const userId = req.user.id
    let bookmarkedIds = new Set()
    if (userId) {
      const { data: bm } = await supabase
        .from('library_bookmarks')
        .select('book_id')
        .eq('user_id', userId)
      if (bm) bm.forEach(b => bookmarkedIds.add(b.book_id))
    }

    const processed = (books || []).map(book => ({
      ...book,
      cover_url: book.cover_url || getCoverUrl(book.title, book.category),
      is_bookmarked: bookmarkedIds.has(book.id),
    }))

    res.json({
      books: processed,
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      has_more: offset + parseInt(limit) < (count || 0),
    })
  } catch (err) {
    console.error('[LIBRARY/BOOKS ERROR]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/library/books/featured ──────────────────────────
router.get('/books/featured', authenticate, async (req, res) => {
  try {
    const { data: books, error } = await supabase
      .from('library_books')
      .select('*')
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(6)
    if (error) throw error
    const processed = (books || []).map(book => ({
      ...book,
      cover_url: book.cover_url || getCoverUrl(book.title, book.category),
    }))
    res.json({ books: processed })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/library/search/suggestions ──────────────────────
// Autocomplete: returns matching titles + authors as user types
router.get('/search/suggestions', authenticate, async (req, res) => {
  try {
    const { q } = req.query
    if (!q || q.trim().length < 2) return res.json({ suggestions: [] })

    const term = q.trim()
    const { data, error } = await supabase
      .from('library_books')
      .select('id, title, author, category')
      .or(`title.ilike.%${term}%,author.ilike.%${term}%`)
      .order('view_count', { ascending: false })
      .limit(8)
    if (error) throw error

    const suggestions = []
    const seenAuthors = new Set()
    ;(data || []).forEach(b => {
      if (b.title.toLowerCase().includes(term.toLowerCase())) {
        suggestions.push({ type: 'title', text: b.title, sub: b.author, category: b.category, id: b.id })
      }
      if (b.author.toLowerCase().includes(term.toLowerCase()) && !seenAuthors.has(b.author)) {
        seenAuthors.add(b.author)
        suggestions.push({ type: 'author', text: b.author, sub: 'Author', category: b.category })
      }
    })

    res.json({ suggestions: suggestions.slice(0, 8) })
  } catch (err) {
    res.json({ suggestions: [] })
  }
})

// ─── GET /api/library/categories ──────────────────────────────
router.get('/categories', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('library_books')
      .select('category')
    if (error) throw error

    const counts = {}
    ;(data || []).forEach(b => {
      counts[b.category] = (counts[b.category] || 0) + 1
    })

    const categories = [
      { name: 'All', count: data?.length || 0 },
      ...Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count })),
    ]
    res.json({ categories })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/library/books/:id/view ─────────────────────────
router.post('/books/:id/view', authenticate, async (req, res) => {
  try {
    const { data: book } = await supabase
      .from('library_books')
      .select('view_count')
      .eq('id', req.params.id)
      .single()
    if (book) {
      await supabase
        .from('library_books')
        .update({ view_count: (book.view_count || 0) + 1 })
        .eq('id', req.params.id)
    }
    res.json({ ok: true })
  } catch {
    res.json({ ok: false })
  }
})

// ─── GET /api/library/bookmarks ───────────────────────────────
router.get('/bookmarks', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('library_bookmarks')
      .select('book_id, created_at, library_books(*)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
    if (error) throw error

    const books = (data || []).map(bm => ({
      ...bm.library_books,
      cover_url: bm.library_books?.cover_url || getCoverUrl(bm.library_books?.title || '', bm.library_books?.category || 'Faith'),
      bookmarked_at: bm.created_at,
      is_bookmarked: true,
    }))
    res.json({ books })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/library/bookmarks/toggle ───────────────────────
router.post('/bookmarks/toggle', authenticate, async (req, res) => {
  try {
    const { book_id } = req.body
    if (!book_id) return res.status(400).json({ error: 'book_id required' })

    const { data: existing } = await supabase
      .from('library_bookmarks')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('book_id', book_id)
      .single()

    if (existing) {
      await supabase.from('library_bookmarks').delete()
        .eq('user_id', req.user.id).eq('book_id', book_id)
      return res.json({ status: 'removed' })
    } else {
      await supabase.from('library_bookmarks').insert({ user_id: req.user.id, book_id })
      return res.json({ status: 'added' })
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/library/articles ────────────────────────────────
router.get('/articles', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('library_articles')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json({ articles: data || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/library/stats ───────────────────────────────────
router.get('/stats', authenticate, async (req, res) => {
  try {
    const [booksRes, articlesRes, bookmarksRes] = await Promise.all([
      supabase.from('library_books').select('id, category, view_count', { count: 'exact' }),
      supabase.from('library_articles').select('id', { count: 'exact' }),
      supabase.from('library_bookmarks').select('id', { count: 'exact' }).eq('user_id', req.user.id),
    ])

    const books = booksRes.data || []
    const categoryBreakdown = {}
    let totalViews = 0
    books.forEach(b => {
      categoryBreakdown[b.category] = (categoryBreakdown[b.category] || 0) + 1
      totalViews += b.view_count || 0
    })

    res.json({
      total_books: booksRes.count || 0,
      total_articles: articlesRes.count || 0,
      my_bookmarks: bookmarksRes.count || 0,
      total_views: totalViews,
      category_breakdown: categoryBreakdown,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/library/analytics ───────────────────────────────
// Admin-only: full analytics for the dashboard
router.get('/analytics', authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { data: books } = await supabase
      .from('library_books')
      .select('id, title, author, category, view_count, is_featured, created_at')
      .order('view_count', { ascending: false })

    const { data: allBookmarks } = await supabase
      .from('library_bookmarks')
      .select('book_id, created_at, user_id')

    const bookmarkCounts = {}
    ;(allBookmarks || []).forEach(bm => {
      bookmarkCounts[bm.book_id] = (bookmarkCounts[bm.book_id] || 0) + 1
    })

    const uniqueReaders = new Set((allBookmarks || []).map(b => b.user_id)).size

    // Category breakdown
    const categoryStats = {}
    ;(books || []).forEach(b => {
      if (!categoryStats[b.category]) {
        categoryStats[b.category] = { count: 0, views: 0, bookmarks: 0 }
      }
      categoryStats[b.category].count++
      categoryStats[b.category].views += b.view_count || 0
      categoryStats[b.category].bookmarks += bookmarkCounts[b.id] || 0
    })

    // Top 10 most viewed
    const topViewed = (books || []).slice(0, 10).map(b => ({
      id: b.id,
      title: b.title,
      author: b.author,
      category: b.category,
      view_count: b.view_count || 0,
      bookmark_count: bookmarkCounts[b.id] || 0,
    }))

    // Top 10 most bookmarked
    const topBookmarked = (books || [])
      .map(b => ({
        id: b.id,
        title: b.title,
        author: b.author,
        category: b.category,
        view_count: b.view_count || 0,
        bookmark_count: bookmarkCounts[b.id] || 0,
      }))
      .sort((a, b) => b.bookmark_count - a.bookmark_count)
      .slice(0, 10)

    // Books added per month (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
    sixMonthsAgo.setDate(1)

    const monthlyAdded = {}
    ;(books || []).forEach(b => {
      const d = new Date(b.created_at)
      if (d >= sixMonthsAgo) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        monthlyAdded[key] = (monthlyAdded[key] || 0) + 1
      }
    })

    const monthLabels = []
    const monthData = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthLabels.push(d.toLocaleString('default', { month: 'short', year: '2-digit' }))
      monthData.push(monthlyAdded[key] || 0)
    }

    // Weekly bookmark activity (last 7 days)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const weeklyBookmarks = {}
    ;(allBookmarks || []).forEach(bm => {
      const d = new Date(bm.created_at)
      if (d >= sevenDaysAgo) {
        const key = d.toISOString().split('T')[0]
        weeklyBookmarks[key] = (weeklyBookmarks[key] || 0) + 1
      }
    })

    const weeklyLabels = []
    const weeklyData = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      weeklyLabels.push(days[d.getDay()])
      weeklyData.push(weeklyBookmarks[key] || 0)
    }

    res.json({
      summary: {
        total_books: books?.length || 0,
        total_views: (books || []).reduce((s, b) => s + (b.view_count || 0), 0),
        total_bookmarks: allBookmarks?.length || 0,
        unique_readers: uniqueReaders,
      },
      top_viewed: topViewed,
      top_bookmarked: topBookmarked,
      category_stats: Object.entries(categoryStats).map(([name, s]) => ({ name, ...s })),
      monthly_added: { labels: monthLabels, data: monthData },
      weekly_activity: { labels: weeklyLabels, data: weeklyData },
    })
  } catch (err) {
    console.error('[LIBRARY/ANALYTICS ERROR]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── ADMIN: POST /api/library/books ───────────────────────────
router.post('/books', authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { title, author, category, description, cover_url, drive_link, is_featured } = req.body
    if (!title || !author || !category || !drive_link) {
      return res.status(400).json({ error: 'title, author, category, and drive_link are required' })
    }
    const { data, error } = await supabase
      .from('library_books')
      .insert({
        title, author, category,
        description: description || null,
        cover_url: cover_url || null,
        drive_link,
        is_featured: !!is_featured,
        added_by: req.user.id,
      })
      .select().single()
    if (error) throw error
    res.status(201).json({ book: data, message: 'Book added successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── ADMIN: PUT /api/library/books/:id ────────────────────────
router.put('/books/:id', authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { title, author, category, description, cover_url, drive_link, is_featured } = req.body
    const { data, error } = await supabase
      .from('library_books')
      .update({
        title, author, category,
        description: description || null,
        cover_url: cover_url || null,
        drive_link,
        is_featured: !!is_featured,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select().single()
    if (error) throw error
    res.json({ book: data, message: 'Book updated' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── ADMIN: DELETE /api/library/books/:id ─────────────────────
router.delete('/books/:id', authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { error } = await supabase.from('library_books').delete().eq('id', req.params.id)
    if (error) throw error
    res.json({ message: 'Book deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── ADMIN: POST /api/library/articles ────────────────────────
router.post('/articles', authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { title, author, abstract, link, date, read_time, is_featured } = req.body
    if (!title || !author || !link) {
      return res.status(400).json({ error: 'title, author, and link are required' })
    }
    const { data, error } = await supabase
      .from('library_articles')
      .insert({
        title, author,
        abstract: abstract || null,
        link, date: date || null,
        read_time: read_time || null,
        is_featured: !!is_featured,
        added_by: req.user.id,
      })
      .select().single()
    if (error) throw error
    res.status(201).json({ article: data, message: 'Article added successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── ADMIN: PUT /api/library/articles/:id ─────────────────────
router.put('/articles/:id', authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { title, author, abstract, link, date, read_time, is_featured } = req.body
    const { data, error } = await supabase
      .from('library_articles')
      .update({
        title, author,
        abstract: abstract || null,
        link, date: date || null,
        read_time: read_time || null,
        is_featured: !!is_featured,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select().single()
    if (error) throw error
    res.json({ article: data, message: 'Article updated' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── ADMIN: DELETE /api/library/articles/:id ──────────────────
router.delete('/articles/:id', authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { error } = await supabase.from('library_articles').delete().eq('id', req.params.id)
    if (error) throw error
    res.json({ message: 'Article deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router