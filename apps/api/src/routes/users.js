const express = require('express');
const Joi = require('joi');
const multer = require('multer');
const db = require('../database/db');
const { requireAuth } = require('../middleware/auth');
const { uploadProfilePhoto } = require('../services/storage');

const router = express.Router();

const INTENTS = ['romantic', 'friendship'];

const PUBLIC_FIELDS = `
  id, email, first_name, avatar_url, age, city,
  intent, gender, looking_for, is_verified, is_premium,
  created_at, updated_at
`;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Seules les images sont acceptées'));
    }
    cb(null, true);
  },
});

const updateSchema = Joi.object({
  first_name: Joi.string().min(1).max(100),
  age: Joi.number().integer().min(18).max(99),
  city: Joi.string().max(100).allow(null, ''),
  intent: Joi.string().valid(...INTENTS),
  gender: Joi.string().valid('male', 'female', 'other').allow(null),
  looking_for: Joi.string().valid('male', 'female', 'other').allow(null),
  avatar_url: Joi.string().uri().allow(null, ''),
}).min(1);

// GET /api/users/me
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1`,
      [req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/me
router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const { error, value } = updateSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const fields = Object.keys(value);
    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const values = fields.map((f) => value[f]);

    const result = await db.query(
      `UPDATE users SET ${setClause} WHERE id = $1 RETURNING ${PUBLIC_FIELDS}`,
      [req.userId, ...values]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/users/me/photo
router.post('/me/photo', requireAuth, upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucune photo fournie (champ "photo")' });
    }

    const avatarUrl = await uploadProfilePhoto(
      req.userId,
      req.file.buffer,
      req.file.mimetype
    );

    const result = await db.query(
      `UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING ${PUBLIC_FIELDS}`,
      [avatarUrl, req.userId]
    );

    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
