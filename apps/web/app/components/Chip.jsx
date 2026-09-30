// Étiquette non interactive (artistes, moods), miroir du Chip mobile.
// accent = violet (artistes), accent2 = fuchsia (moods), neutral = surface.
const TONES = {
  accent: 'border-accent/45 bg-accent/15 text-accent-text',
  accent2: 'border-accent-2/40 bg-accent-2/15 text-accent-2-text',
  neutral: 'border-line bg-surface-2 text-fg',
};

export default function Chip({ tone = 'neutral', className = '', children }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}
