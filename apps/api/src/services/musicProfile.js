const db = require('../database/db');
const enrichment = require('./enrichment');
const spotify = require('./spotify');

/**
 * Enrichit les titres (audio features ReccoBeats, genres Last.fm), remplace
 * les titres de l'utilisateur et recalcule son profil musical. Utilisé à
 * l'enregistrement des titres et par le script de recalcul des profils.
 */
async function saveTracksAndProfile(userId, tracks) {
  const enrichedTracks = await enrichment.enrichTracks(tracks);

  const audioFeaturesList = enrichedTracks.filter((t) => t.energy != null);
  const profile = spotify.computeMusicProfile(enrichedTracks, audioFeaturesList);

  await db.withTransaction(async (client) => {
    await client.query('DELETE FROM user_tracks WHERE user_id = $1', [userId]);

    for (let i = 0; i < enrichedTracks.length; i++) {
      const track = enrichedTracks[i];
      await client.query(
        `INSERT INTO user_tracks
          (user_id, track_id, track_name, artist_name, genre,
           energy, valence, tempo, source, order_index)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          userId, track.track_id, track.track_name,
          track.artist_name || null, track.genres?.[0]?.name || track.genre || null,
          track.energy ?? null, track.valence ?? null,
          track.tempo ?? null, track.source, i,
        ]
      );
    }

    await client.query(
      `INSERT INTO music_profiles
        (user_id, top_genres, top_artists, avg_energy, avg_valence, avg_tempo, top_moods, last_synced_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         top_genres = $2, top_artists = $3, avg_energy = $4,
         avg_valence = $5, avg_tempo = $6, top_moods = $7,
         last_synced_at = NOW()`,
      [
        userId,
        profile.top_genres, profile.top_artists,
        profile.avg_energy, profile.avg_valence, profile.avg_tempo,
        profile.top_moods,
      ]
    );
  });

  return { profile, enrichedTracks };
}

module.exports = { saveTracksAndProfile };
