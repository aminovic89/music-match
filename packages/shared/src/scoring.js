/**
 * Algorithme de scoring musical — partagé entre l'API et le web/mobile
 * (utilisé côté mobile/web pour les previews côté client)
 *
 * Score final = (0.4 × artistes/genres) + (0.4 × audio features) + (0.2 × moods)
 */

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

function computeMatchScore(userA, userB) {
  const genreScore = jaccard(userA.top_genres, userB.top_genres);
  const artistScore = jaccard(userA.top_artists, userB.top_artists);
  const audioScore = cosineSimilarity(
    [userA.avg_energy, userA.avg_valence, userA.avg_tempo],
    [userB.avg_energy, userB.avg_valence, userB.avg_tempo]
  );
  const moodScore = jaccard(userA.top_moods, userB.top_moods);

  const genreArtistScore = 0.5 * genreScore + 0.5 * artistScore;
  return (0.4 * genreArtistScore) + (0.4 * audioScore) + (0.2 * moodScore);
}

module.exports = { jaccard, cosineSimilarity, computeMatchScore };
