const express = require('express');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const crypto = require('crypto');
const db = require('../database/db');
const { signToken } = require('../utils/jwt');
const spotify = require('../services/spotify');

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

// GET /api/auth/spotify — démarre le flow OAuth
router.get('/spotify', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  // En prod on stockerait le state en session/Redis pour valider au callback
  const authUrl = spotify.getAuthUrl(state);
  res.redirect(authUrl);
});

// GET /api/auth/spotify/callback — reçoit le code et échange contre un token
router.get('/spotify/callback', async (req, res, next) => {
  try {
    const { code, error, state } = req.query; // eslint-disable-line no-unused-vars

    if (error) {
      return res.status(400).json({ error: `Spotify OAuth error: ${error}` });
    }

    if (!code) {
      return res.status(400).json({ error: 'Code OAuth manquant' });
    }

    // Échange le code contre les tokens Spotify
    const tokens = await spotify.exchangeCode(code);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Récupère le profil Spotify de l'utilisateur pour l'identifier
    const axios = require('axios');
    const spotifyUser = await axios.get('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const spotifyEmail = spotifyUser.data.email;

    // Trouve l'utilisateur Music Match par email (ou le crée si premier login Spotify)
    let userResult = await db.query('SELECT * FROM users WHERE email = $1', [spotifyEmail]);
    let user;

    if (userResult.rows.length === 0) {
      // Créer un compte minimal si l'utilisateur n'existe pas
      const insertResult = await db.query(
        `INSERT INTO users (email, first_name, is_verified)
         VALUES ($1, $2, true)
         RETURNING id, email, first_name, age, intent, city, gender,
                   looking_for, is_verified, is_premium, created_at`,
        [spotifyEmail, spotifyUser.data.display_name || 'Utilisateur']
      );
      user = insertResult.rows[0];
    } else {
      user = userResult.rows[0];
    }

    // Stocker les tokens Spotify
    await db.query(
      `INSERT INTO oauth_tokens (user_id, provider, access_token, refresh_token, expires_at)
       VALUES ($1, 'spotify', $2, $3, $4)
       ON CONFLICT (user_id, provider)
       DO UPDATE SET access_token = $2, refresh_token = $3, expires_at = $4`,
      [user.id, tokens.access_token, tokens.refresh_token, expiresAt]
    );

    // Génère un token JWT Music Match
    const jwtToken = signToken({ sub: user.id });

    // Redirige vers le frontend avec le token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    res.redirect(`${frontendUrl}/auth/callback?token=${jwtToken}`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
