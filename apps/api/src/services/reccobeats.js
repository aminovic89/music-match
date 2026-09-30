const axios = require('axios');

// API publique (sans clé) — remplaçant de l'endpoint /audio-features de
// Spotify, fermé aux nouvelles apps depuis novembre 2024. Accepte des ISRC
// comme des IDs Spotify dans le paramètre `ids`.
const RECCOBEATS_API_URL = 'https://api.reccobeats.com/v1';
const BATCH_SIZE = 40;
const TIMEOUT_MS = 8000;

// Extrait l'ID Spotify de l'URL renvoyée dans `href` (open.spotify.com/track/<id>)
function spotifyIdFromHref(href) {
  const m = typeof href === 'string' && href.match(/open\.spotify\.com\/track\/([A-Za-z0-9]+)/);
  return m ? m[1] : null;
}

/**
 * Récupère les audio features d'une liste d'identifiants (ISRC ou IDs Spotify).
 * Renvoie une map identifiant → features. ReccoBeats peut renvoyer plusieurs
 * versions d'un même titre (même ISRC) : on garde la première.
 */
async function getAudioFeatures(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  const byId = {};

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE);
    const response = await axios.get(`${RECCOBEATS_API_URL}/audio-features`, {
      params: { ids: batch.join(',') },
      timeout: TIMEOUT_MS,
    });

    for (const f of response.data?.content || []) {
      const features = {
        energy: f.energy ?? null,
        valence: f.valence ?? null,
        tempo: f.tempo ?? null,
        danceability: f.danceability ?? null,
      };
      const keys = [f.isrc, spotifyIdFromHref(f.href)].filter(Boolean);
      for (const key of keys) {
        if (!byId[key]) byId[key] = features;
      }
    }
  }

  return byId;
}

module.exports = { getAudioFeatures };
