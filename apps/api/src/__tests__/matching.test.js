const request = require('supertest');
const app = require('../app');
const db = require('../database/db');
const { signToken } = require('../utils/jwt');

const testUserIds = [];

async function createUser(label) {
  const email = `matching-test-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@musicmatch.test`;
  const result = await db.query(
    `INSERT INTO users (email, password_hash, first_name, age, intent)
     VALUES ($1, $2, $3, $4, 'romantic') RETURNING id`,
    [email, 'hash', `Test${label}`, 25]
  );
  const id = result.rows[0].id;
  testUserIds.push(id);
  return id;
}

async function createMusicProfile(userId, profile) {
  await db.query(
    `INSERT INTO music_profiles (user_id, top_genres, top_artists, avg_energy, avg_valence, avg_tempo, top_moods)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      userId, profile.top_genres, profile.top_artists,
      profile.avg_energy, profile.avg_valence, profile.avg_tempo, profile.top_moods,
    ]
  );
}

const COMPATIBLE_PROFILE_A = {
  top_genres: ['pop', 'rock'],
  top_artists: ['Drake', 'Adele'],
  avg_energy: 0.7,
  avg_valence: 0.6,
  avg_tempo: 120,
  top_moods: ['happy', 'energetic'],
};

const COMPATIBLE_PROFILE_B = {
  top_genres: ['pop', 'rock'],
  top_artists: ['Drake', 'Adele'],
  avg_energy: 0.72,
  avg_valence: 0.58,
  avg_tempo: 118,
  top_moods: ['happy', 'energetic'],
};

const INCOMPATIBLE_PROFILE = {
  top_genres: ['metal', 'classical'],
  top_artists: ['Metallica', 'Bach'],
  avg_energy: 0.1,
  avg_valence: 0.1,
  avg_tempo: 60,
  top_moods: ['melancholic', 'chill'],
};

let userA, userB, userD, userNoProfile;
let tokenA, tokenB, tokenNoProfile;

beforeAll(async () => {
  userA = await createUser('A');
  userB = await createUser('B');
  userD = await createUser('D');
  userNoProfile = await createUser('NoProfile');

  await createMusicProfile(userA, COMPATIBLE_PROFILE_A);
  await createMusicProfile(userB, COMPATIBLE_PROFILE_B);
  await createMusicProfile(userD, INCOMPATIBLE_PROFILE);

  tokenA = signToken({ sub: userA });
  tokenB = signToken({ sub: userB });
  tokenNoProfile = signToken({ sub: userNoProfile });
});

afterAll(async () => {
  // Les FK ON DELETE CASCADE nettoient likes/matches/conversations/music_profiles/daily_limits
  await db.query('DELETE FROM users WHERE id = ANY($1)', [testUserIds]);
  await db.pool.end();
});

describe('GET /api/matching/discover', () => {
  it('refuse sans token', async () => {
    const res = await request(app).get('/api/matching/discover');
    expect(res.status).toBe(401);
  });

  it("refuse si l'utilisateur n'a pas de profil musical", async () => {
    const res = await request(app)
      .get('/api/matching/discover')
      .set('Authorization', `Bearer ${tokenNoProfile}`);
    expect(res.status).toBe(404);
  });

  it('retourne les candidats compatibles et exclut ceux sous le seuil', async () => {
    const res = await request(app)
      .get('/api/matching/discover')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    const ids = res.body.candidates.map((c) => c.id);
    expect(ids).toContain(userB);
    expect(ids).not.toContain(userD);

    const candidateB = res.body.candidates.find((c) => c.id === userB);
    expect(candidateB.score).toBeGreaterThanOrEqual(0.8);
  });
});

describe('POST /api/matching/like', () => {
  it('refuse sans token', async () => {
    const res = await request(app).post('/api/matching/like').send({ to_user_id: userB });
    expect(res.status).toBe(401);
  });

  it('refuse un to_user_id invalide', async () => {
    const res = await request(app)
      .post('/api/matching/like')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ to_user_id: 'not-a-uuid' });
    expect(res.status).toBe(400);
  });

  it('refuse de se liker soi-même', async () => {
    const res = await request(app)
      .post('/api/matching/like')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ to_user_id: userA });
    expect(res.status).toBe(400);
  });

  it('like simple sans réciprocité ne forme pas de match', async () => {
    const res = await request(app)
      .post('/api/matching/like')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ to_user_id: userB });

    expect(res.status).toBe(200);
    expect(res.body.liked).toBe(true);
    expect(res.body.matched).toBe(false);
  });

  it('le like réciproque forme un match, une conversation et incrémente daily_limits', async () => {
    const res = await request(app)
      .post('/api/matching/like')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ to_user_id: userA });

    expect(res.status).toBe(200);
    expect(res.body.matched).toBe(true);
    expect(res.body.match.score).toBeGreaterThanOrEqual(0.8);
    expect(res.body.match.score).toBeLessThanOrEqual(1);

    const convResult = await db.query(
      'SELECT id FROM conversations WHERE match_id = $1',
      [res.body.match.id]
    );
    expect(convResult.rows).toHaveLength(1);

    const limitsResult = await db.query(
      `SELECT user_id, matches_count FROM daily_limits
       WHERE user_id = ANY($1) AND date = CURRENT_DATE`,
      [[userA, userB]]
    );
    expect(limitsResult.rows).toHaveLength(2);
    limitsResult.rows.forEach((row) => expect(row.matches_count).toBe(1));
  });

  it('refuse un nouveau like au-delà de la limite quotidienne', async () => {
    await db.query(
      `INSERT INTO daily_limits (user_id, date, matches_count) VALUES ($1, CURRENT_DATE, 5)
       ON CONFLICT (user_id, date) DO UPDATE SET matches_count = 5`,
      [userD]
    );

    const res = await request(app)
      .post('/api/matching/like')
      .set('Authorization', `Bearer ${signToken({ sub: userD })}`)
      .send({ to_user_id: userA });

    expect(res.status).toBe(429);
  });
});

describe('GET /api/matching/matches', () => {
  it('refuse sans token', async () => {
    const res = await request(app).get('/api/matching/matches');
    expect(res.status).toBe(401);
  });

  it('retourne le match actif formé plus haut', async () => {
    const res = await request(app)
      .get('/api/matching/matches')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    const ids = res.body.matches.map((m) => m.user_id);
    expect(ids).toContain(userB);
  });

  it('exclut les matchs expirés', async () => {
    const [userA2, userB2] = [userNoProfile, userD]; // paire sans autre match actif
    const [uA, uB] = userA2 < userB2 ? [userA2, userB2] : [userB2, userA2];

    await db.query(
      `INSERT INTO matches (user_a_id, user_b_id, score, status, expires_at)
       VALUES ($1, $2, 0.9, 'active', NOW() - INTERVAL '1 hour')`,
      [uA, uB]
    );

    const res = await request(app)
      .get('/api/matching/matches')
      .set('Authorization', `Bearer ${signToken({ sub: userA2 })}`);

    expect(res.status).toBe(200);
    const ids = res.body.matches.map((m) => m.user_id);
    expect(ids).not.toContain(userB2);
  });
});
