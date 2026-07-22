const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const supabase = require('../lib/supabase');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/upload/photo
router.post('/photo', authenticate, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({
        folder: 'mutcu/members',
        public_id: `member_${req.user.id}_${Date.now()}`,
        transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
        resource_type: 'image',
      }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }).end(req.file.buffer);
    });

    // Update user photo
    await supabase.from('users').update({ photo_url: result.secure_url, photo_public_id: result.public_id }).eq('id', req.user.id);

    res.json({ url: result.secure_url, public_id: result.public_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
