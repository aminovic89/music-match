const deezer = require('./deezer');
const reccobeats = require('./reccobeats');
const lastfm = require('./lastfm');

/**
 * Complète les titres sélectionnés avec les données nécessaires au profil
 * musical, depuis des sources externes :
 *   - audio features (energy, valence, tempo, danceability) : ReccoBeats,
 *     interrogé par ISRC (titres Deezer) ou ID Spotify (titres Spotify) ;
 *   - genres : tags Last.fm de l'artiste.
 * Chaque source est optionnelle : en cas d'échec, les titres restent sans la
 * donnée correspondante plutôt que de faire échouer l'enregistrement.
 */
async function enrichTracks(tracks) {
  const [featuresByTrack, genresByArtist] = await Promise.all([
    fetchAudioFeatures(tracks),
    fetchArtistGenres(tracks),
  ]);

  return tracks.map((t) => ({
    ...t,
    ...(featuresByTrack[t.track_id] || {}),
    genres: genresByArtist[artistKey(t.artist_name)] || [],
  }));
}

function artistKey(name) {
  return (name || '').trim().toLowerCase();
}

async function fetchAudioFeatures(tracks) {
  try {
    const deezerIds = tracks.filter((t) => t.source === 'deezer').map((t) => t.track_id);
    const isrcs = deezerIds.length > 0 ? await deezer.getTrackIsrcs(deezerIds) : {};

    // Identifiant à envoyer à ReccoBeats pour chaque titre
    const lookupId = {};
    for (const t of tracks) {
      if (t.source === 'deezer' && isrcs[t.track_id]) lookupId[t.track_id] = isrcs[t.track_id];
      if (t.source === 'spotify') lookupId[t.track_id] = t.track_id;
    }

    const ids = Object.values(lookupId);
    if (ids.length === 0) return {};

    const features = await reccobeats.getAudioFeatures(ids);
    const byTrack = {};
    for (const [trackId, id] of Object.entries(lookupId)) {
      if (features[id]) byTrack[trackId] = features[id];
    }
    return byTrack;
  } catch (err) {
    console.log('Audio features non disponibles —', err.message);
    return {};
  }
}

async function fetchArtistGenres(tracks) {
  const artists = new Map();
  for (const t of tracks) {
    const key = artistKey(t.artist_name);
    if (key && !artists.has(key)) artists.set(key, t.artist_name.trim());
  }

  const entries = await Promise.all(
    [...artists].map(async ([key, name]) => {
      try {
        return [key, await lastfm.getArtistGenres(name)];
      } catch (err) {
        console.log(`Genres Last.fm non disponibles pour ${name} —`, err.message);
        return [key, []];
      }
    })
  );
  return Object.fromEntries(entries);
}

module.exports = { enrichTracks };
