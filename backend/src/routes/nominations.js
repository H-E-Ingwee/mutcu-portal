const express = require('express')
const router = express.Router()
const prisma = require('../lib/prisma')
const { authenticate, requireApproved, requireRole } = require('../middleware/auth')
const { checkEligibility, canNominate, isFinalist, isFirstYear } = require('../lib/eligibility')

// ─── Concurrency limiter ──────────────────────────────────────────────────────
let activeNominations = 0
const MAX_CONCURRENT_NOMINATIONS = 20

// ─── GET /api/nominations/cycle ───────────────────────────────────────────────
router.get('/cycle', authenticate, async (req, res) => {
  try {
    const cycle = await prisma.nominationCycle.findFirst({
      where: { status: { notIn: ['draft', 'commissioned', 'cancelled'] } },
      orderBy: { created_at: 'desc' },
    })
    res.json({ cycle: cycle || null })
  } catch (err) {
    res.json({ cycle: null })
  }
})

// ─── GET /api/nominations/eligible/:positionId ────────────────────────────────
router.get('/eligible/:positionId', authenticate, requireApproved, async (req, res) => {
  try {
    const { search } = req.query
    const [position, cycle] = await Promise.all([
      prisma.position.findUnique({ where: { id: req.params.positionId } }),
      prisma.nominationCycle.findFirst({
        where: { status: { notIn: ['draft', 'commissioned', 'cancelled'] } },
        orderBy: { created_at: 'desc' },
        select: { id: true, chairperson_gender: true }
      })
    ])

    if (!position) return res.status(404).json({ error: 'Position not found' })

    // Determine gender constraint
    let requiredGender = position.gender_constraint
    if (!requiredGender && cycle?.chairperson_gender) {
      const slug = (position.slug || '').toLowerCase()
      if (slug.includes('1st') || slug.includes('first')) {
        requiredGender = cycle.chairperson_gender === 'male' ? 'female' : 'male'
      } else if (slug.includes('2nd') || slug.includes('second')) {
        requiredGender = cycle.chairperson_gender === 'male' ? 'male' : 'female'
      }
    }

    // Build Prisma where clause
    const where = {
      enrollment_status: 'active',
      membership_type: 'full',
      disciplinary_status: 'clear',
      sgc_executive_role: false,
      faith_declaration_signed: true,
      year_of_study: { gte: 2 },
      ...(requiredGender ? { gender: requiredGender } : {}),
      ...(search?.trim() ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { primary_ministry: { contains: search, mode: 'insensitive' } },
          { mutcu_number: { contains: search, mode: 'insensitive' } },
        ]
      } : {}),
    }

    const members = await prisma.user.findMany({
      where,
      select: {
        id: true, name: true, photo_url: true, year_of_study: true,
        course_type: true, gender: true, primary_ministry: true,
        secondary_ministry: true, mutcu_number: true, school_prefix: true,
        is_finalist: true,
        appointments: { where: { position_id: position.id }, select: { id: true } }
      },
      orderBy: { name: 'asc' }
    })

    const maxTerms = position.chair_max_one_term ? 1 : (position.max_terms || 2)

    const eligible = members
      .filter(m => {
        const courseType = m.course_type || 'degree'
        const prefix = (m.school_prefix || '').toUpperCase()
        const maxYear = courseType === 'diploma' ? 3 : (prefix === 'SE' ? 5 : 4)
        if ((m.year_of_study || 0) >= maxYear || m.is_finalist) return false
        if ((m.appointments?.length || 0) >= maxTerms) return false
        return true
      })
      .map(m => ({
        id: m.id, name: m.name,
        photo: m.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=04003D&color=FF9700&size=200&bold=true`,
        year_of_study: m.year_of_study, course_type: m.course_type,
        gender: m.gender, ministry: m.primary_ministry || 'General Member',
        secondary_ministry: m.secondary_ministry, mutcu_number: m.mutcu_number,
      }))

    res.json({ members: eligible, total: eligible.length })
  } catch (err) {
    console.error('[ELIGIBLE ERROR]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/nominations/recommend ─────────────────────────────────────────
router.post('/recommend', authenticate, requireApproved, async (req, res) => {
  if (activeNominations >= MAX_CONCURRENT_NOMINATIONS) {
    return res.status(429).json({
      error: 'The system is processing many nominations right now. Please wait a moment and try again — your nomination will not be lost.',
      code: 'NOMINATION_BUSY',
      retry_after: 5,
    })
  }

  activeNominations++
  try {
    const { cycle_id, position_id, candidate_id, prayerful_note } = req.body
    const user = req.user

    const nominateCheck = canNominate(user)
    if (!nominateCheck.allowed) return res.status(403).json({ error: nominateCheck.reason })

    // Parallel: check duplicate + validate candidate + check cycle status
    const [existing, candidate, cycle] = await Promise.all([
      prisma.recommendation.findUnique({
        where: { cycle_id_position_id_recommender_id: { cycle_id, position_id, recommender_id: user.id } },
        select: { id: true }
      }),
      prisma.user.findUnique({
        where: { id: candidate_id },
        select: { id: true, name: true, year_of_study: true, gender: true, primary_ministry: true,
          mutcu_number: true, membership_type: true, is_finalist: true, disciplinary_status: true,
          sgc_executive_role: true, faith_declaration_signed: true, course_type: true, school_prefix: true }
      }),
      prisma.nominationCycle.findUnique({
        where: { id: cycle_id },
        select: { status: true }
      })
    ])

    if (existing) return res.status(400).json({ error: 'You have already submitted a prayerful recommendation for this position. Only one recommendation per position is allowed.' })
    if (!candidate) return res.status(404).json({ error: 'Candidate not found' })
    if (!cycle || cycle.status !== 'nominations_open') return res.status(400).json({ error: 'Nominations are not currently open.' })
    if (isFirstYear(candidate)) return res.status(400).json({ error: 'First-year students cannot be nominated for EC positions (Art. 12.4.b)' })
    if (isFinalist(candidate)) return res.status(400).json({ error: 'Finalist students cannot be nominated for EC positions — they serve in the Nomination College (Art. 12.4.b)' })

    const recommendation = await prisma.recommendation.create({
      data: { cycle_id, position_id, candidate_id, recommender_id: user.id, prayerful_note: prayerful_note || null }
    })

    res.status(201).json({ recommendation, message: 'Prayerful recommendation submitted successfully' })
  } catch (err) {
    console.error('[RECOMMEND ERROR]', err.message)
    if (err.code === 'P2002') return res.status(400).json({ error: 'You have already submitted a recommendation for this position.' })
    if (err.code === 'P1008') return res.status(503).json({ error: 'Server is under heavy load. Please try again in a moment.', code: 'SERVER_BUSY' })
    res.status(500).json({ error: err.message })
  } finally {
    activeNominations--
  }
})

// ─── POST /api/nominations/suggest ───────────────────────────────────────────
router.post('/suggest', authenticate, requireApproved, async (req, res) => {
  try {
    const { cycle_id, position_id, suggested_name, description, why_recommend } = req.body
    const user = req.user

    const nominateCheck = canNominate(user)
    if (!nominateCheck.allowed) return res.status(403).json({ error: nominateCheck.reason })

    const existing = await prisma.freeTextSuggestion.findUnique({
      where: { cycle_id_position_id_suggester_id: { cycle_id, position_id, suggester_id: user.id } },
      select: { id: true }
    })
    if (existing) return res.status(400).json({ error: 'You have already submitted a suggestion for this position.' })

    const suggestion = await prisma.freeTextSuggestion.create({
      data: { cycle_id, position_id, suggester_id: user.id, suggested_name, description, why_recommend, nc_action: 'pending', is_anonymous: true }
    })

    res.status(201).json({ suggestion, message: 'Your suggestion has been submitted anonymously to the Nomination College' })
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'You have already submitted a suggestion for this position.' })
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/nominations/nominees ───────────────────────────────────────────
router.get('/nominees', authenticate, async (req, res) => {
  try {
    const cycle = await prisma.nominationCycle.findFirst({
      where: { status: { notIn: ['draft', 'commissioned', 'cancelled'] } },
      orderBy: { created_at: 'desc' }
    })

    if (!cycle || !['nominees_published', 'objection_period', 'pre_agm', 'commissioned'].includes(cycle.status)) {
      return res.json({ nominees: [], cycle: cycle || null, published: false })
    }

    const nominees = await prisma.nominee.findMany({
      where: { cycle_id: cycle.id, status: 'active' },
      include: {
        candidate: { select: { id: true, name: true, photo_url: true, year_of_study: true, primary_ministry: true, gender: true, course_type: true } },
        position: { select: { id: true, title: true, display_order: true } }
      },
      orderBy: { position_id: 'asc' }
    })

    res.json({ nominees, cycle, published: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/nominations/my-recommendations ──────────────────────────────────
router.get('/my-recommendations', authenticate, async (req, res) => {
  try {
    const cycle = await prisma.nominationCycle.findFirst({
      where: { status: { notIn: ['draft', 'commissioned', 'cancelled'] } },
      orderBy: { created_at: 'desc' },
      select: { id: true }
    })
    if (!cycle) return res.json({ recommendations: [], suggestions: [], recommended_positions: [], suggested_positions: [] })

    const [recommendations, suggestions] = await Promise.all([
      prisma.recommendation.findMany({
        where: { cycle_id: cycle.id, recommender_id: req.user.id },
        include: {
          position: { select: { id: true, title: true } },
          candidate: { select: { name: true, photo_url: true, mutcu_number: true } }
        }
      }),
      prisma.freeTextSuggestion.findMany({
        where: { cycle_id: cycle.id, suggester_id: req.user.id },
        include: { position: { select: { id: true, title: true } } }
      })
    ])

    res.json({
      recommendations,
      suggestions,
      recommended_positions: recommendations.map(r => r.position_id),
      suggested_positions: suggestions.map(s => s.position_id),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/nominations/objections ────────────────────────────────────────
router.post('/objections', authenticate, requireApproved, async (req, res) => {
  try {
    const { nominee_id, grounds } = req.body
    const user = req.user

    if (user.membership_type !== 'full') return res.status(403).json({ error: 'Only full members may submit objections' })
    if (isFirstYear(user)) return res.status(403).json({ error: 'First-year students cannot participate in the objection process' })
    if (!grounds || grounds.length < 50) return res.status(400).json({ error: 'Grounds must be at least 50 characters and must be substantive' })

    const nominee = await prisma.nominee.findUnique({
      where: { id: nominee_id },
      select: { cycle_id: true }
    })
    if (!nominee) return res.status(404).json({ error: 'Nominee not found' })

    const objection = await prisma.objection.create({
      data: { cycle_id: nominee.cycle_id, nominee_id, objector_id: user.id, grounds }
    })

    res.status(201).json({ objection, message: 'Objection submitted to the Nomination College' })
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'You have already submitted an objection for this nominee.' })
    res.status(500).json({ error: err.message })
  }
})

// ─── DELETE /api/nominations/data/:cycleId ────────────────────────────────────
router.delete('/data/:cycleId', authenticate, requireRole('super_admin', 'nc_chair'), async (req, res) => {
  try {
    const { cycleId } = req.params
    const cycle = await prisma.nominationCycle.findUnique({
      where: { id: cycleId },
      select: { status: true }
    })
    if (!cycle) return res.status(404).json({ error: 'Cycle not found' })
    if (!['commissioned', 'cancelled'].includes(cycle.status)) {
      return res.status(400).json({ error: 'Can only delete data from commissioned or cancelled cycles' })
    }

    // Prisma transaction — all or nothing
    await prisma.$transaction([
      prisma.objection.deleteMany({ where: { cycle_id: cycleId } }),
      prisma.nominee.deleteMany({ where: { cycle_id: cycleId } }),
      prisma.vettingDecision.deleteMany({ where: { cycle_id: cycleId } }),
      prisma.freeTextSuggestion.deleteMany({ where: { cycle_id: cycleId } }),
      prisma.recommendation.deleteMany({ where: { cycle_id: cycleId } }),
      prisma.ncMember.deleteMany({ where: { cycle_id: cycleId } }),
    ])

    await prisma.auditLog.create({
      data: {
        actor_id: req.user.id,
        action: 'nominations.data_deleted',
        entity_type: 'nomination_cycle',
        entity_id: cycleId,
        description: `Nomination data deleted for cycle ${cycleId} by ${req.user.name}`,
      }
    })

    res.json({ message: 'Nomination data deleted successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
