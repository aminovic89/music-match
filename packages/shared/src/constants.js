/**
 * Constantes partagées — extraites du document de conception
 */
module.exports = {
  DEFAULT_MATCH_THRESHOLD: 0.80,
  PREMIUM_MATCH_THRESHOLD: 0.60,
  DAILY_MATCH_LIMIT: 5,
  MESSAGE_TTL_HOURS: 24,
  MATCH_EXPIRY_HOURS: 48,
  MIN_AGE: 18,
  MAX_TRACKS: 20,
  INTENTS: ['romantic', 'friendship'],
  TRACK_SOURCES: ['spotify', 'deezer', 'soundcloud', 'manual'],
};
