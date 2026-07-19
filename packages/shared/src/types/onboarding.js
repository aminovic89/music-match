// packages/shared/src/types/onboarding.js

const INTENTS = [
  {
    id: 'romantic',
    label: 'Une rencontre romantique',
    description: 'Quelqu\'un qui partage ta vision de la musique',
    icon: '❤️',
  },
  {
    id: 'friendship',
    label: 'Une amitié',
    description: 'Des gens avec qui sortir, écouter de la musique',
    icon: '👥',
  },
];

const MOODS_LABELS = {
  energetic: { label: 'Énergique', color: '#FF6B6B', emoji: '⚡' },
  chill: { label: 'Chill', color: '#4ECDC4', emoji: '😌' },
  happy: { label: 'Joyeux', color: '#FFE66D', emoji: '😊' },
  melancholic: { label: 'Mélancolique', color: '#6C5CE7', emoji: '🌙' },
  danceable: { label: 'Dansant', color: '#FD79A8', emoji: '💃' },
  intense: { label: 'Intense', color: '#E17055', emoji: '🔥' },
  romantic: { label: 'Romantique', color: '#FD79A8', emoji: '🌹' },
  neutral: { label: 'Neutre', color: '#B2BEC3', emoji: '🎵' },
};

const MAX_TRACKS = 20;

module.exports = { INTENTS, MOODS_LABELS, MAX_TRACKS };
