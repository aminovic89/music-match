'use client';

import { useEffect, useId, useImperativeHandle, useRef } from 'react';
import Icon from '../Icon';
import { Spinner, focusRing } from '../Button';
import { MAX_MESSAGE_LENGTH, counterText, draftState } from './chatFormat';

// Hauteur max de la zone de saisie (≈ 6 lignes) : au-delà, elle défile.
const MAX_HEIGHT = 168;

/**
 * Zone de saisie du chat (contrôlée). Miroir de
 * apps/mobile/src/components/chat/Composer.jsx.
 *
 * - textarea qui grandit avec le texte jusqu'à MAX_HEIGHT ;
 * - Entrée envoie, Maj + Entrée saute une ligne (pointeur fin uniquement :
 *   sur écran tactile, Entrée saute une ligne et on envoie au bouton) ;
 * - bouton d'envoi 48px, désactivé si le message est vide, trop long,
 *   ou si `disabledReason` est fourni ;
 * - compteur affiché à l'approche de la limite (200 derniers caractères),
 *   dépassement annoncé (icône + texte, pas la couleur seule).
 *
 * @param {Object} props
 * @param {string} props.value
 * @param {(text: string) => void} props.onChange
 * @param {() => void} props.onSubmit  Appelé seulement si le message est envoyable.
 * @param {string} props.peerName      Libellé du champ : "Message à <prénom>".
 * @param {number} [props.maxLength]   Défaut 2000 (limite de l'API, après trim).
 * @param {boolean} [props.busy]       Envoi en cours (flux non optimiste) : bouton occupé.
 * @param {string|null} [props.disabledReason]  Envoi impossible (ex. hors connexion) : texte affiché et lié au bouton.
 * @param {import('react').Ref<{ focus: () => void }>} [props.inputRef]  Poignée pour donner le focus au champ.
 * @param {() => void} [props.onBlur]
 */
export default function Composer({
  value,
  onChange,
  onSubmit,
  peerName,
  maxLength = MAX_MESSAGE_LENGTH,
  busy = false,
  disabledReason = null,
  inputRef,
  onBlur,
}) {
  const id = useId();
  const textareaRef = useRef(null);
  useImperativeHandle(inputRef, () => ({ focus: () => textareaRef.current?.focus() }), []);
  const helpId = `${id}-help`;
  const state = draftState(value, maxLength);
  const counter = counterText(state);
  const canSend = state.canSend && !busy && !disabledReason;

  // Auto-grandissement : on remesure à chaque changement de valeur.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [value]);

  const submit = () => {
    if (canSend) onSubmit();
  };

  const handleKeyDown = (event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) return;
    event.preventDefault();
    submit();
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
        // Le clic sur le bouton lui donne le focus : on le rend au champ
        // pour enchaîner les messages.
        textareaRef.current?.focus();
      }}
      className="border-t border-line bg-surface/95 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-4"
    >
      <div className="flex items-end gap-2">
        <label htmlFor={id} className="sr-only">
          Message à {peerName}
        </label>
        <textarea
          id={id}
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={onBlur}
          placeholder="Écris un message…"
          aria-describedby={helpId}
          aria-invalid={state.isOver ? true : undefined}
          enterKeyHint="enter"
          // text-base (16px) : en dessous, Safari iOS zoome au focus.
          className="block min-h-12 w-full min-w-0 flex-1 resize-none rounded-field border border-line-strong bg-surface-2 px-4 py-[11px] text-base leading-6 text-fg outline-none transition-colors placeholder:text-subtle hover:border-muted focus:border-accent-text focus-visible:ring-2 focus-visible:ring-focus/60 aria-invalid:border-danger"
          style={{ maxHeight: MAX_HEIGHT }}
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-busy={busy || undefined}
          aria-describedby={helpId}
          className={`flex size-12 shrink-0 items-center justify-center rounded-full bg-linear-to-r from-accent to-accent-2 text-white shadow-glow transition-[filter,opacity] hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:brightness-100 ${focusRing}`}
        >
          {busy ? <Spinner /> : <Icon name="send" className="size-5" />}
          <span className="sr-only">{busy ? 'Envoi en cours' : 'Envoyer'}</span>
        </button>
      </div>

      <div id={helpId} className="min-h-5 px-1 pt-1.5 text-xs">
        {disabledReason ? (
          <p className="text-muted">{disabledReason}</p>
        ) : counter ? (
          <p className={`flex items-center gap-1.5 ${state.isOver ? 'font-medium text-danger' : 'text-muted'}`}>
            {state.isOver && <Icon name="alert" className="size-3.5 shrink-0" />}
            {counter}
          </p>
        ) : (
          <p className="hidden text-subtle [@media(pointer:fine)]:block">
            Entrée pour envoyer · Maj + Entrée pour aller à la ligne
          </p>
        )}
      </div>
      {/* Région live toujours montée, au texte fixe : le dépassement est
          annoncé une fois, pas à chaque caractère comme le compteur. */}
      <p className="sr-only" aria-live="polite">
        {state.isOver ? `Message trop long : ${maxLength} caractères maximum.` : ''}
      </p>
    </form>
  );
}
