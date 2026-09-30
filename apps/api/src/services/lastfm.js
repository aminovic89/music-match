const axios = require('axios');

const LASTFM_API_URL = 'https://ws.audioscrobbler.com/2.0/';
const TIMEOUT_MS = 5000;

// Tags Last.fm en dessous de ce poids (sur 100) : trop marginaux, souvent du bruit
const MIN_TAG_COUNT = 5;
const MAX_TAGS_PER_ARTIST = 6;

// Tags fréquents qui ne décrivent pas un genre
const IGNORED_TAGS = new Set([
  'all', 'seen live', 'favorites', 'favourites', 'favorite', 'favourite',
  'love', 'awesome', 'beautiful', 'good', 'best', 'my favorite', 'under 2000 listeners',
]);

/**
 * Nettoie les tags bruts renvoyés par artist.getTopTags : minuscules, poids
 * minimum, sans le nom de l'artiste lui-même ni les tags non musicaux.
 * Renvoie [{ name, weight }] avec weight dans ]0, 1].
 */
function cleanTags(rawTags, artistName) {
  const artistKey = (artistName || '').trim().toLowerCase();
  const seen = new Set();
  const out = [];
  for (const tag of rawTags || []) {
    const name = String(tag.name || '').trim().toLowerCase();
    const count = Number(tag.count) || 0;
    if (!name || count < MIN_TAG_COUNT) continue;
    if (name === artistKey || IGNORED_TAGS.has(name) || seen.has(name)) continue;
    seen.add(name);
    out.push({ name, weight: count / 100 });
    if (out.length >= MAX_TAGS_PER_ARTIST) break;
  }
  return out;
}

/**
 * Genres d'un artiste d'après ses tags Last.fm. Renvoie [] sans clé API
 * configurée ou si l'artiste est inconnu.
 */
async function getArtistGenres(artistName) {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey || !artistName) return [];

  const response = await axios.get(LASTFM_API_URL, {
    params: {
      method: 'artist.gettoptags',
      artist: artistName,
      autocorrect: 1,
      api_key: apiKey,
      format: 'json',
    },
    timeout: TIMEOUT_MS,
  });

  if (response.data?.error) return [];
  return cleanTags(response.data?.toptags?.tag, artistName);
}

module.exports = { getArtistGenres, cleanTags };
