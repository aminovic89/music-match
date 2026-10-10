// Ce test n'a besoin ni de la base ni du store : tout est simulé.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const request = require('supertest');

jest.mock('@vercel/blob', () => ({ put: jest.fn(), del: jest.fn() }));
jest.mock('../database/db', () => ({ query: jest.fn() }));

const { put, del } = require('@vercel/blob');
const db = require('../database/db');
const app = require('../app');
const { signToken } = require('../utils/jwt');

const STORE = 'https://abc.public.blob.vercel-storage.com';
const token = signToken({ sub: 42 });

function mockDb(previousUrl) {
  db.query.mockImplementation((sql, params) => {
    if (sql.startsWith('SELECT avatar_url')) return Promise.resolve({ rows: [{ avatar_url: previousUrl }] });
    if (sql.startsWith('UPDATE users SET avatar_url')) return Promise.resolve({ rows: [{ id: 42, avatar_url: params[0] }] });
    return Promise.resolve({ rows: [] });
  });
}

const send = () =>
  request(app)
    .post('/api/users/me/photo')
    .set('Authorization', `Bearer ${token}`)
    .attach('photo', Buffer.from([1, 2, 3]), { filename: 'p.jpg', contentType: 'image/jpeg' });

describe('POST /api/users/me/photo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    put.mockResolvedValue({ url: `${STORE}/profile-photos/user-42-NEW.jpg` });
    del.mockResolvedValue();
  });

  it('donne une URL unique à chaque envoi (pas de réécriture de la même URL)', async () => {
    mockDb(null);
    const res = await send();
    expect(res.status).toBe(200);
    expect(res.body.user.avatar_url).toBe(`${STORE}/profile-photos/user-42-NEW.jpg`);
    expect(put).toHaveBeenCalledWith(
      'profile-photos/user-42.jpg',
      expect.any(Buffer),
      expect.objectContaining({ addRandomSuffix: true, contentType: 'image/jpeg' })
    );
    expect(del).not.toHaveBeenCalled();
  });

  it("supprime l'ancienne photo lors d'un changement", async () => {
    mockDb(`${STORE}/profile-photos/user-42-OLD.jpg`);
    const res = await send();
    expect(res.status).toBe(200);
    expect(del).toHaveBeenCalledWith(`${STORE}/profile-photos/user-42-OLD.jpg`);
  });

  it("ne supprime pas une URL hors de notre store et n'échoue pas si la suppression échoue", async () => {
    mockDb('https://example.com/profile-photos/x.jpg');
    expect((await send()).status).toBe(200);
    expect(del).not.toHaveBeenCalled();

    mockDb(`${STORE}/profile-photos/user-42-OLD.jpg`);
    del.mockRejectedValue(new Error('boom'));
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect((await send()).status).toBe(200);
  });
});
