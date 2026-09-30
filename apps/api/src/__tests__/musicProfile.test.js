jest.mock('../database/db', () => ({ query: jest.fn(), withTransaction: jest.fn() }));
jest.mock('../services/enrichment', () => ({ enrichTracks: jest.fn() }));

const db = require('../database/db');
const enrichment = require('../services/enrichment');
const { saveTracksAndProfile } = require('../services/musicProfile');

describe('saveTracksAndProfile', () => {
  let client;

  beforeEach(() => {
    client = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    db.withTransaction.mockImplementation((fn) => fn(client));
  });

  afterEach(() => jest.clearAllMocks());

  it('remplace les titres enrichis et enregistre le profil recalculé dans une transaction', async () => {
    enrichment.enrichTracks.mockResolvedValue([
      {
        track_id: '1', track_name: 'Inta Eyh', artist_name: 'Nancy Ajram', source: 'deezer',
        genre: 'ancien', genres: [{ name: 'arabic', weight: 1 }],
        energy: 0.8, valence: 0.7, tempo: 120, danceability: 0.75,
      },
      {
        track_id: '2', track_name: 'Titre manuel', artist_name: 'Inconnu', source: 'manual', genres: [],
      },
    ]);

    const { profile } = await saveTracksAndProfile('user-1', [{ track_id: '1' }, { track_id: '2' }]);

    expect(profile).toMatchObject({ top_genres: ['arabic'], avg_energy: 0.8, avg_tempo: 120 });
    expect(profile.top_moods).toContain('energetic');

    const [deleteCall, insert1, insert2, upsert] = client.query.mock.calls;
    expect(deleteCall[0]).toMatch(/DELETE FROM user_tracks/);
    // Le genre Last.fm remplace l'ancien genre stocké
    expect(insert1[1]).toEqual(['user-1', '1', 'Inta Eyh', 'Nancy Ajram', 'arabic', 0.8, 0.7, 120, 'deezer', 0]);
    expect(insert2[1]).toEqual(['user-1', '2', 'Titre manuel', 'Inconnu', null, null, null, null, 'manual', 1]);
    expect(upsert[0]).toMatch(/INSERT INTO music_profiles/);
    expect(upsert[1][1]).toEqual(['arabic']);
  });
});
