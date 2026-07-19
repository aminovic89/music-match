const request = require('supertest');
const app = require('../app');
const db = require('../database/db');
const { signToken } = require('../utils/jwt');
const spotify = require('../services/spotify');

// Mock le service Spotify pour ne pas appeler l'API réelle
jest.mock('../services/spotify', () => ({
  getAuthUrl: jest.fn(() => 'https://accounts.spotify.com/authorize?mock=true'),
  getValidToken: jest.fn(),
  searchTracks: jest.fn(),
  getAudioFeatures: jest.fn(),
  computeMusicProfile: jest.fn(),
  deriveMoods: jest.fn(),
  exchangeCode: jest.fn(),
}));

let testUserId;
let testToken;

beforeAll(async () => {
  // Créer un utilisateur de test
  const result = await db.query(
    `INSERT INTO users (email, password_hash, first_name, age, intent)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [`music-test-${Date.now()}@musicmatch.test`, 'hash', 'MusicTest', 25, 'romantic']
  );
  testUserId = result.rows[0].id;
  testToken = signToken({ sub: testUserId });
});

afterAll(async () => {
  await db.query('DELETE FROM user_tracks WHERE user_id = $1', [testUserId]);
  await db.query('DELETE FROM music_profiles WHERE user_id = $1', [testUserId]);
  await db.query('DELETE FROM users WHERE id = $1', [testUserId]);
  await db.pool.end();
});

describe('GET /api/auth/spotify', () => {
  it('redirige vers Spotify OAuth', async () => {
    const res = await request(app).get('/api/auth/spotify');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('accounts.spotify.com');
  });
});

describe('GET /api/music/search', () => {
  it('refuse sans token', async () => {
    const res = await request(app).get('/api/music/search?q=test');
    expect(res.status).toBe(401);
  });

  it('refuse une requête trop courte', async () => {
    spotify.getValidToken.mockResolvedValue('mock-token');
    const res = await request(app)
      .get('/api/music/search?q=a')
      .set('Authorization', `Bearer ${testToken}`);
    expect(res.status).toBe(400);
  });

  it('retourne des résultats quand Spotify répond', async () => {
    spotify.getValidToken.mockResolvedValue('mock-token');
    spotify.searchTracks.mockResolvedValue([
      { track_id: 'abc123', track_name: 'Test Song', artist_name: 'Test Artist', source: 'spotify' },
    ]);

    const res = await request(app)
      .get('/api/music/search?q=test song')
      .set('Authorization', `Bearer ${testToken}`);

    expect(res.status).toBe(200);
    expect(res.body.tracks).toHaveLength(1);
    expect(res.body.tracks[0].track_name).toBe('Test Song');
  });

  it('retourne 401 si Spotify non connecté', async () => {
    spotify.getValidToken.mockRejectedValue(new Error('Compte Spotify non connecté'));

    const res = await request(app)
      .get('/api/music/search?q=test song')
      .set('Authorization', `Bearer ${testToken}`);

    expect(res.status).toBe(401);
    expect(res.body.auth_url).toBe('/api/auth/spotify');
  });
});

describe('POST /api/music/tracks', () => {
  it('refuse sans token', async () => {
    const res = await request(app).post('/api/music/tracks').send([]);
    expect(res.status).toBe(401);
  });

  it('enregistre les tracks et calcule le profil', async () => {
    spotify.getValidToken.mockResolvedValue('mock-token');
    spotify.getAudioFeatures.mockResolvedValue([
      { id: 'track1', energy: 0.8, valence: 0.6, tempo: 120, danceability: 0.7 },
    ]);
    spotify.computeMusicProfile.mockReturnValue({
      top_genres: ['pop', 'r&b'],
      top_artists: ['Artist 1'],
      avg_energy: 0.8,
      avg_valence: 0.6,
      avg_tempo: 120,
      top_moods: ['energetic', 'happy'],
    });

    const tracks = [
      { track_id: 'track1', track_name: 'Song 1', artist_name: 'Artist 1', source: 'spotify' },
    ];

    const res = await request(app)
      .post('/api/music/tracks')
      .set('Authorization', `Bearer ${testToken}`)
      .send(tracks);

    expect(res.status).toBe(200);
    expect(res.body.profile).toBeDefined();
    expect(res.body.profile.top_moods).toContain('energetic');
  });

  it('refuse plus de 20 titres', async () => {
    const tracks = Array(21).fill({
      track_id: 'x', track_name: 'Song', artist_name: 'Artist', source: 'spotify',
    });

    const res = await request(app)
      .post('/api/music/tracks')
      .set('Authorization', `Bearer ${testToken}`)
      .send(tracks);

    expect(res.status).toBe(400);
  });
});

describe('GET /api/music/profile', () => {
  it('refuse sans token', async () => {
    const res = await request(app).get('/api/music/profile');
    expect(res.status).toBe(401);
  });

  it('retourne le profil après sauvegarde des tracks', async () => {
    const res = await request(app)
      .get('/api/music/profile')
      .set('Authorization', `Bearer ${testToken}`);

    expect(res.status).toBe(200);
    expect(res.body.profile).toBeDefined();
    expect(res.body.tracks).toBeDefined();
  });
});

describe('GET /api/music/spotify/status', () => {
  it('indique que Spotify n\'est pas connecté', async () => {
    const res = await request(app)
      .get('/api/music/spotify/status')
      .set('Authorization', `Bearer ${testToken}`);

    expect(res.status).toBe(200);
    expect(res.body.connected).toBe(false);
  });
});

describe('deriveMoods', () => {
  it('détecte energetic pour haute énergie', () => {
    const realSpotify = jest.requireActual('../services/spotify');
    const moods = realSpotify.deriveMoods(0.8, 0.5, 0.6);
    expect(moods).toContain('energetic');
  });

  it('détecte happy pour haute valence', () => {
    const realSpotify = jest.requireActual('../services/spotify');
    const moods = realSpotify.deriveMoods(0.5, 0.7, 0.5);
    expect(moods).toContain('happy');
  });

  it('détecte chill pour basse énergie', () => {
    const realSpotify = jest.requireActual('../services/spotify');
    const moods = realSpotify.deriveMoods(0.3, 0.5, 0.4);
    expect(moods).toContain('chill');
  });
});
