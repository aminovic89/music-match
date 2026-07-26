const request = require('supertest');
const app = require('../app');
const db = require('../database/db');
const { signToken } = require('../utils/jwt');

const testUserIds = [];
let userA, userB, userC;
let tokenA, tokenC;
let conversationId;

async function createUser(label) {
  const email = `chat-test-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@musicmatch.test`;
  const result = await db.query(
    `INSERT INTO users (email, password_hash, first_name, age, intent)
     VALUES ($1, $2, $3, $4, 'romantic') RETURNING id`,
    [email, 'hash', `Chat${label}`, 25]
  );
  const id = result.rows[0].id;
  testUserIds.push(id);
  return id;
}

beforeAll(async () => {
  userA = await createUser('A');
  userB = await createUser('B');
  userC = await createUser('C');
  tokenA = signToken({ sub: userA });
  tokenC = signToken({ sub: userC });

  const [uA, uB] = userA < userB ? [userA, userB] : [userB, userA];
  const matchResult = await db.query(
    `INSERT INTO matches (user_a_id, user_b_id, score) VALUES ($1, $2, 0.9) RETURNING id`,
    [uA, uB]
  );
  const matchId = matchResult.rows[0].id;

  const convResult = await db.query(
    `INSERT INTO conversations (match_id) VALUES ($1) RETURNING id`,
    [matchId]
  );
  conversationId = convResult.rows[0].id;

  await db.query(
    `INSERT INTO messages (conversation_id, sender_id, content, sent_at, expires_at)
     VALUES ($1, $2, 'Salut !', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '23 hours')`,
    [conversationId, userB]
  );
  await db.query(
    `INSERT INTO messages (conversation_id, sender_id, content, sent_at, expires_at)
     VALUES ($1, $2, 'Message expiré', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day')`,
    [conversationId, userB]
  );
});

afterAll(async () => {
  await db.query('DELETE FROM users WHERE id = ANY($1)', [testUserIds]);
  await db.pool.end();
});

describe('GET /api/chat/conversations', () => {
  it('refuse sans token', async () => {
    const res = await request(app).get('/api/chat/conversations');
    expect(res.status).toBe(401);
  });

  it('retourne la conversation avec aperçu et non-lus', async () => {
    const res = await request(app)
      .get('/api/chat/conversations')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    const conv = res.body.conversations.find((c) => c.id === conversationId);
    expect(conv).toBeDefined();
    expect(conv.user.id).toBe(userB);
    expect(conv.unread_count).toBe(1);
    expect(conv.last_message.content).toBe('Salut !');
  });

  it('ne retourne rien pour un tiers non concerné', async () => {
    const res = await request(app)
      .get('/api/chat/conversations')
      .set('Authorization', `Bearer ${tokenC}`);

    expect(res.status).toBe(200);
    expect(res.body.conversations.find((c) => c.id === conversationId)).toBeUndefined();
  });
});

describe('GET /api/chat/conversations/:id/messages', () => {
  it('refuse sans token', async () => {
    const res = await request(app).get(`/api/chat/conversations/${conversationId}/messages`);
    expect(res.status).toBe(401);
  });

  it('refuse un id invalide', async () => {
    const res = await request(app)
      .get('/api/chat/conversations/not-a-uuid/messages')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(400);
  });

  it("refuse un tiers qui n'est pas dans la conversation", async () => {
    const res = await request(app)
      .get(`/api/chat/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${tokenC}`);
    expect(res.status).toBe(403);
  });

  it('retourne les messages non expirés et marque comme lu', async () => {
    const res = await request(app)
      .get(`/api/chat/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(1);
    expect(res.body.messages[0].content).toBe('Salut !');

    const check = await db.query(
      `SELECT is_read FROM messages WHERE conversation_id = $1 AND sender_id = $2 AND content = 'Salut !'`,
      [conversationId, userB]
    );
    expect(check.rows[0].is_read).toBe(true);
  });

  it('reflète le compteur non-lus mis à jour après lecture', async () => {
    const res = await request(app)
      .get('/api/chat/conversations')
      .set('Authorization', `Bearer ${tokenA}`);
    const conv = res.body.conversations.find((c) => c.id === conversationId);
    expect(conv.unread_count).toBe(0);
  });

  it('404 sur une conversation inexistante', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await request(app)
      .get(`/api/chat/conversations/${fakeId}/messages`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(404);
  });
});
