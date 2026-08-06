const express = require('express');
const Joi = require('joi');
const db = require('../database/db');
const { requireAuth } = require('../middleware/auth');
const spotify = require('../services/spotify');
const deezer = require('../services/deezer');

const router = express.Router();

const tracksSchema = Joi.array().items(
  Joi.object({
    track_id: Joi.string().required(),
    track_name: Joi.string().required(),
    artist_name: Joi.string().allow('', null),
    genre: Joi.string().allow('', null),
    source: Joi.string().valid('spotify', 'deezer', 'soundcloud', 'manual').required(),
    // Champs renvoyés par les résultats de recherche Spotify/Deezer
    // (spotify.searchTracks / deezer.searchTracks) mais non utilisés côté DB.
    album_name: Joi.string().allow('', null),
    preview_url: Joi.string().allow('', null),
    image_url: Joi.string().allow('', null),
  })
).min(1).max(20);

const SEARCH_PROVIDERS = { spotify, deezer };
// Deezer expose une recherche publique (pas besoin de compte connecté) —
// contrairement à Spotify, qui exige un token utilisateur valide.
const PUBLIC_SEARCH_SOURCES = new Set(['deezer']);

// GET /api/music/search?q=...&source=spotify|deezer — recherche live (option A)
router.get('/search', requireAuth, async (req, res, next) => {
  try {
    const { q, limit = 10, source = 'spotify' } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Requête de recherche trop courte (min 2 caractères)' });
    }

    const provider = SEARCH_PROVIDERS[source];
    if (!provider) {
      return res.status(400).json({ error: `Source invalide : ${source}` });
    }

    let accessToken = null;
    if (!PUBLIC_SEARCH_SOURCES.has(source)) {
      try {
        accessToken = await provider.getValidToken(req.userId);
      } catch (_err) {
        return res.status(401).json({
          error: `Compte ${source} non connecté`,
          auth_url: `/api/auth/${source}`,
        });
      }
    }

    const tracks = await provider.searchTracks(q.trim(), accessToken, parseInt(limit));
    res.json({ tracks });
  } catch (err) {
    next(err);
  }
});

// GET /api/music/spotify/top-tracks — import automatique post-connexion
router.get('/spotify/top-tracks', requireAuth, async (req, res, next) => {
  try {
    const accessToken = await spotify.getValidToken(req.userId);
    const tracks = await spotify.getTopTracks(accessToken, 20);
    res.json({ tracks });
  } catch (err) {
    if (err.message === 'Compte Spotify non connecté') {
      return res.status(401).json({ error: err.message, auth_url: '/api/auth/spotify' });
    }
    next(err);
  }
});

// POST /api/music/tracks — enregistre les 20 titres sélectionnés
router.post('/tracks', requireAuth, async (req, res, next) => {
  try {
    const { error, value: tracks } = tracksSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    // Récupérer les audio features pour les titres Spotify
    const spotifyTrackIds = tracks
      .filter((t) => t.source === 'spotify')
      .map((t) => t.track_id);

    let audioFeaturesMap = {};
    if (spotifyTrackIds.length > 0) {
      try {
        const accessToken = await spotify.getValidToken(req.userId);
        const features = await spotify.getAudioFeatures(spotifyTrackIds, accessToken);
        features.forEach((f) => { audioFeaturesMap[f.id] = f; });
      } catch (_err) {
        // Si pas de token Spotify, on continue sans audio features
        console.log('Audio features non disponibles — token Spotify manquant');
      }
    }

    // Supprimer les anciens tracks
    await db.query('DELETE FROM user_tracks WHERE user_id = $1', [req.userId]);

    // Insérer les nouveaux tracks
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      const features = audioFeaturesMap[track.track_id] || {};

      await db.query(
        `INSERT INTO user_tracks
          (user_id, track_id, track_name, artist_name, genre,
           energy, valence, tempo, source, order_index)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          req.userId, track.track_id, track.track_name,
          track.artist_name || null, track.genre || null,
          features.energy || null, features.valence || null,
          features.tempo || null, track.source, i,
        ]
      );
    }

    // Calculer et stocker le profil musical
    const tracksWithFeatures = tracks.map((t) => ({
      ...t,
      ...(audioFeaturesMap[t.track_id] || {}),
    }));
    const audioFeaturesList = Object.values(audioFeaturesMap);
    const profile = spotify.computeMusicProfile(tracksWithFeatures, audioFeaturesList);

    await db.query(
      `INSERT INTO music_profiles
        (user_id, top_genres, top_artists, avg_energy, avg_valence, avg_tempo, top_moods, last_synced_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         top_genres = $2, top_artists = $3, avg_energy = $4,
         avg_valence = $5, avg_tempo = $6, top_moods = $7,
         last_synced_at = NOW()`,
      [
        req.userId,
        profile.top_genres, profile.top_artists,
        profile.avg_energy, profile.avg_valence, profile.avg_tempo,
        profile.top_moods,
      ]
    );

    res.json({
      message: `${tracks.length} titres enregistrés`,
      profile,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/music/profile — ADN musical de l'utilisateur connecté
router.get('/profile', requireAuth, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT mp.*, COUNT(ut.id) as tracks_count
       FROM music_profiles mp
       LEFT JOIN user_tracks ut ON ut.user_id = mp.user_id
       WHERE mp.user_id = $1
       GROUP BY mp.id`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Profil musical non créé',
        hint: 'Connecte ton Spotify ou sélectionne 20 titres via POST /api/music/tracks',
      });
    }

    const profile = result.rows[0];

    // Récupérer aussi les tracks
    const tracksResult = await db.query(
      `SELECT track_name, artist_name, genre, energy, valence, tempo, source
       FROM user_tracks WHERE user_id = $1 ORDER BY order_index`,
      [req.userId]
    );

    res.json({
      profile: {
        top_genres: profile.top_genres,
        top_artists: profile.top_artists,
        avg_energy: profile.avg_energy,
        avg_valence: profile.avg_valence,
        avg_tempo: profile.avg_tempo,
        top_moods: profile.top_moods,
        last_synced_at: profile.last_synced_at,
        tracks_count: parseInt(profile.tracks_count),
      },
      tracks: tracksResult.rows,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/music/spotify/status — vérifie si Spotify est connecté
router.get('/spotify/status', requireAuth, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT expires_at FROM oauth_tokens
       WHERE user_id = $1 AND provider = 'spotify'`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.json({ connected: false, auth_url: '/api/auth/spotify' });
    }

    const { expires_at } = result.rows[0];
    const isExpired = new Date(expires_at) < new Date();

    res.json({
      connected: true,
      expired: isExpired,
      expires_at,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/music/deezer/status — vérifie si Deezer est connecté
router.get('/deezer/status', requireAuth, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT expires_at FROM oauth_tokens
       WHERE user_id = $1 AND provider = 'deezer'`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.json({ connected: false, auth_url: '/api/auth/deezer' });
    }

    const { expires_at } = result.rows[0];
    // Pas de refresh dans le flow Deezer de base — expires_at est souvent
    // NULL (token effectivement permanent), on ne le traite jamais comme expiré.
    const isExpired = expires_at ? new Date(expires_at) < new Date() : false;

    res.json({
      connected: true,
      expired: isExpired,
      expires_at,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
