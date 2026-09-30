'use client';

import { useId } from 'react';
import Icon from './Icon';

// Choix exclusifs (intention, genre…), miroir de Choice mobile.
// Vrais <input type="radio"> (visuellement masqués) : sémantique radio,
// état coché et navigation aux flèches natifs. L'état sélectionné est
// porté par une coche ✓ ET la couleur, jamais par la seule bordure.
//
// `onSelect(value)` est appelé au changement ; `deselectable` : un clic
// sur l'option déjà cochée appelle `onSelect(null)` (comportement existant
// des choix genre / je recherche).

export function RadioGroup({ label, className = '', children }) {
  return (
    <fieldset className={className}>
      <legend className="sr-only">{label}</legend>
      {children}
    </fieldset>
  );
}

function useRadioHandlers({ value, checked, onSelect, deselectable }) {
  return {
    checked,
    onChange: () => onSelect(value),
    onClick: () => {
      if (deselectable && checked) onSelect(null);
    },
  };
}

const focusWithin =
  'has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-focus has-[input:focus-visible]:ring-offset-2 has-[input:focus-visible]:ring-offset-background';

function Check({ checked }) {
  return (
    <span
      aria-hidden="true"
      className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
        checked ? 'border-accent bg-accent text-white' : 'border-line-strong'
      }`}
    >
      {checked && <Icon name="check" className="size-3.5" />}
    </span>
  );
}

export function RadioCard({ name, value, title, description, icon, checked, onSelect, deselectable = false }) {
  const descId = useId();
  const handlers = useRadioHandlers({ value, checked, onSelect, deselectable });
  return (
    <label
      className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-colors ${
        checked ? 'border-accent-text bg-accent/15' : 'border-line-strong bg-surface hover:border-muted'
      } ${focusWithin}`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        className="sr-only"
        aria-describedby={description ? descId : undefined}
        {...handlers}
      />
      {icon && (
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-lg">
          {icon}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-base font-medium text-fg">{title}</span>
        {description && (
          <span id={descId} className="text-sm text-muted">
            {description}
          </span>
        )}
      </span>
      <Check checked={checked} />
    </label>
  );
}

export function RadioChip({ name, value, label, checked, onSelect, deselectable = false }) {
  const handlers = useRadioHandlers({ value, checked, onSelect, deselectable });
  return (
    <label
      className={`flex min-h-11 min-w-22 flex-1 basis-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
        checked ? 'border-accent-text bg-accent/15 text-fg' : 'border-line-strong bg-surface text-muted hover:border-muted hover:text-fg'
      } ${focusWithin}`}
    >
      <input type="radio" name={name} value={value} className="sr-only" {...handlers} />
      {checked && <Icon name="check" className="size-4" />}
      {label}
    </label>
  );
}
