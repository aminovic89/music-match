const express = require('express');
const router = express.Router();

// POST /api/auth/register
router.post('/register', (req, res) => {
  // TODO Sprint 1 : inscription email/téléphone + OTP
  res.status(501).json({ message: 'Not implemented yet — Sprint 1' });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  // TODO Sprint 1 : connexion + JWT
  res.status(501).json({ message: 'Not implemented yet — Sprint 1' });
});

// GET /api/auth/spotify — démarre le flow OAuth Spotify
router.get('/spotify', (req, res) => {
  // TODO Sprint 2 : redirection vers Spotify OAuth
  res.status(501).json({ message: 'Not implemented yet — Sprint 2' });
});

// GET /api/auth/spotify/callback
router.get('/spotify/callback', (req, res) => {
  // TODO Sprint 2 : échange du code contre un token
  res.status(501).json({ message: 'Not implemented yet — Sprint 2' });
});

module.exports = router;
