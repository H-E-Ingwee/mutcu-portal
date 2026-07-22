const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { authenticate } = require('../middleware/auth');

router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('ministries').select('*').eq('is_active', true).order('display_order');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ministries: data });
});

module.exports = router;
