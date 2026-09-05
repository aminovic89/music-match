jest.mock('axios');
const axios = require('axios');
const deezer = require('../services/deezer');

function deezerTrack(id, title, artist = 'Some Artist') {
  return {
    id,
    title,
    artist: { name: artist },
    album: { title: 'Album', cover_medium: 'https://example.com/cover.jpg' },
    preview: 'https://example.com/preview.mp3',
  };
}

describe('deezer.searchTracks — simplification des résultats', () => {
  afterEach(() => jest.clearAllMocks());

  it('filtre les variantes (Live, Acoustic, Remix...) quand une version principale existe', async () => {
    axios.get.mockResolvedValue({
      data: {
        data: [
          deezerTrack(1, 'Blinding Lights'),
          deezerTrack(2, 'Blinding Lights (Acoustic Version)'),
          deezerTrack(3, 'Blinding Lights (Remix)'),
          deezerTrack(4, 'Blinding Lights (Tabata)'),
          deezerTrack(5, 'Blinding Lights (Live)'),
        ],
      },
    });

    const tracks = await deezer.searchTracks('blinding lights', null, 10);

    expect(tracks).toHaveLength(1);
    expect(tracks[0].track_name).toBe('Blinding Lights');
  });

  it('renvoie la liste complète si le filtre éliminerait tous les résultats', async () => {
    axios.get.mockResolvedValue({
      data: {
        data: [
          deezerTrack(1, 'Some Song (Live)'),
          deezerTrack(2, 'Some Song (Remix)'),
        ],
      },
    });

    const tracks = await deezer.searchTracks('some song', null, 10);

    expect(tracks).toHaveLength(2);
  });

  it('ne filtre pas un titre qui contient un mot-clé hors parenthèses', async () => {
    axios.get.mockResolvedValue({
      data: { data: [deezerTrack(1, 'Live to Tell')] },
    });

    const tracks = await deezer.searchTracks('live to tell', null, 10);

    expect(tracks).toHaveLength(1);
    expect(tracks[0].track_name).toBe('Live to Tell');
  });
});
