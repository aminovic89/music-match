// Test unitaire (db mockée, aucune base réelle) des champs de goûts de GET /discover
jest.mock('../database/db', () => ({ query: jest.fn(), withTransaction: jest.fn() }));

const db = require('../database/db');
const { getDiscoverCandidates } = require('../services/matching');

// Profils audio identiques : le score dépasse le seuil même sans artiste/mood en commun
const BASE = { top_genres: ['pop'], avg_energy: 0.7, avg_valence: 0.6, avg_tempo: 120 };

function setup(myProfile, candidates) {
  db.query.mockReset();
  db.query
    .mockResolvedValueOnce({ rows: [{ intent: 'romantic', gender: null, looking_for: null, is_premium: true }] })
    .mockResolvedValueOnce({ rows: [{ ...BASE, ...myProfile }] })
    .mockResolvedValueOnce({
      rows: candidates.map((c, i) => ({
        id: `id-${i}`, first_name: `C${i}`, avatar_url: null, age: 25, city: 'Paris', ...BASE, ...c,
      })),
    });
}

describe('getDiscoverCandidates - goûts partagés', () => {
  it('retourne les artistes et moods en commun, sans requête supplémentaire', async () => {
    setup(
      { top_artists: ['Drake', 'Adele'], top_moods: ['happy', 'energetic'] },
      [{ top_artists: ['Adele', 'Muse', 'Drake'], top_moods: ['energetic', 'chill'] }]
    );
    const [c] = await getDiscoverCandidates('me');
    expect(c.shared_artists).toEqual(['Adele', 'Drake']);
    expect(c.shared_moods).toEqual(['energetic']);
    expect(c.top_artists).toEqual(['Adele', 'Muse', 'Drake']);
    expect(c.top_moods).toEqual(['energetic', 'chill']);
    expect(db.query).toHaveBeenCalledTimes(3);
  });

  it('retourne des tableaux vides si rien en commun', async () => {
    setup(
      { top_artists: ['Drake'], top_moods: ['happy'] },
      [{ top_artists: ['Bach'], top_moods: ['chill'] }]
    );
    const [c] = await getDiscoverCandidates('me');
    expect(c.shared_artists).toEqual([]);
    expect(c.shared_moods).toEqual([]);
    expect(c.top_artists).toEqual(['Bach']);
  });

  it('gère un utilisateur sans artistes/moods (null ou vide)', async () => {
    setup(
      { top_artists: null, top_moods: [] },
      [{ top_artists: ['Drake'], top_moods: null }]
    );
    const [c] = await getDiscoverCandidates('me');
    expect(c.shared_artists).toEqual([]);
    expect(c.shared_moods).toEqual([]);
    expect(c.top_moods).toEqual([]);
  });

  it('ignore la casse et garde la casse du candidat', async () => {
    setup(
      { top_artists: ['drake', 'ADELE'], top_moods: ['HAPPY'] },
      [{ top_artists: ['Drake', 'Adele'], top_moods: ['happy'] }]
    );
    const [c] = await getDiscoverCandidates('me');
    expect(c.shared_artists).toEqual(['Drake', 'Adele']);
    expect(c.shared_moods).toEqual(['happy']);
  });

  it('limite à 5 artistes et 3 moods partagés, top_* à 5 et 3', async () => {
    const artists = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const moods = ['m1', 'm2', 'm3', 'm4', 'm5'];
    setup(
      { top_artists: artists, top_moods: moods },
      [{ top_artists: artists, top_moods: moods }]
    );
    const [c] = await getDiscoverCandidates('me');
    expect(c.shared_artists).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(c.shared_moods).toEqual(['m1', 'm2', 'm3']);
    expect(c.top_artists).toHaveLength(5);
    expect(c.top_moods).toHaveLength(3);
  });
});
