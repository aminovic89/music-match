jest.mock('axios');
const axios = require('axios');
const lastfm = require('../services/lastfm');
const reccobeats = require('../services/reccobeats');
const deezer = require('../services/deezer');
const { enrichTracks } = require('../services/enrichment');
const { computeMusicProfile } = require('../services/spotify');

describe('lastfm.cleanTags', () => {
  it('filtre le nom de l\'artiste, les tags non musicaux et les poids faibles', () => {
    const tags = lastfm.cleanTags(
      [
        { name: 'arabic', count: 100 },
        { name: 'Elissa', count: 9 },
        { name: 'All', count: 50 },
        { name: 'Lebanese', count: 57 },
        { name: 'Middle Eastern', count: 1 },
      ],
      'Elissa'
    );

    expect(tags).toEqual([
      { name: 'arabic', weight: 1 },
      { name: 'lebanese', weight: 0.57 },
    ]);
  });
});

describe('lastfm.getArtistGenres', () => {
  const originalKey = process.env.LASTFM_API_KEY;
  afterEach(() => {
    process.env.LASTFM_API_KEY = originalKey;
    jest.clearAllMocks();
  });

  it('renvoie [] sans clé API, sans appeler Last.fm', async () => {
    delete process.env.LASTFM_API_KEY;
    expect(await lastfm.getArtistGenres('Elissa')).toEqual([]);
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('renvoie [] quand Last.fm répond une erreur (artiste inconnu)', async () => {
    process.env.LASTFM_API_KEY = 'test-key';
    axios.get.mockResolvedValue({ data: { error: 6, message: 'The artist you supplied could not be found' } });
    expect(await lastfm.getArtistGenres('Inconnu')).toEqual([]);
  });
});

describe('reccobeats.getAudioFeatures', () => {
  afterEach(() => jest.clearAllMocks());

  it('indexe par ISRC et par ID Spotify, en gardant la première version d\'un titre', async () => {
    axios.get.mockResolvedValue({
      data: {
        content: [
          { isrc: 'AEAB20400168', href: 'https://open.spotify.com/track/abc123', energy: 0.868, valence: 0.781, tempo: 136, danceability: 0.735 },
          { isrc: 'AEAB20400168', href: 'https://open.spotify.com/track/def456', energy: 0.716, valence: 0.776, tempo: 136, danceability: 0.744 },
        ],
      },
    });

    const features = await reccobeats.getAudioFeatures(['AEAB20400168', 'abc123']);

    expect(features.AEAB20400168.energy).toBe(0.868);
    expect(features.abc123.energy).toBe(0.868);
    expect(features.def456.energy).toBe(0.716);
    expect(axios.get).toHaveBeenCalledTimes(1);
  });
});

describe('deezer.getTrackIsrcs', () => {
  afterEach(() => jest.clearAllMocks());

  it('omet les titres en échec sans faire échouer les autres', async () => {
    axios.get.mockImplementation((url) =>
      url.endsWith('/track/1')
        ? Promise.resolve({ data: { isrc: 'ISRC1' } })
        : Promise.reject(new Error('timeout'))
    );

    expect(await deezer.getTrackIsrcs(['1', '2'])).toEqual({ 1: 'ISRC1' });
  });
});

describe('enrichTracks', () => {
  const originalKey = process.env.LASTFM_API_KEY;
  beforeEach(() => { process.env.LASTFM_API_KEY = 'test-key'; });
  afterEach(() => {
    process.env.LASTFM_API_KEY = originalKey;
    jest.clearAllMocks();
  });

  it('ajoute audio features (via ISRC Deezer) et genres Last.fm aux titres', async () => {
    axios.get.mockImplementation((url, config) => {
      if (url === 'https://api.deezer.com/track/3171734') {
        return Promise.resolve({ data: { isrc: 'AEAB20400168' } });
      }
      if (url.includes('reccobeats')) {
        return Promise.resolve({
          data: { content: [{ isrc: 'AEAB20400168', energy: 0.87, valence: 0.78, tempo: 136, danceability: 0.74 }] },
        });
      }
      if (url.includes('audioscrobbler')) {
        return Promise.resolve({
          data: { toptags: { tag: [{ name: 'arabic', count: 100 }, { name: config.params.artist, count: 9 }] } },
        });
      }
      return Promise.reject(new Error(`URL inattendue : ${url}`));
    });

    const [track] = await enrichTracks([
      { track_id: '3171734', track_name: 'Inta Eyh', artist_name: 'Nancy Ajram', source: 'deezer' },
    ]);

    expect(track).toMatchObject({ energy: 0.87, valence: 0.78, tempo: 136, danceability: 0.74 });
    expect(track.genres).toEqual([{ name: 'arabic', weight: 1 }]);
  });

  it('continue sans données si les sources externes échouent', async () => {
    axios.get.mockRejectedValue(new Error('réseau indisponible'));

    const [track] = await enrichTracks([
      { track_id: '1', track_name: 'Titre', artist_name: 'Artiste', source: 'deezer' },
    ]);

    expect(track.energy).toBeUndefined();
    expect(track.genres).toEqual([]);
  });
});

describe('computeMusicProfile — genres pondérés', () => {
  it('cumule les poids des tags sur chaque titre', () => {
    const profile = computeMusicProfile(
      [
        { artist_name: 'A', genres: [{ name: 'pop', weight: 0.3 }, { name: 'arabic', weight: 1 }] },
        { artist_name: 'A', genres: [{ name: 'pop', weight: 0.3 }, { name: 'arabic', weight: 1 }] },
        { artist_name: 'B', genres: [{ name: 'egyptian', weight: 0.5 }, { name: 'arabic', weight: 1 }] },
      ],
      []
    );

    expect(profile.top_genres).toEqual(['arabic', 'pop', 'egyptian']);
  });
});
