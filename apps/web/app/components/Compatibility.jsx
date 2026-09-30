// Jauge de compatibilité (même rendu que la carte de MatchPreview sur la
// landing). Le pourcentage est en texte ; la barre est décorative.
export default function Compatibility({ score, className = '' }) {
  const pct = Math.max(0, Math.min(100, Math.round((score || 0) * 100)));
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-fg">Compatibilité</span>
        <span className="text-sm font-semibold tabular-nums text-accent-text">{pct} %</span>
      </div>
      <div aria-hidden="true" className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-linear-to-r from-accent to-accent-2 motion-safe:transition-[width] motion-safe:duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
