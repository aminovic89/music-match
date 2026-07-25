/**
 * Algorithme de scoring musical — partagé entre l'API et le web/mobile
 * (utilisé côté mobile/web pour les previews côté client)
 *
 * Score final = (0.4 × artistes/genres) + (0.4 × audio features) + (0.2 × moods)
 */

// Écart de tempo (en BPM) au-delà duquel deux profils sont considérés comme
// non similaires sur cette dimension — plage typique des tempos musicaux.
const TEMPO_DIFF_RANGE = 100;

function jaccard(setA = [], setB = []) {
  const a = new Set(setA);
  const b = new Set(setB);
  const union = new Set([...a, ...b]);
  if (union.size === 0) return 0;
  let intersection = 0;
  a.forEach((x) => { if (b.has(x)) intersection++; });
  return intersection / union.size;
}

function cosineSimilarity(vecA, vecB) {
  const dot = vecA.reduce((sum, v, i) => sum + v * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((sum, v) => sum + v * v, 0));
  const normB = Math.sqrt(vecB.reduce((sum, v) => sum + v * v, 0));
  if (normA === 0 || normB === 0) return 0;
  return dot / (normA * normB);
}

// Similarité normalisée entre deux valeurs numériques sur une plage donnée.
// Utilisée plutôt qu'une similarité cosinus brute pour les audio features :
// le tempo (BPM, ex. 60-180) écraserait l'énergie/la valence (0-1) dans un
// vecteur mixte, rendant ces deux dernières quasi ignorées par le cosinus.
function featureSimilarity(a, b, range) {
  if (a == null || b == null) return 0;
  return Math.max(0, 1 - Math.abs(a - b) / range);
}

function computeMatchScore(userA, userB) {
  const genreScore = jaccard(userA.top_genres, userB.top_genres);
  const artistScore = jaccard(userA.top_artists, userB.top_artists);

  const energySim = featureSimilarity(userA.avg_energy, userB.avg_energy, 1);
  const valenceSim = featureSimilarity(userA.avg_valence, userB.avg_valence, 1);
  const tempoSim = featureSimilarity(userA.avg_tempo, userB.avg_tempo, TEMPO_DIFF_RANGE);
  const audioScore = (energySim + valenceSim + tempoSim) / 3;

  const moodScore = jaccard(userA.top_moods, userB.top_moods);

  const genreArtistScore = 0.5 * genreScore + 0.5 * artistScore;
  return (0.4 * genreArtistScore) + (0.4 * audioScore) + (0.2 * moodScore);
}

module.exports = { jaccard, cosineSimilarity, featureSimilarity, computeMatchScore };
