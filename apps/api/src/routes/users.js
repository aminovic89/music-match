const express = require('express');
const router = express.Router();

// GET /api/users/me
router.get('/me', (req, res) => {
  // TODO Sprint 1 : retourner le profil de l'utilisateur connecté
  res.status(501).json({ message: 'Not implemented yet — Sprint 1' });
});

// PATCH /api/users/me
router.patch('/me', (req, res) => {
  // TODO Sprint 1 : mise à jour du profil (intention, photo, ville...)
  res.status(501).json({ message: 'Not implemented yet — Sprint 1' });
});

module.exports = router;
