// Illustration du hero de la landing : un aperçu (fictif) de carte de
// profil telle qu'on la voit dans Découvrir, avec des éléments de l'ADN
// musical. Purement décorative (aria-hidden) — tout ce qu'elle montre est
// déjà dit dans le texte de la page.
const ARTISTS = ['Angèle', 'Tame Impala', 'Daft Punk'];
const MOODS = ['Énergique', 'Dansant'];
const EQ = [
  { h: 'h-3', delay: '0ms' },
  { h: 'h-5', delay: '-200ms' },
  { h: 'h-4', delay: '-400ms' },
  { h: 'h-6', delay: '-600ms' },
  { h: 'h-3.5', delay: '-800ms' },
];

export default function MatchPreview({ className = '' }) {
  return (
    <div aria-hidden="true" className={`relative mx-auto w-full max-w-sm select-none ${className}`}>
      {/* Carte "fantôme" derrière, pour la profondeur */}
      <div className="absolute inset-x-6 -top-3 bottom-6 rounded-card border border-line bg-surface/60" />

      <div className="relative rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
        <div className="flex items-center gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-accent to-accent-2 text-xl font-semibold text-white">
            L
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-fg">Léa, 27</p>
            <p className="text-sm text-muted">Lyon</p>
          </div>
          <div className="ml-auto flex items-end gap-[3px]">
            {EQ.map((bar, i) => (
              <span
                key={i}
                className={`${bar.h} w-1 origin-bottom rounded-full bg-accent-text motion-safe:animate-eq`}
                style={{ animationDelay: bar.delay }}
              />
            ))}
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-fg">Compatibilité</span>
            <span className="text-sm font-semibold text-accent-text">92 %</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full w-[92%] rounded-full bg-linear-to-r from-accent to-accent-2" />
          </div>
        </div>

        <p className="mt-5 text-xs font-medium uppercase tracking-wider text-muted">Artistes dominants</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {ARTISTS.map((a) => (
            <span key={a} className="rounded-full border border-line bg-surface-2 px-3 py-1 text-sm text-fg">
              {a}
            </span>
          ))}
          {MOODS.map((m) => (
            <span key={m} className="rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-sm text-accent-text">
              {m}
            </span>
          ))}
        </div>
      </div>

      <div className="absolute -bottom-4 -right-1 rounded-full bg-linear-to-r from-accent to-accent-2 px-4 py-2 text-sm font-semibold text-white shadow-glow sm:-right-4">
        C&apos;est un match !
      </div>
    </div>
  );
}
