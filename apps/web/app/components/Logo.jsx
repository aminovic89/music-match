// Marque Music Match : pastille dégradée (égaliseur) + wordmark.
const BARS = [
  { h: 'h-[30%]', tone: 'bg-white/90', delay: '0ms' },
  { h: 'h-[55%]', tone: 'bg-white', delay: '-300ms' },
  { h: 'h-[40%]', tone: 'bg-white/90', delay: '-600ms' },
  { h: 'h-[65%]', tone: 'bg-white', delay: '-900ms' },
];

// `animated` : barres d'égaliseur animées (écran de chargement), coupées
// si l'utilisateur demande moins d'animations.
export function LogoMark({ className = 'size-10', animated = false }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center gap-[3px] rounded-xl bg-linear-to-br from-accent to-accent-2 shadow-glow ${className}`}
    >
      {BARS.map((bar, i) => (
        <span
          key={i}
          className={`${bar.h} w-[7%] rounded-full ${bar.tone} ${animated ? 'motion-safe:animate-eq' : ''}`}
          style={animated ? { animationDelay: bar.delay } : undefined}
        />
      ))}
    </span>
  );
}

export default function Logo({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className="size-9" />
      <span className="text-lg font-semibold tracking-tight text-fg">Music Match</span>
    </span>
  );
}
