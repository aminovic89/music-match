const express = require('express');
const router = express.Router();

// GET /api/chat/conversations — liste des conversations
router.get('/conversations', (req, res) => {
  // TODO Sprint 4 : retourner les conversations actives
  res.status(501).json({ message: 'Not implemented yet — Sprint 4' });
});

// GET /api/chat/conversations/:id/messages
router.get('/conversations/:id/messages', (req, res) => {
  // TODO Sprint 4 : retourner les messages non expirés
  res.status(501).json({ message: 'Not implemented yet — Sprint 4' });
});

module.exports = router;
