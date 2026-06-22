const express = require('express');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const db = require('../database/db');
const { signToken } = require('../utils/jwt');

const router = express.Router();

const MIN_AGE = 18;
const INTENTS = ['romantic', 'friendship'];

const registerSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(8).required(),
  first_name: Joi.string().min(1).max(100).required(),
  age: Joi.number().integer().min(MIN_AGE).max(99).required(),
  intent: Joi.string().valid(...INTENTS).default('romantic'),
  city: Joi.string().max(100).allow(null, ''),
  gender: Joi.string().valid('male', 'female', 'other').allow(null),
  looking_for: Joi.string().valid('male', 'female', 'other').allow(null),
});

const loginSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().required(),
});

function toPublicUser(user) {
  const { password_hash, ...publicUser } = user; // eslint-disable-line no-unused-vars
  return publicUser;
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [value.email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Un compte existe déjà avec cet email' });
    }

    const passwordHash = await bcrypt.hash(value.password, 10);

    const result = await db.query(
      `INSERT INTO users
        (email, password_hash, first_name, age, intent, city, gender, looking_for)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, email, first_name, age, intent, city, gender,
                 looking_for, is_verified, is_premium, created_at`,
      [
        value.email, passwordHash, value.first_name, value.age,
        value.intent, value.city || null, value.gender || null, value.looking_for || null,
      ]
    );

    const user = result.rows[0];
    const token = signToken({ sub: user.id });
    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const result = await db.query('SELECT * FROM users WHERE email = $1', [value.email]);
    const user = result.rows[0];

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const valid = await bcrypt.compare(value.password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

    const token = signToken({ sub: user.id });
    res.json({ token, user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/spotify — TODO Sprint 2
router.get('/spotify', (_req, res) => {
  res.status(501).json({ message: 'Not implemented yet — Sprint 2' });
});

// GET /api/auth/spotify/callback — TODO Sprint 2
router.get('/spotify/callback', (_req, res) => {
  res.status(501).json({ message: 'Not implemented yet — Sprint 2' });
});

module.exports = router;
