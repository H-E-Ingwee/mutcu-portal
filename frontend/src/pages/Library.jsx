import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import {
  BookOpen, Search, ExternalLink, Star,
  Filter, ChevronDown, X, Bookmark, BookmarkCheck,
  Tag, TrendingUp, Library,
  RefreshCw, Plus, Trash2, Edit3, BarChart3,
  Calendar, CheckSquare, Square, SlidersHorizontal,
  BookMarked, Eye, AlertCircle, Shield, Maximize2, Minimize2
} from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Category colour map ──────────────────────────────────────
const CAT_COLORS = {
  Faith:         { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-500' },
  Leadership:    { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-500' },
  Purpose:       { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-500' },
  Relationships: { bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200',   dot: 'bg-rose-500' },
}
const getCat = (cat) => CAT_COLORS[cat] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-400' }

const COVER_COLORS = {
  Faith:         ['#04003D', '#FF9700'],
  Leadership:    ['#1a3a5c', '#f0a500'],
  Purpose:       ['#2d4a1e', '#a8d060'],
  Relationships: ['#5c1a1a', '#f0a0a0'],
}

const ALL_CATEGORIES = ['Faith', 'Leadership', 'Purpose', 'Relationships']

// ─── Convert Google Drive link to embeddable preview URL ──────
function getDrivePreviewUrl(driveLink) {
  if (!driveLink) return null
  // Handle: https://drive.google.com/open?id=FILE_ID
  const openMatch = driveLink.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (openMatch) return `https://drive.google.com/file/d/${openMatch[1]}/preview`
  // Handle: https://drive.google.com/file/d/FILE_ID/view
  const fileMatch = driveLink.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (fileMatch) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`
  return null
}

// ─── Book Cover ───────────────────────────────────────────────
function BookCover({ book, className = '' }) {
  const [imgError, setImgError] = useState(false)
  const [bg, fg] = COVER_COLORS[book.category] || ['#04003D', '#FF9700']
  const short = book.title.length > 22 ? book.title.substring(0, 22) + '…' : book.title

  if (!book.cover_url || imgError) {
    return (
      <div
        className={`flex flex-col items-center justify-center p-3 text-center ${className}`}
        style={{ background: `linear-gradient(135deg, ${bg} 0%, ${bg}cc 100%)` }}
      >
        <BookOpen size={28} style={{ color: fg, opacity: 0.6 }} className="mb-2" />
        <span className="text-xs font-bold leading-tight" style={{ color: fg, fontSize: '0.65rem' }}>{short}</span>
        <span className="text-xs mt-1 opacity-60" style={{ color: fg, fontSize: '0.55rem' }}>{book.author}</span>
      </div>
    )
  }
  return (
    <img
      src={book.cover_url}
      alt={book.title}
      className={`object-cover ${className}`}
      onError={() => setImgError(true)}
    />
  )
}

// ─── Copyright Policy Banner ──────────────────────────────────
function CopyrightBanner() {
  const [dismissed, setDismissed] = useState(() =>
    sessionStorage.getItem('library_copyright_dismissed') === 'true'
  )
  if (dismissed) return null
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 flex gap-3">
      <Shield size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-amber-800 mb-1">Copyright & Fair Use Notice</p>
        <p className="text-xs text-amber-700 leading-relaxed">
          The books in this library are shared for personal spiritual growth and educational purposes within MUTCU.
          MUTCU does not own the copyright to these materials. Members are encouraged to purchase original copies
          to support the authors. Do not redistribute, reproduce, or share these files outside the CU community.
          By accessing these resources, you agree to use them responsibly and in accordance with fair use principles.
        </p>
      </div>
      <button
        onClick={() => { sessionStorage.setItem('library_copyright_dismissed', 'true'); setDismissed(true) }}
        className="text-amber-400 hover:text-amber-600 flex-shrink-0 p-1"
        title="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}

// ─── Book Preview Modal (Google Drive embed) ──────────────────
function BookPreviewModal({ book, onClose, onBookmark, onOpenDrive, isAdmin, onEdit }) {
  const [previewError, setPreviewError] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [bookmarking, setBookmarking] = useState(false)
  const previewUrl = getDrivePreviewUrl(book.drive_link)
  const cat = getCat(book.category)

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          fullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-4xl h-[90vh]'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="w-8 h-10 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
            <BookCover book={book} className="w-full h-full" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-montserrat font-bold text-navy text-sm truncate">{book.title}</h3>
            <p className="text-xs text-gray-400 truncate">by {book.author}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cat.bg} ${cat.text} border ${cat.border}`}>
              <Tag size={9} /> {book.category}
            </span>
            {isAdmin && (
              <button
                onClick={() => { onClose(); onEdit(book) }}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-orange hover:border-orange transition-colors"
                title="Edit book"
              >
                <Edit3 size={13} />
              </button>
            )}
            <button
              onClick={async () => { setBookmarking(true); await onBookmark(book.id); setBookmarking(false) }}
              disabled={bookmarking}
              className={`p-1.5 rounded-lg border transition-all ${
                book.is_bookmarked
                  ? 'bg-orange/10 border-orange/30 text-orange'
                  : 'border-gray-200 text-gray-400 hover:text-orange hover:border-orange/30'
              }`}
              title={book.is_bookmarked ? 'Remove bookmark' : 'Save'}
            >
              {book.is_bookmarked ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
            </button>
            <button
              onClick={() => setFullscreen(f => !f)}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-navy transition-colors"
              title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
            <a
              href={book.drive_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-navy hover:bg-navy/90 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
            >
              <ExternalLink size={12} /> Open
            </a>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 bg-gray-100 relative overflow-hidden">
          {!previewUrl || previewError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-2xl flex items-center justify-center mb-4">
                <BookOpen size={28} className="text-gray-400" />
              </div>
              <h4 className="font-montserrat font-bold text-navy mb-2">Preview Unavailable</h4>
              <p className="text-sm text-gray-500 mb-4 max-w-xs">
                This book cannot be previewed directly. Open it in Google Drive to read.
              </p>
              <a
                href={book.drive_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-navy text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-navy/90 transition-colors"
              >
                <ExternalLink size={14} /> Open in Google Drive
              </a>
            </div>
          ) : (
            <>
              <iframe
                src={previewUrl}
                className="w-full h-full border-0"
                title={`Preview: ${book.title}`}
                allow="autoplay"
                onError={() => setPreviewError(true)}
              />
              {/* Copyright overlay at bottom */}
              <div className="absolute bottom-0 left-0 right-0 bg-amber-50/95 border-t border-amber-200 px-4 py-2 flex items-center gap-2">
                <Shield size={12} className="text-amber-600 flex-shrink-0" />
                <p className="text-[10px] text-amber-700 leading-tight">
                  For personal spiritual growth only within MUTCU. MUTCU does not own copyright to this material.
                  Please support the author by purchasing the original copy.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Book Card ────────────────────────────────────────────────
function BookCard({ book, onBookmark, onPreview, isAdmin, onEdit, onDelete }) {
  const cat = getCat(book.category)
  const [bookmarking, setBookmarking] = useState(false)

  const handleBookmark = async (e) => {
    e.stopPropagation()
    setBookmarking(true)
    await onBookmark(book.id)
    setBookmarking(false)
  }

  return (
    <div
      className="flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden group"
      onClick={() => onPreview(book)}
    >
      <div className="relative pt-[140%] bg-gray-100 overflow-hidden">
        <div className="absolute inset-0">
          <BookCover book={book} className="w-full h-full" />
        </div>
        <span className={`absolute top-2 right-2 z-10 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${cat.bg} ${cat.text} border ${cat.border}`}>
          {book.category}
        </span>
        {book.is_featured && (
          <span className="absolute top-2 left-2 z-10 bg-orange/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
            <Star size={9} fill="white" /> Featured
          </span>
        )}
        {/* Preview hint on hover */}
        <div className="absolute inset-0 bg-navy/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="flex flex-col items-center gap-1 text-white">
            <Eye size={20} />
            <span className="text-xs font-bold">Preview</span>
          </div>
        </div>
        {/* Admin controls */}
        {isAdmin && (
          <div className="absolute bottom-2 left-2 right-2 z-20 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={e => { e.stopPropagation(); onEdit(book) }}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white/95 text-navy rounded-lg text-[10px] font-bold shadow-sm hover:bg-orange hover:text-white transition-colors"
            >
              <Edit3 size={10} /> Edit
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDelete(book.id) }}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white/95 text-red-500 rounded-lg text-[10px] font-bold shadow-sm hover:bg-red-500 hover:text-white transition-colors"
            >
              <Trash2 size={10} /> Delete
            </button>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <h4 className="font-montserrat font-bold text-navy text-sm leading-tight mb-1 line-clamp-2 group-hover:text-orange transition-colors">
          {book.title}
        </h4>
        <p className="text-xs text-gray-500 mb-3 pb-3 border-b border-gray-50">By {book.author}</p>
        {book.description && (
          <p className="text-xs text-gray-500 flex-grow mb-3 line-clamp-2 leading-relaxed">{book.description}</p>
        )}
        <div className="flex gap-2 mt-auto">
          <button
            onClick={handleBookmark}
            disabled={bookmarking}
            className={`p-2 rounded-xl border transition-all ${
              book.is_bookmarked
                ? 'bg-orange/10 border-orange/30 text-orange'
                : 'border-gray-200 text-gray-400 hover:border-orange/30 hover:text-orange'
            }`}
            title={book.is_bookmarked ? 'Remove bookmark' : 'Save'}
          >
            {book.is_bookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
          </button>
          <button
            onClick={() => onPreview(book)}
            className="flex-grow flex items-center justify-center gap-1.5 bg-navy hover:bg-navy/90 text-white rounded-xl text-xs font-bold transition-colors py-2"
          >
            <Eye size={12} /> Preview & Read
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Book Form Modal (Add / Edit) ─────────────────────────────
function BookFormModal({ book, onClose, onSave }) {
  const isEdit = !!book
  const [form, setForm] = useState({
    title:       book?.title       || '',
    author:      book?.author      || '',
    category:    book?.category    || 'Faith',
    description: book?.description || '',
    cover_url:   book?.cover_url   || '',
    drive_link:  book?.drive_link  || '',
    is_featured: book?.is_featured || false,
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.author || !form.drive_link) {
      toast.error('Title, author and Drive link are required')
      return
    }
    setSaving(true)
    await onSave(form, book?.id)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-montserrat font-bold text-navy text-lg">{isEdit ? 'Edit Book' : 'Add New Book'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">Title *</label>
            <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange" placeholder="Book title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">Author *</label>
            <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange" placeholder="Author name" value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">Category *</label>
            <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">Description</label>
            <textarea className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange resize-none" placeholder="Short description" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">Google Drive Link *</label>
            <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange" placeholder="https://drive.google.com/open?id=..." value={form.drive_link} onChange={e => setForm(f => ({ ...f, drive_link: e.target.value }))} />
            <p className="text-[10px] text-gray-400 mt-1">Paste the Google Drive share link. The portal will generate a preview automatically.</p>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">Cover Image URL <span className="text-gray-300">(optional)</span></label>
            <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange" placeholder="https://... (leave blank for auto-generated)" value={form.cover_url} onChange={e => setForm(f => ({ ...f, cover_url: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer py-1">
            <input type="checkbox" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} className="rounded accent-orange" />
            <Star size={13} className="text-orange" /> Mark as Featured
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-navy text-white rounded-xl text-sm font-bold hover:bg-navy/90 disabled:opacity-50">
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Book'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Search Autocomplete ──────────────────────────────────────
function SearchAutocomplete({ value, onChange, onSelect, onSubmit }) {
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceRef = useRef(null)
  const wrapperRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchSuggestions = useCallback(async (q) => {
    if (q.length < 2) { setSuggestions([]); setShowSuggestions(false); return }
    try {
      const { data } = await api.get(`/library/search/suggestions?q=${encodeURIComponent(q)}`)
      setSuggestions(data.suggestions || [])
      setShowSuggestions(true)
    } catch { setSuggestions([]) }
  }, [])

  const handleChange = (e) => {
    const v = e.target.value
    onChange(v)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 280)
  }

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <form onSubmit={(e) => { e.preventDefault(); setShowSuggestions(false); onSubmit() }}>
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange bg-white"
          placeholder="Search by title or author…"
          value={value}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          autoComplete="off"
        />
        {value && (
          <button type="button" onClick={() => { onChange(''); setSuggestions([]); setShowSuggestions(false); onSubmit('') }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={14} />
          </button>
        )}
      </form>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl z-40 overflow-hidden">
          {suggestions.map((s, i) => {
            const c = getCat(s.category)
            return (
              <button key={i} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left" onClick={() => { onSelect(s.text); setShowSuggestions(false) }}>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${c.bg}`}>
                  <BookOpen size={11} className={c.text} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-navy truncate">{s.text}</p>
                  <p className="text-xs text-gray-400 truncate">{s.sub}</p>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${c.bg} ${c.text}`}>{s.category}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Advanced Filter Panel ────────────────────────────────────
function FilterPanel({ selectedCategories, onCategoryToggle, dateFrom, dateTo, onDateChange, onReset, categories }) {
  const hasFilters = selectedCategories.length > 0 || dateFrom || dateTo
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-montserrat font-bold text-navy text-sm flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-orange" /> Advanced Filters
        </h3>
        {hasFilters && (
          <button onClick={onReset} className="text-xs text-orange font-bold hover:underline flex items-center gap-1">
            <X size={11} /> Clear all
          </button>
        )}
      </div>
      <div className="mb-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Categories (select multiple)</p>
        <div className="flex flex-wrap gap-2">
          {categories.filter(c => c.name !== 'All').map(cat => {
            const c = getCat(cat.name)
            const isSelected = selectedCategories.includes(cat.name)
            return (
              <button key={cat.name} onClick={() => onCategoryToggle(cat.name)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${isSelected ? `${c.bg} ${c.text} ${c.border} shadow-sm` : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                {isSelected ? <CheckSquare size={11} /> : <Square size={11} />}
                <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                {cat.name} <span className="text-[10px] opacity-60">{cat.count}</span>
              </button>
            )
          })}
        </div>
      </div>
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
          <Calendar size={11} /> Date Added Range
        </p>
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={e => onDateChange('from', e.target.value)} className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange" />
          <span className="text-gray-400 text-xs font-bold">to</span>
          <input type="date" value={dateTo} onChange={e => onDateChange('to', e.target.value)} className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange" />
        </div>
      </div>
    </div>
  )
}

// ─── Main Library Page ────────────────────────────────────────
export default function LibraryPage() {
  const { user, hasRole, isSecretary } = useAuth()
  // Admin: can add/edit/delete books + view analytics
  const isAdmin = hasRole('super_admin', 'ec_admin', 'cu_secretary', 'vice_secretary')

  const [books, setBooks] = useState([])
  const [bookmarks, setBookmarks] = useState([])
  const [categories, setCategories] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [tab, setTab] = useState('books') // books | bookmarks

  // Search & filter
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [selectedCategories, setSelectedCategories] = useState([])
  const [sort, setSort] = useState('newest')
  const [showFilters, setShowFilters] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Modals
  const [previewBook, setPreviewBook] = useState(null)
  const [bookFormData, setBookFormData] = useState(null)
  const [showBookForm, setShowBookForm] = useState(false)

  const LIMIT = 20

  // ── Fetch books ──────────────────────────────────────────────
  const fetchBooks = useCallback(async (reset = true, pg = 1) => {
    if (reset) setLoading(true)
    else setLoadingMore(true)
    try {
      const params = new URLSearchParams({ page: pg, limit: LIMIT, sort })
      if (selectedCategories.length > 0) params.set('categories', selectedCategories.join(','))
      if (search) params.set('q', search)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      const { data } = await api.get(`/library/books?${params}`)
      if (reset) setBooks(data.books || [])
      else setBooks(prev => [...prev, ...(data.books || [])])
      setHasMore(data.has_more || false)
      setPage(pg)
    } catch { toast.error('Failed to load books') }
    finally { setLoading(false); setLoadingMore(false) }
  }, [selectedCategories, search, sort, dateFrom, dateTo])

  const fetchBookmarks = useCallback(async () => {
    try {
      const { data } = await api.get('/library/bookmarks')
      setBookmarks(data.books || [])
    } catch {}
  }, [])

  const fetchMeta = useCallback(async () => {
    try {
      const [catRes, statsRes] = await Promise.all([
        api.get('/library/categories'),
        api.get('/library/stats'),
      ])
      setCategories(catRes.data.categories || [])
      setStats(statsRes.data)
    } catch {}
  }, [])

  useEffect(() => { fetchMeta() }, [])
  useEffect(() => { fetchBooks(true, 1) }, [fetchBooks])

  // ── Bookmark toggle ──────────────────────────────────────────
  const handleBookmark = async (bookId) => {
    try {
      const { data } = await api.post('/library/bookmarks/toggle', { book_id: bookId })
      const added = data.status === 'added'
      toast.success(added ? '📚 Saved to your library' : 'Removed from library')
      setBooks(prev => prev.map(b => b.id === bookId ? { ...b, is_bookmarked: added } : b))
      if (previewBook?.id === bookId) setPreviewBook(prev => ({ ...prev, is_bookmarked: added }))
      fetchBookmarks()
      fetchMeta()
    } catch { toast.error('Failed to update bookmark') }
  }

  // ── Open preview ─────────────────────────────────────────────
  const handlePreview = async (book) => {
    setPreviewBook(book)
    try { await api.post(`/library/books/${book.id}/view`) } catch {}
  }

  // ── Admin: save book ─────────────────────────────────────────
  const handleSaveBook = async (form, id) => {
    try {
      if (id) {
        await api.put(`/library/books/${id}`, form)
        toast.success('Book updated!')
        setBooks(prev => prev.map(b => b.id === id ? { ...b, ...form } : b))
        if (previewBook?.id === id) setPreviewBook(prev => ({ ...prev, ...form }))
      } else {
        await api.post('/library/books', form)
        toast.success('Book added!')
        fetchBooks(true, 1)
      }
      setShowBookForm(false)
      setBookFormData(null)
      fetchMeta()
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save book') }
  }

  // ── Admin: delete book ───────────────────────────────────────
  const handleDeleteBook = async (bookId) => {
    if (!window.confirm('Delete this book from the library?')) return
    try {
      await api.delete(`/library/books/${bookId}`)
      toast.success('Book deleted')
      setBooks(prev => prev.filter(b => b.id !== bookId))
      if (previewBook?.id === bookId) setPreviewBook(null)
      fetchMeta()
    } catch { toast.error('Failed to delete book') }
  }

  const toggleCategory = (cat) => {
    setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])
  }

  const resetFilters = () => {
    setSelectedCategories([])
    setDateFrom('')
    setDateTo('')
    setSearch('')
    setSearchInput('')
    setSort('newest')
  }

  const activeFilterCount = selectedCategories.length + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="bg-navy text-white px-4 py-8 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange/20 rounded-xl flex items-center justify-center">
                <Library size={22} className="text-orange" />
              </div>
              <div>
                <h1 className="font-montserrat font-bold text-xl">MUTCU E-Library</h1>
                <p className="text-white/60 text-xs">Inspire Love, Hope and Godliness</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Link
                  to="/library/analytics"
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl text-xs font-bold transition-colors"
                >
                  <BarChart3 size={13} /> Analytics
                </Link>
              )}
              {isAdmin && (
                <button
                  onClick={() => { setBookFormData({}); setShowBookForm(true) }}
                  className="flex items-center gap-2 bg-orange hover:bg-orange/90 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                >
                  <Plus size={15} /> Add Book
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                { label: 'Books', value: stats.total_books, icon: BookOpen },
                { label: 'Categories', value: Object.keys(stats.category_breakdown || {}).length, icon: Tag },
                { label: 'My Saved', value: stats.my_bookmarks, icon: BookmarkCheck },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-white/10 rounded-xl p-3 text-center">
                  <Icon size={16} className="text-orange mx-auto mb-1" />
                  <div className="font-montserrat font-bold text-lg">{value}</div>
                  <div className="text-white/60 text-xs">{label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Copyright notice */}
        <CopyrightBanner />

        {/* ── Tabs ───────────────────────────────────────────── */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1 mb-6 shadow-sm">
          {[
            { id: 'books',     label: 'All Books',   icon: BookOpen },
            { id: 'bookmarks', label: 'My Library',  icon: BookMarked },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setTab(id); if (id === 'bookmarks') fetchBookmarks() }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                tab === id ? 'bg-navy text-white shadow-sm' : 'text-gray-500 hover:text-navy'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* ── BOOKS TAB ──────────────────────────────────────── */}
        {tab === 'books' && (
          <>
            {/* Search + sort + filter toggle */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <SearchAutocomplete
                value={searchInput}
                onChange={setSearchInput}
                onSelect={(text) => { setSearchInput(text); setSearch(text) }}
                onSubmit={(val) => setSearch(val !== undefined ? val : searchInput)}
              />
              <div className="flex gap-2">
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
                  <Filter size={14} className="text-gray-400" />
                  <select value={sort} onChange={e => setSort(e.target.value)} className="bg-transparent border-none text-sm font-bold text-navy focus:outline-none cursor-pointer">
                    <option value="newest">Newest</option>
                    <option value="popular">Most Viewed</option>
                    <option value="weekly">🔥 Hot This Week</option>
                    <option value="az">A–Z</option>
                    <option value="za">Z–A</option>
                  </select>
                </div>
                <button
                  onClick={() => setShowFilters(f => !f)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                    showFilters || activeFilterCount > 0 ? 'bg-navy text-white border-navy' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <SlidersHorizontal size={14} />
                  {activeFilterCount > 0 && (
                    <span className="bg-orange text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{activeFilterCount}</span>
                  )}
                </button>
              </div>
            </div>

            {/* Advanced filter panel */}
            {showFilters && (
              <FilterPanel
                selectedCategories={selectedCategories}
                onCategoryToggle={toggleCategory}
                dateFrom={dateFrom}
                dateTo={dateTo}
                onDateChange={(type, val) => type === 'from' ? setDateFrom(val) : setDateTo(val)}
                onReset={resetFilters}
                categories={categories}
              />
            )}

            {/* Quick category pills */}
            {!showFilters && (
              <div className="flex flex-wrap gap-2 mb-5">
                <button
                  onClick={() => setSelectedCategories([])}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${selectedCategories.length === 0 ? 'bg-navy text-white border-navy shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                >
                  All <span className="text-[10px] opacity-60">{stats?.total_books || 0}</span>
                </button>
                {categories.filter(c => c.name !== 'All').map(cat => {
                  const c = getCat(cat.name)
                  const isActive = selectedCategories.includes(cat.name)
                  return (
                    <button key={cat.name} onClick={() => toggleCategory(cat.name)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${isActive ? `${c.bg} ${c.text} ${c.border} shadow-sm` : `bg-white ${c.text} ${c.border} hover:shadow-sm`}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                      {cat.name} <span className="text-[10px] opacity-60">{cat.count}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Active filter chips */}
            {(search || activeFilterCount > 0) && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {search && (
                  <span className="flex items-center gap-1.5 bg-navy/5 text-navy text-xs font-bold px-3 py-1.5 rounded-full border border-navy/10">
                    <Search size={11} /> "{search}"
                    <button onClick={() => { setSearch(''); setSearchInput('') }} className="text-gray-400 hover:text-red-500 ml-0.5"><X size={10} /></button>
                  </span>
                )}
                {selectedCategories.map(cat => {
                  const c = getCat(cat)
                  return (
                    <span key={cat} className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${c.bg} ${c.text} ${c.border}`}>
                      {cat} <button onClick={() => toggleCategory(cat)} className="opacity-60 hover:opacity-100 ml-0.5"><X size={10} /></button>
                    </span>
                  )
                })}
                {(dateFrom || dateTo) && (
                  <span className="flex items-center gap-1.5 bg-purple-50 text-purple-700 text-xs font-bold px-3 py-1.5 rounded-full border border-purple-200">
                    <Calendar size={10} /> {dateFrom || '…'} → {dateTo || '…'}
                    <button onClick={() => { setDateFrom(''); setDateTo('') }} className="opacity-60 hover:opacity-100 ml-0.5"><X size={10} /></button>
                  </span>
                )}
                <button onClick={resetFilters} className="text-xs text-orange font-bold hover:underline">Clear all</button>
              </div>
            )}

            {/* Preview hint */}
            <div className="flex items-center gap-2 mb-4 text-xs text-gray-400">
              <Eye size={12} className="text-orange" />
              <span>Click any book to preview it directly in the portal before opening in Google Drive</span>
            </div>

            {/* Book grid */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                    <div className="pt-[140%] bg-gray-100" />
                    <div className="p-4 space-y-2">
                      <div className="h-3 bg-gray-100 rounded w-3/4" />
                      <div className="h-2 bg-gray-100 rounded w-1/2" />
                      <div className="h-8 bg-gray-100 rounded-xl mt-3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : books.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <BookOpen size={40} className="text-gray-200 mx-auto mb-3" />
                <h3 className="font-montserrat font-bold text-navy text-lg mb-1">No books found</h3>
                <p className="text-gray-400 text-sm mb-4">Try adjusting your search or filters</p>
                <button onClick={resetFilters} className="px-5 py-2 bg-navy text-white rounded-xl text-sm font-bold hover:bg-navy/90">Reset Filters</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {books.map(book => (
                    <BookCard
                      key={book.id}
                      book={book}
                      onBookmark={handleBookmark}
                      onPreview={handlePreview}
                      isAdmin={isAdmin}
                      onEdit={(b) => { setBookFormData(b); setShowBookForm(true) }}
                      onDelete={handleDeleteBook}
                    />
                  ))}
                </div>

                {hasMore && (
                  <div className="text-center mt-8">
                    <button
                      onClick={() => fetchBooks(false, page + 1)}
                      disabled={loadingMore}
                      className="flex items-center gap-2 mx-auto px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-navy hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {loadingMore ? <RefreshCw size={14} className="animate-spin" /> : <ChevronDown size={14} />}
                      {loadingMore ? 'Loading…' : 'Load More Books'}
                    </button>
                  </div>
                )}

                <p className="text-center text-xs text-gray-400 mt-4">
                  Showing {books.length} of {stats?.total_books || books.length} books
                </p>
              </>
            )}
          </>
        )}

        {/* ── BOOKMARKS TAB ──────────────────────────────────── */}
        {tab === 'bookmarks' && (
          <div>
            <div className="mb-6">
              <h2 className="font-montserrat font-bold text-navy text-lg mb-1">My Saved Books</h2>
              <p className="text-gray-400 text-sm">Books you've bookmarked for later reading.</p>
            </div>
            {bookmarks.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <Bookmark size={40} className="text-gray-200 mx-auto mb-3" />
                <h3 className="font-montserrat font-bold text-navy text-lg mb-1">No saved books yet</h3>
                <p className="text-gray-400 text-sm mb-4">Browse the library and tap the bookmark icon to save books here</p>
                <button onClick={() => setTab('books')} className="px-5 py-2 bg-navy text-white rounded-xl text-sm font-bold hover:bg-navy/90 transition-colors">
                  Browse Library
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {bookmarks.map(book => (
                  <BookCard
                    key={book.id}
                    book={book}
                    onBookmark={handleBookmark}
                    onPreview={handlePreview}
                    isAdmin={isAdmin}
                    onEdit={(b) => { setBookFormData(b); setShowBookForm(true) }}
                    onDelete={handleDeleteBook}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────── */}
      {previewBook && (
        <BookPreviewModal
          book={previewBook}
          onClose={() => setPreviewBook(null)}
          onBookmark={handleBookmark}
          onOpenDrive={() => window.open(previewBook.drive_link, '_blank')}
          isAdmin={isAdmin}
          onEdit={(b) => { setPreviewBook(null); setBookFormData(b); setShowBookForm(true) }}
        />
      )}

      {showBookForm && (
        <BookFormModal
          book={bookFormData && bookFormData.id ? bookFormData : null}
          onClose={() => { setShowBookForm(false); setBookFormData(null) }}
          onSave={handleSaveBook}
        />
      )}
    </div>
  )
}