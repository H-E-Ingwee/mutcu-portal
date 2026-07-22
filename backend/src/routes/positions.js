const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');

router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('positions').select('*').eq('is_active', true).order('display_order');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ positions: data });
});

module.exports = router;
