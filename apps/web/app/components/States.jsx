import { LogoMark } from './Logo';
import Icon from './Icon';

// Chargement : logo animé (coupé si prefers-reduced-motion) + libellé
// visible, annoncé via role="status".
export function LoadingState({ label = 'Chargement…', className = '' }) {
  return (
    <div role="status" className={`flex flex-col items-center justify-center gap-4 py-16 text-center ${className}`}>
      <LogoMark className="size-12" animated />
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}

// État vide / d'information : pictogramme, titre, texte, action(s).
export function EmptyState({ icon, title, text, children, headingLevel = 'h2', className = '' }) {
  const Heading = headingLevel;
  return (
    <div
      className={`flex flex-col items-center gap-4 rounded-card border border-line bg-surface/90 px-6 py-10 text-center shadow-card sm:px-10 ${className}`}
    >
      {icon ? (
        <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-2xl bg-accent/15 text-accent-text">
          <Icon name={icon} className="size-7" />
        </span>
      ) : (
        <LogoMark className="size-14" />
      )}
      <div className="flex max-w-sm flex-col gap-2">
        <Heading className="text-xl font-semibold tracking-tight text-balance text-fg">{title}</Heading>
        {text && <p className="text-sm leading-relaxed text-pretty text-muted">{text}</p>}
      </div>
      {children && <div className="mt-2 flex w-full max-w-xs flex-col gap-3">{children}</div>}
    </div>
  );
}
