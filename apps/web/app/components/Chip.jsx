// Étiquette non interactive (artistes, moods), miroir du Chip mobile.
// accent = violet (artistes), accent2 = fuchsia (moods), neutral = surface.
const TONES = {
  accent: 'border-accent/45 bg-accent/15 text-accent-text',
  accent2: 'border-accent-2/40 bg-accent-2/15 text-accent-2-text',
  neutral: 'border-line bg-surface-2 text-fg',
};

// size "sm" : variante compacte (carte de découverte).
const SIZES = { md: 'px-3 py-1 text-sm', sm: 'px-2.5 py-0.5 text-[0.8125rem] leading-5' };

export default function Chip({ tone = 'neutral', size = 'md', className = '', children }) {
  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${SIZES[size]} ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}
