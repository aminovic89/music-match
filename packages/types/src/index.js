/**
 * Enums et types partagés — correspondent aux types PostgreSQL
 * définis dans apps/api/src/database/init.sql
 */
module.exports = {
  IntentType:  { ROMANTIC: 'romantic', FRIENDSHIP: 'friendship' },
  GenderType:  { MALE: 'male', FEMALE: 'female', OTHER: 'other' },
  SourceType:  { SPOTIFY: 'spotify', DEEZER: 'deezer', SOUNDCLOUD: 'soundcloud', MANUAL: 'manual' },
  MatchStatus: { PENDING: 'pending', ACTIVE: 'active', EXPIRED: 'expired', BLOCKED: 'blocked' },
  OAuthProvider: { SPOTIFY: 'spotify', DEEZER: 'deezer', SOUNDCLOUD: 'soundcloud' },
};
