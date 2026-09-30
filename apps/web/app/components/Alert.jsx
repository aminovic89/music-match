// Message de retour (erreur / succès). Icône + texte : l'information
// n'est jamais portée par la couleur seule.
const TONES = {
  error: {
    box: 'bg-danger-bg border-danger-line text-danger',
    icon: (
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm0-12a.9.9 0 0 1 .9.9v3.6a.9.9 0 1 1-1.8 0V6.9A.9.9 0 0 1 10 6Zm0 8.4a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2Z"
        clipRule="evenodd"
      />
    ),
    label: 'Erreur :',
  },
  success: {
    box: 'bg-success-bg border-success-line text-success',
    icon: (
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.7-9.8a.9.9 0 0 0-1.3-1.3L9 10.3 7.6 8.9a.9.9 0 1 0-1.3 1.3l2 2a.9.9 0 0 0 1.3 0l4.1-4Z"
        clipRule="evenodd"
      />
    ),
    label: 'Succès :',
  },
};

export function Alert({ tone = 'error', className = '', children }) {
  const t = TONES[tone];
  return (
    <div
      className={`flex items-start gap-3 rounded-field border px-4 py-3 text-sm leading-relaxed ${t.box} ${className}`}
    >
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="mt-0.5 size-5 shrink-0">
        {t.icon}
      </svg>
      <p className="text-fg">
        <span className="sr-only">{t.label} </span>
        {children}
      </p>
    </div>
  );
}

// Région live toujours présente dans le DOM : les lecteurs d'écran
// n'annoncent de façon fiable que les changements *dans* une région déjà
// montée, pas une région insérée en même temps que son contenu.
export default function FormAlert({ id, message, tone = 'error', className = '' }) {
  return (
    <div id={id} aria-live={tone === 'error' ? 'assertive' : 'polite'} aria-atomic="true">
      {message ? (
        <Alert tone={tone} className={className}>
          {message}
        </Alert>
      ) : null}
    </div>
  );
}
