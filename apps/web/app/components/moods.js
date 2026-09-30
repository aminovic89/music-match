// Libellés des moods (clés renvoyées par l'API : energetic, chill…).
// Partagé entre l'étape ADN musical et la carte de découverte.
export const MOODS_LABELS = {
  energetic: { label: 'Énergique', emoji: '⚡' },
  chill: { label: 'Chill', emoji: '😌' },
  happy: { label: 'Joyeux', emoji: '😊' },
  melancholic: { label: 'Mélancolique', emoji: '🌙' },
  danceable: { label: 'Dansant', emoji: '💃' },
  intense: { label: 'Intense', emoji: '🔥' },
  romantic: { label: 'Romantique', emoji: '🌹' },
  neutral: { label: 'Neutre', emoji: '🎵' },
};

// Clé inconnue → affichée telle quelle, avec l'emoji par défaut.
export function moodInfo(mood) {
  return MOODS_LABELS[mood] || { label: mood, emoji: '🎵' };
}
