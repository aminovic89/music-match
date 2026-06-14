const express = require('express');
const router = express.Router();

// GET /api/music/search?q=...
router.get('/search', (req, res) => {
  // TODO Sprint 2 : recherche live de titres via API Spotify/Deezer (option A)
  res.status(501).json({ message: 'Not implemented yet — Sprint 2' });
});

// POST /api/music/tracks — enregistrer les 20 titres sélectionnés
router.post('/tracks', (req, res) => {
  // TODO Sprint 2 : enregistrer USER_TRACKS + calculer MUSIC_PROFILES
  res.status(501).json({ message: 'Not implemented yet — Sprint 2' });
});

// GET /api/music/profile — ADN musical
router.get('/profile', (req, res) => {
  // TODO Sprint 2 : retourner le profil musical calculé
  res.status(501).json({ message: 'Not implemented yet — Sprint 2' });
});

module.exports = router;
