const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { authenticate } = require('../middleware/auth');

// GET /api/cycles/active
router.get('/active', authenticate, async (req, res) => {
  try {
    const { data } = await supabase.from('nomination_cycles')
      .select('*').not('status', 'in', '("draft","commissioned","cancelled")').order('created_at', { ascending: false }).limit(1).single();
    res.json({ cycle: data || null });
  } catch (err) {
    res.json({ cycle: null });
  }
});

module.exports = router;
