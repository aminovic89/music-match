// Bouton de base du design system. Tap target ≥ 48px, focus ring visible,
// état "loading" annoncé via aria-busy (le libellé reste celui fourni par
// la page, ex. "Connexion...").
const VARIANTS = {
  primary:
    'text-white bg-linear-to-r from-accent to-accent-2 shadow-glow hover:brightness-110 active:brightness-95',
  secondary:
    'text-fg bg-surface-2 border border-line-strong hover:bg-line active:bg-surface',
  ghost: 'text-muted hover:text-fg hover:bg-surface-2',
};

export const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export function Spinner({ className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-4 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin ${className}`}
    />
  );
}

// Classes d'un bouton, réutilisables sur un <Link> (CTA de navigation) :
// un lien qui ressemble à un bouton reste un lien pour l'accessibilité.
export function buttonClasses({ variant = 'primary', fullWidth = true, className = '' } = {}) {
  return `inline-flex min-h-12 items-center justify-center gap-2 rounded-field px-5 text-base font-semibold tracking-tight transition-[filter,background-color,color] duration-150 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:brightness-100 ${fullWidth ? 'w-full' : ''} ${VARIANTS[variant]} ${focusRing} ${className}`;
}

export default function Button({
  variant = 'primary',
  loading = false,
  disabled,
  fullWidth = true,
  className = '',
  children,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, fullWidth, className })}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
