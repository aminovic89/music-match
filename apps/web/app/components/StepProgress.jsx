// Progression d'un parcours en étapes (miroir du StepProgress mobile) :
// texte explicite "Étape n sur N" + barre segmentée décorative.
// role="progressbar" avec aria-valuenow / aria-valuetext. `current` 1-based.
export default function StepProgress({ current, total, label, className = '' }) {
  const text = `Étape ${current} sur ${total}`;
  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current}
      aria-valuetext={label ? `${text} : ${label}` : text}
      aria-label="Progression"
      className={`flex flex-col gap-2 ${className}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
        <span className="font-semibold text-fg">{text}</span>
        {label && <span className="text-muted">{label}</span>}
      </div>
      <div className="flex gap-1.5" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i < current ? 'bg-linear-to-r from-accent to-accent-2' : 'bg-line'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
