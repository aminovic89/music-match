require('dotenv').config();
const db = require('./db');
const { saveTracksAndProfile } = require('../services/musicProfile');
const { enrichTracks } = require('../services/enrichment');
const { computeMusicProfile } = require('../services/spotify');

// Recalcule le profil musical de tous les utilisateurs à partir de leurs
// titres déjà enregistrés (enrichissement ReccoBeats + Last.fm), sans qu'ils
// aient à ressaisir leurs titres.
//
//   node src/database/recompute-profiles.js            → recalcule et enregistre
//   node src/database/recompute-profiles.js --dry-run  → affiche sans rien écrire
//
// Les utilisateurs sont traités un par un pour ménager les API externes.

const dryRun = process.argv.includes('--dry-run');

async function loadTracks(userId) {
  const { rows } = await db.query(
    `SELECT track_id, track_name, artist_name, genre, source
     FROM user_tracks WHERE user_id = $1 ORDER BY order_index`,
    [userId]
  );
  return rows;
}

async function run() {
  if (!process.env.LASTFM_API_KEY) {
    console.warn('⚠️  LASTFM_API_KEY absente — les genres resteront vides.');
  }

  const { rows: users } = await db.query(
    `SELECT DISTINCT u.id, u.first_name
     FROM users u JOIN user_tracks ut ON ut.user_id = u.id
     ORDER BY u.first_name`
  );
  console.log(`${users.length} profil(s) à recalculer${dryRun ? ' (dry-run)' : ''}.`);

  let failed = 0;
  for (const user of users) {
    try {
      const tracks = await loadTracks(user.id);
      let profile;
      let withAudio;
      if (dryRun) {
        const enriched = await enrichTracks(tracks);
        const audio = enriched.filter((t) => t.energy != null);
        profile = computeMusicProfile(enriched, audio);
        withAudio = audio.length;
      } else {
        const result = await saveTracksAndProfile(user.id, tracks);
        profile = result.profile;
        withAudio = result.enrichedTracks.filter((t) => t.energy != null).length;
      }
      console.log(
        `✅ ${user.first_name} (${user.id}) — audio ${withAudio}/${tracks.length}, ` +
        `genres [${profile.top_genres.join(', ')}], moods [${profile.top_moods.join(', ')}]`
      );
    } catch (err) {
      failed++;
      console.error(`❌ ${user.first_name} (${user.id}) — ${err.message}`);
    }
  }

  console.log(`Terminé : ${users.length - failed} ok, ${failed} en échec.`);
  await db.pool.end();
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error('Erreur lors du recalcul des profils :', err);
  process.exit(1);
});
