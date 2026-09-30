'use client';

import { useId, useState } from 'react';
import { focusRing } from './Button';

const inputBase =
  'block w-full min-h-12 rounded-field border border-line-strong bg-surface-2 px-4 text-base text-fg placeholder:text-subtle transition-colors hover:border-muted focus:border-accent-text outline-none focus-visible:ring-2 focus-visible:ring-focus/60 aria-invalid:border-danger';

// Champ texte avec libellé visible, aide (hint) liée via aria-describedby.
// text-base (16px) : en dessous, Safari iOS zoome au focus.
export default function TextField({ label, hint, id, className = '', inputClassName = '', ...inputProps }) {
  const autoId = useId();
  const inputId = id || autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const describedBy = [inputProps['aria-describedby'], hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-fg">
        {label}
      </label>
      <input
        id={inputId}
        {...inputProps}
        aria-describedby={describedBy}
        className={`${inputBase} ${inputClassName}`}
      />
      {hint && (
        <p id={hintId} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

// Champ mot de passe avec bouton afficher/masquer (état purement visuel,
// la valeur reste gérée par la page).
export function PasswordField({ label, hint, id, className = '', ...inputProps }) {
  const autoId = useId();
  const inputId = id || autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const describedBy = [inputProps['aria-describedby'], hintId].filter(Boolean).join(' ') || undefined;
  const [visible, setVisible] = useState(false);

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-fg">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          {...inputProps}
          type={visible ? 'text' : 'password'}
          aria-describedby={describedBy}
          className={`${inputBase} pr-14`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          aria-pressed={visible}
          aria-controls={inputId}
          className={`absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-field text-muted hover:text-fg ${focusRing} focus-visible:ring-offset-0`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-5">
            {visible ? (
              <>
                <path d="M3 3l18 18" />
                <path d="M10.6 5.1A9.8 9.8 0 0 1 12 5c5 0 8.5 4.3 9.5 7-.4 1-1.1 2.3-2.2 3.5M6.6 6.6C4.6 7.9 3.2 9.9 2.5 12c1 2.7 4.5 7 9.5 7 1.9 0 3.5-.6 4.9-1.5" />
                <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
              </>
            ) : (
              <>
                <path d="M2.5 12C3.5 9.3 7 5 12 5s8.5 4.3 9.5 7c-1 2.7-4.5 7-9.5 7s-8.5-4.3-9.5-7Z" />
                <circle cx="12" cy="12" r="3" />
              </>
            )}
          </svg>
        </button>
      </div>
      {hint && (
        <p id={hintId} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
