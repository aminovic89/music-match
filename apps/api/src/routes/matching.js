const express = require('express');
const router = express.Router();

// GET /api/matching/discover — profils à découvrir avec score
router.get('/discover', (req, res) => {
  // TODO Sprint 3 : appliquer l'algorithme de scoring + DAILY_LIMITS
  res.status(501).json({ message: 'Not implemented yet — Sprint 3' });
});

// POST /api/matching/like — liker un profil
router.post('/like', (req, res) => {
  // TODO Sprint 3 : créer un LIKE, vérifier réciprocité → créer MATCH
  res.status(501).json({ message: 'Not implemented yet — Sprint 3' });
});

// GET /api/matching/matches — liste des matchs actifs
router.get('/matches', (req, res) => {
  // TODO Sprint 3 : retourner les matchs avec score détaillé
  res.status(501).json({ message: 'Not implemented yet — Sprint 3' });
});

module.exports = router;
