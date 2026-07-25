const db = require('../database/db');
const { computeMatchScore } = require('@music-match/shared/src/scoring');

const DEFAULT_MATCH_THRESHOLD = parseFloat(process.env.DEFAULT_MATCH_THRESHOLD || '0.80');
const PREMIUM_MATCH_THRESHOLD = parseFloat(process.env.PREMIUM_MATCH_THRESHOLD || '0.60');
const DAILY_MATCH_LIMIT = parseInt(process.env.DAILY_MATCH_LIMIT || '5', 10);
const DISCOVER_POOL_SIZE = 50;
const DISCOVER_RESULT_SIZE = 20;

class MatchingError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Clampe le score dans [0, 1] — la similarité cosinus peut légèrement dépasser 1
// à cause de l'arrondi flottant, ce qui violerait le CHECK constraint en base.
function clampScore(score) {
  return Math.min(1, Math.max(0, score));
}

async function getMusicProfile(userId) {
  const result = await db.query(
    `SELECT top_genres, top_artists, avg_energy, avg_valence, avg_tempo, top_moods
     FROM music_profiles WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function getDiscoverCandidates(userId) {
  const meResult = await db.query(
    `SELECT intent, gender, looking_for, is_premium FROM users WHERE id = $1`,
    [userId]
  );
  if (meResult.rows.length === 0) {
    throw new MatchingError(404, 'Utilisateur introuvable');
  }
  const me = meResult.rows[0];

  const myProfile = await getMusicProfile(userId);
  if (!myProfile) {
    throw new MatchingError(404, "Profil musical non créé — importe ta musique avant de découvrir des profils");
  }

  const candidatesResult = await db.query(
    `SELECT u.id, u.first_name, u.avatar_url, u.age, u.city,
            mp.top_genres, mp.top_artists, mp.avg_energy, mp.avg_valence, mp.avg_tempo, mp.top_moods
     FROM users u
     JOIN music_profiles mp ON mp.user_id = u.id
     WHERE u.id != $1
       AND u.intent = $2
       AND ($3::gender_type IS NULL OR u.gender = $3::gender_type)
       AND (u.looking_for IS NULL OR u.looking_for = $4::gender_type)
       AND u.id NOT IN (SELECT to_user_id FROM likes WHERE from_user_id = $1)
       AND u.id NOT IN (
         SELECT CASE WHEN user_a_id = $1 THEN user_b_id ELSE user_a_id END
         FROM matches
         WHERE (user_a_id = $1 OR user_b_id = $1) AND status = 'active' AND expires_at > NOW()
       )
     LIMIT $5`,
    [userId, me.intent, me.looking_for, me.gender, DISCOVER_POOL_SIZE]
  );

  const threshold = me.is_premium ? PREMIUM_MATCH_THRESHOLD : DEFAULT_MATCH_THRESHOLD;

  return candidatesResult.rows
    .map((c) => ({
      id: c.id,
      first_name: c.first_name,
      avatar_url: c.avatar_url,
      age: c.age,
      city: c.city,
      score: clampScore(computeMatchScore(myProfile, c)),
    }))
    .filter((c) => c.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, DISCOVER_RESULT_SIZE);
}

async function getDailyMatchCount(userId) {
  const result = await db.query(
    `SELECT matches_count FROM daily_limits WHERE user_id = $1 AND date = CURRENT_DATE`,
    [userId]
  );
  return result.rows[0]?.matches_count || 0;
}

async function incrementDailyMatchCount(client, userId) {
  await client.query(
    `INSERT INTO daily_limits (user_id, date, matches_count)
     VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (user_id, date)
     DO UPDATE SET matches_count = daily_limits.matches_count + 1`,
    [userId]
  );
}

async function likeUser(fromUserId, toUserId) {
  if (fromUserId === toUserId) {
    throw new MatchingError(400, 'Impossible de te liker toi-même');
  }

  const targetResult = await db.query('SELECT id FROM users WHERE id = $1', [toUserId]);
  if (targetResult.rows.length === 0) {
    throw new MatchingError(404, 'Utilisateur introuvable');
  }

  const myDailyCount = await getDailyMatchCount(fromUserId);
  if (myDailyCount >= DAILY_MATCH_LIMIT) {
    throw new MatchingError(429, 'Limite quotidienne de matchs atteinte, reviens demain !');
  }

  await db.query(
    `INSERT INTO likes (from_user_id, to_user_id) VALUES ($1, $2)
     ON CONFLICT (from_user_id, to_user_id) DO NOTHING`,
    [fromUserId, toUserId]
  );

  const reciprocalResult = await db.query(
    `SELECT id FROM likes WHERE from_user_id = $1 AND to_user_id = $2`,
    [toUserId, fromUserId]
  );
  if (reciprocalResult.rows.length === 0) {
    return { liked: true, matched: false };
  }

  // L'autre personne a peut-être atteint sa limite entre-temps (via d'autres matchs)
  const theirDailyCount = await getDailyMatchCount(toUserId);
  if (theirDailyCount >= DAILY_MATCH_LIMIT) {
    return { liked: true, matched: false };
  }

  const [myProfile, theirProfile] = await Promise.all([
    getMusicProfile(fromUserId),
    getMusicProfile(toUserId),
  ]);
  const score = clampScore(computeMatchScore(myProfile, theirProfile));

  const [userAId, userBId] = fromUserId < toUserId ? [fromUserId, toUserId] : [toUserId, fromUserId];

  const match = await db.withTransaction(async (client) => {
    const insertResult = await client.query(
      `INSERT INTO matches (user_a_id, user_b_id, score)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_a_id, user_b_id) DO NOTHING
       RETURNING id, user_a_id, user_b_id, score, status, matched_at, expires_at`,
      [userAId, userBId, score]
    );

    let matchRow = insertResult.rows[0];
    if (!matchRow) {
      // Déjà créé par un appel concurrent — on récupère la ligne existante
      const existing = await client.query(
        `SELECT id, user_a_id, user_b_id, score, status, matched_at, expires_at
         FROM matches WHERE user_a_id = $1 AND user_b_id = $2`,
        [userAId, userBId]
      );
      matchRow = existing.rows[0];
    } else {
      await client.query(
        `INSERT INTO conversations (match_id) VALUES ($1) ON CONFLICT (match_id) DO NOTHING`,
        [matchRow.id]
      );
      await incrementDailyMatchCount(client, fromUserId);
      await incrementDailyMatchCount(client, toUserId);
    }

    return matchRow;
  });

  return { liked: true, matched: true, match };
}

async function getUserMatches(userId) {
  await db.query(
    `UPDATE matches SET status = 'expired'
     WHERE status = 'active' AND expires_at <= NOW() AND (user_a_id = $1 OR user_b_id = $1)`,
    [userId]
  );

  const result = await db.query(
    `SELECT m.id, m.score, m.matched_at, m.expires_at,
            u.id as user_id, u.first_name, u.avatar_url, u.age, u.city
     FROM matches m
     JOIN users u ON u.id = CASE WHEN m.user_a_id = $1 THEN m.user_b_id ELSE m.user_a_id END
     WHERE (m.user_a_id = $1 OR m.user_b_id = $1)
       AND m.status = 'active' AND m.expires_at > NOW()
     ORDER BY m.matched_at DESC`,
    [userId]
  );

  return result.rows;
}

module.exports = {
  MatchingError,
  getDiscoverCandidates,
  likeUser,
  getUserMatches,
};
