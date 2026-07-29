const axios = require('axios');
const db = require('../database/db');

const DEEZER_APP_ID = process.env.DEEZER_CLIENT_ID;
const DEEZER_SECRET = process.env.DEEZER_CLIENT_SECRET;
const DEEZER_REDIRECT_URI = process.env.DEEZER_REDIRECT_URI;

const DEEZER_AUTH_URL = 'https://connect.deezer.com/oauth/auth.php';
const DEEZER_TOKEN_URL = 'https://connect.deezer.com/oauth/access_token.php';
const DEEZER_API_URL = 'https://api.deezer.com';

const PERMS = 'basic_access,email';

/**
 * Génère l'URL de redirection vers Deezer OAuth
 */
function getAuthUrl(state) {
  const params = new URLSearchParams({
    app_id: DEEZER_APP_ID,
    redirect_uri: DEEZER_REDIRECT_URI,
    perms: PERMS,
    state,
  });
  return `${DEEZER_AUTH_URL}?${params.toString()}`;
}

/**
 * Échange le code d'autorisation contre un access token.
 * Contrairement à Spotify, l'échange se fait en GET, et Deezer ne renvoie
 * du JSON que si on passe explicitement output=json (sinon il renvoie une
 * chaîne "access_token=X&expires=Y" façon query-string).
 */
async function exchangeCode(code) {
  const response = await axios.get(DEEZER_TOKEN_URL, {
    params: {
      app_id: DEEZER_APP_ID,
      secret: DEEZER_SECRET,
      code,
      output: 'json',
    },
  });

  return response.data;
}

/**
 * Récupère le token stocké pour un utilisateur.
 * Pas de refresh token dans le flow Deezer de base — le token est renvoyé
 * tel quel (contrairement à Spotify, où on rafraîchit si expiré).
 */
async function getValidToken(userId) {
  const result = await db.query(
    `SELECT access_token FROM oauth_tokens WHERE user_id = $1 AND provider = 'deezer'`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('Compte Deezer non connecté');
  }

  return result.rows[0].access_token;
}

/**
 * Recherche des titres sur Deezer
 */
async function searchTracks(query, accessToken, limit = 10) {
  const response = await axios.get(`${DEEZER_API_URL}/search`, {
    params: { q: query, access_token: accessToken, limit },
  });

  return (response.data.data || []).map((track) => ({
    track_id: String(track.id),
    track_name: track.title,
    artist_name: track.artist?.name || '',
    album_name: track.album?.title || '',
    preview_url: track.preview || null,
    image_url: track.album?.cover_medium || null,
    source: 'deezer',
  }));
}

module.exports = {
  getAuthUrl,
  exchangeCode,
  getValidToken,
  searchTracks,
};
