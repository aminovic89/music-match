const request = require('supertest');
const app = require('../app');
const db = require('../database/db');

const testUser = {
  email: `test-${Date.now()}@musicmatch.test`,
  password: 'password123',
  first_name: 'Test',
  age: 25,
  intent: 'romantic',
};

afterAll(async () => {
  await db.query('DELETE FROM users WHERE email = $1', [testUser.email]);
  await db.pool.end();
});

describe('POST /api/auth/register', () => {
  it('crée un nouvel utilisateur et renvoie un token', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it('refuse un email déjà utilisé', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);
    expect(res.status).toBe(409);
  });

  it('refuse un age inférieur à 18 ans', async () => {
    const res = await request(app).post('/api/auth/register').send({
      ...testUser,
      email: `under18-${Date.now()}@musicmatch.test`,
      age: 16,
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('connecte avec les bons identifiants', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('refuse un mauvais mot de passe', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/users/me', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });
    token = res.body.token;
  });

  it('refuse sans token', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });

  it('retourne le profil avec un token valide', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testUser.email);
  });
});

describe('PATCH /api/users/me', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });
    token = res.body.token;
  });

  it('met à jour la ville', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ city: 'Tunis' });
    expect(res.status).toBe(200);
    expect(res.body.user.city).toBe('Tunis');
  });

  it('refuse un age inférieur à 18', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ age: 15 });
    expect(res.status).toBe(400);
  });
});
