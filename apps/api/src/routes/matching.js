const express = require('express');
const Joi = require('joi');
const { requireAuth } = require('../middleware/auth');
const matching = require('../services/matching');

const router = express.Router();

const likeSchema = Joi.object({
  to_user_id: Joi.string().uuid().required(),
});

function handleMatchingError(err, res, next) {
  if (err instanceof matching.MatchingError) {
    return res.status(err.status).json({ error: err.message });
  }
  next(err);
}

// GET /api/matching/discover — profils à découvrir avec score
router.get('/discover', requireAuth, async (req, res, next) => {
  try {
    const candidates = await matching.getDiscoverCandidates(req.userId);
    res.json({ candidates });
  } catch (err) {
    handleMatchingError(err, res, next);
  }
});

// POST /api/matching/like — liker un profil
router.post('/like', requireAuth, async (req, res, next) => {
  try {
    const { error, value } = likeSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const result = await matching.likeUser(req.userId, value.to_user_id);
    res.json(result);
  } catch (err) {
    handleMatchingError(err, res, next);
  }
});

// GET /api/matching/matches — liste des matchs actifs
router.get('/matches', requireAuth, async (req, res, next) => {
  try {
    const matches = await matching.getUserMatches(req.userId);
    res.json({ matches });
  } catch (err) {
    handleMatchingError(err, res, next);
  }
});

module.exports = router;
