const express = require('express');
const Joi = require('joi');
const { requireAuth } = require('../middleware/auth');
const chat = require('../services/chat');

const router = express.Router();

const conversationIdSchema = Joi.string().uuid();

function handleChatError(err, res, next) {
  if (err instanceof chat.ChatError) {
    return res.status(err.status).json({ error: err.message });
  }
  next(err);
}

// GET /api/chat/conversations — liste des conversations
router.get('/conversations', requireAuth, async (req, res, next) => {
  try {
    const conversations = await chat.getUserConversations(req.userId);
    res.json({ conversations });
  } catch (err) {
    handleChatError(err, res, next);
  }
});

// GET /api/chat/conversations/:id/messages
router.get('/conversations/:id/messages', requireAuth, async (req, res, next) => {
  try {
    const { error } = conversationIdSchema.validate(req.params.id);
    if (error) return res.status(400).json({ error: 'id de conversation invalide' });

    const messages = await chat.getConversationMessages(req.params.id, req.userId);
    res.json({ messages });
  } catch (err) {
    handleChatError(err, res, next);
  }
});

module.exports = router;
