const axios = require('axios');
const db = require('../database/db');

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-top-read',
  'playlist-read-private',
].join(' ');

/**
 * Génère l'URL de redirection vers Spotify OAuth
 */
function getAuthUrl(state) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: SPOTIFY_CLIENT_ID,
    scope: SCOPES,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    state,
  });
  return `${SPOTIFY_AUTH_URL}?${params.toString()}`;
}

/**
 * Échange le code d'autorisation contre un access token
 */
async function exchangeCode(code) {
  const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');

  const response = await axios.post(SPOTIFY_TOKEN_URL,
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: SPOTIFY_REDIRECT_URI,
    }),
    {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  return response.data;
}

/**
 * Rafraîchit un access token expiré
 */
async function refreshToken(refreshTokenValue) {
  const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');

  const response = await axios.post(SPOTIFY_TOKEN_URL,
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshTokenValue,
    }),
    {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  return response.data;
}

/**
 * Récupère un token valide pour un utilisateur (rafraîchit si nécessaire)
 */
async function getValidToken(userId) {
  const result = await db.query(
    `SELECT access_token, refresh_token, expires_at
     FROM oauth_tokens WHERE user_id = $1 AND provider = 'spotify'`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('Compte Spotify non connecté');
  }

  const { access_token, refresh_token, expires_at } = result.rows[0];

  // Rafraîchir si expiré (avec 5 min de marge)
  if (new Date(expires_at) < new Date(Date.now() + 5 * 60 * 1000)) {
    const newTokens = await refreshToken(refresh_token);
    const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000);

    await db.query(
      `UPDATE oauth_tokens
       SET access_token = $1, expires_at = $2
       WHERE user_id = $3 AND provider = 'spotify'`,
      [newTokens.access_token, newExpiresAt, userId]
    );

    return newTokens.access_token;
  }

  return access_token;
}

/**
 * Recherche des titres sur Spotify (option A — pas de saisie libre)
 */
async function searchTracks(query, accessToken, limit = 10) {
  const response = await axios.get(`${SPOTIFY_API_URL}/search`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { q: query, type: 'track', limit, market: 'TN' },
  });

  return response.data.tracks.items.map((track) => ({
    track_id: track.id,
    track_name: track.name,
    artist_name: track.artists[0]?.name || '',
    album_name: track.album?.name || '',
    preview_url: track.preview_url,
    image_url: track.album?.images?.[0]?.url || null,
    source: 'spotify',
  }));
}

/**
 * Récupère les audio features d'une liste de track IDs
 */
async function getAudioFeatures(trackIds, accessToken) {
  const response = await axios.get(`${SPOTIFY_API_URL}/audio-features`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { ids: trackIds.join(',') },
  });

  return response.data.audio_features.filter(Boolean);
}

/**
 * Calcule le profil musical à partir des tracks et audio features
 */
function computeMusicProfile(tracks, audioFeatures) {
  // Moyennes des audio features
  const avg = (key) => {
    const vals = audioFeatures.map((f) => f[key]).filter((v) => v != null);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };

  const avg_energy = avg('energy');
  const avg_valence = avg('valence');
  const avg_tempo = avg('tempo');
  const avg_danceability = avg('danceability');

  // Artistes dominants (top 5)
  const artistCount = {};
  tracks.forEach((t) => {
    artistCount[t.artist_name] = (artistCount[t.artist_name] || 0) + 1;
  });
  const top_artists = Object.entries(artistCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  // Genres extraits depuis les tracks (si disponibles)
  const genreCount = {};
  tracks.forEach((t) => {
    if (t.genre) {
      genreCount[t.genre] = (genreCount[t.genre] || 0) + 1;
    }
  });
  const top_genres = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  // Moods dérivés des audio features
  const top_moods = deriveMoods(avg_energy, avg_valence, avg_danceability);

  return { avg_energy, avg_valence, avg_tempo, top_artists, top_genres, top_moods };
}

/**
 * Dérive les moods à partir des audio features
 */
function deriveMoods(energy, valence, danceability) {
  const moods = [];
  if (energy > 0.7) moods.push('energetic');
  if (energy < 0.4) moods.push('chill');
  if (valence > 0.6) moods.push('happy');
  if (valence < 0.35) moods.push('melancholic');
  if (danceability > 0.7) moods.push('danceable');
  if (energy > 0.6 && valence > 0.5) moods.push('intense');
  if (valence > 0.5 && energy < 0.6) moods.push('romantic');
  return moods.length > 0 ? moods : ['neutral'];
}

module.exports = {
  getAuthUrl,
  exchangeCode,
  getValidToken,
  searchTracks,
  getAudioFeatures,
  computeMusicProfile,
  deriveMoods,
};
