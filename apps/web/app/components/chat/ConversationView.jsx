'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Avatar from '../Avatar';
import Button, { Spinner, focusRing } from '../Button';
import FormAlert from '../Alert';
import Icon from '../Icon';
import { LoadingState } from '../States';
import Composer from './Composer';
import MessageBubble, { DaySeparator, EphemeralNotice, TypingIndicator } from './MessageBubble';
import {
  MAX_MESSAGE_LENGTH,
  MESSAGE_TTL_HOURS,
  buildThread,
  countNewSince,
  draftState,
  icebreakers,
  isMine,
  messageKey,
  peerSubtitle,
  visibleMessages,
} from './chatFormat';
import useNow from './useNow';
import useTypingSignal from './useTypingSignal';

// En dessous de cette distance au bas du fil, on considère que
// l'utilisateur "suit" la conversation.
const NEAR_BOTTOM_PX = 80;

const scrollBehavior = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

/**
 * Vue d'une conversation — composant de présentation, sans fetch ni socket.
 * Miroir de apps/mobile/src/screens/ConversationScreen.jsx.
 *
 * CONTRAT (pour l'agent web-frontend)
 *
 * @typedef {Object} Peer  `conversation.user` de GET /api/chat/conversations
 * @property {string} id
 * @property {string} first_name
 * @property {string|null} [avatar_url]
 * @property {number|null} [age]
 * @property {string|null} [city]
 *
 * @typedef {Object} Message  GET /api/chat/conversations/:id/messages, ou événement socket `new_message`
 * @property {string} [id]            Absent tant que le message est optimiste.
 * @property {string} [tempId]        Identifiant local d'un message optimiste. À CONSERVER sur le message confirmé
 *                                    (`{ ...ack.message, tempId }`) : la clé React reste stable, la bulle n'est pas remontée.
 * @property {string} sender_id
 * @property {string} content
 * @property {string} sent_at         ISO. Pour un message optimiste : la date locale d'envoi.
 * @property {string} [expires_at]    ISO. Absent (optimiste) = jamais masqué côté client.
 * @property {boolean} [is_read]
 * @property {'sending'|'failed'} [status]  Messages optimistes uniquement ; absent = envoyé.
 *
 * @param {Object} props
 * @param {Peer} props.peer
 * @param {string} props.currentUserId  Sert à distinguer mes bulles (`sender_id === currentUserId`).
 * @param {Message[]} props.messages    Ordre chronologique croissant (comme l'API). Les messages dont `expires_at`
 *                                      est dépassé sont masqués ici, sans refetch (horloge interne, 30 s).
 * @param {boolean} [props.loading]     Chargement initial de l'historique.
 * @param {string|null} [props.error]   Erreur de chargement / de connexion (annoncée). Le fil déjà chargé reste affiché.
 * @param {() => void} [props.onReload] Affiche "Réessayer" sous l'erreur.
 * @param {boolean} [props.peerTyping]  L'autre écrit (événements socket `typing` / `stop_typing` ; prévoir une
 *                                      expiration côté câblage si `stop_typing` n'arrive jamais).
 * @param {'connected'|'connecting'|'disconnected'} [props.connection]  État du socket. `connecting` : bandeau
 *                                      "Reconnexion…", envoi permis. `disconnected` : bandeau + envoi désactivé.
 * @param {boolean} [props.sending]     Envoi en cours pour un flux NON optimiste (bouton occupé). Avec des messages
 *                                      optimistes (`status: 'sending'`), laisser à false.
 * @param {string[]} [props.sharedArtists]  Optionnel : artistes en commun → amorces dans l'état "conversation vide".
 * @param {number} [props.ttlHours]     Défaut 24 (MESSAGE_TTL_HOURS de l'API).
 * @param {number} [props.maxLength]    Défaut 2000 (MAX_MESSAGE_LENGTH de l'API, mesuré après trim).
 * @param {(content: string) => void} props.onSend  Contenu déjà `trim()`, non vide et ≤ maxLength. Le champ est vidé
 *                                      aussitôt : en cas d'échec, représenter le message avec `status: 'failed'`.
 * @param {(tempId: string) => void} [props.onRetry]  "Réessayer" sur un message `failed` (reçoit `tempId`, sinon `id`).
 * @param {() => void} [props.onTyping]      Début de saisie (une fois par rafale) → émettre `typing`.
 * @param {() => void} [props.onStopTyping]  3 s sans frappe, champ vidé, envoi, perte de focus, démontage → `stop_typing`.
 * @param {string} [props.backHref]     Lien retour (mobile). Défaut `/messages`.
 * @param {() => void} [props.onBack]   Appelé au clic sur retour, en plus de la navigation.
 * @param {'h1'|'h2'} [props.headingLevel]  Défaut 'h2' (la page porte déjà un h1 "Messages").
 * @param {number} [props.now]          Horloge injectée (tests, captures).
 *
 * DÉFILEMENT AUTOMATIQUE
 * - À l'ouverture (premiers messages affichés) : positionné en bas, sans animation.
 * - Nouveau message de MA part : on revient toujours en bas.
 * - Nouveau message reçu ou indicateur de saisie : on suit seulement si l'utilisateur était déjà en bas
 *   (à moins de 80px). Sinon la position est conservée et un bouton "N nouveaux messages" apparaît ;
 *   sans nouveau message, le même bouton (flèche) ramène simplement en bas.
 * - Défilement animé, sauf si prefers-reduced-motion.
 *
 * ACCESSIBILITÉ
 * - Fil en <ol> ; chaque bulle est préfixée (lecteurs d'écran) par "Toi, 14:02 : " / "<Prénom>, 14:02 : ".
 * - Le rappel "Les messages s'effacent 24 h après leur envoi" est épinglé sous l'en-tête ; une bulle n'affiche
 *   "S'efface dans …" que dans son dernier quart de vie, et passe en contour pointillé la dernière heure.
 * - Messages reçus et saisie en cours annoncés par des régions live dédiées (polies).
 * - À l'ouverture : focus sur le champ (pointeur fin) ou sur le nom du contact (tactile, pour ne pas
 *   ouvrir le clavier d'office).
 *
 * LIMITES CONNUES DE L'API (rien à faire côté présentation)
 * - `is_read` ne change que quand l'autre recharge l'historique en REST : "Vu" n'est pas temps réel.
 * - Le quota journalier (daily_limits.messages_count) est compté mais pas exposé : aucun affichage prévu.
 */
export default function ConversationView({
  peer,
  currentUserId,
  messages = [],
  loading = false,
  error = null,
  onReload,
  peerTyping = false,
  connection = 'connected',
  sending = false,
  sharedArtists,
  ttlHours = MESSAGE_TTL_HOURS,
  maxLength = MAX_MESSAGE_LENGTH,
  onSend,
  onRetry,
  onTyping,
  onStopTyping,
  backHref = '/messages',
  onBack,
  headingLevel: Heading = 'h2',
  now: nowProp,
  className = '',
}) {
  const tick = useNow();
  const now = nowProp ?? tick;
  const name = peer?.first_name || 'Ton match';
  const subtitle = peerSubtitle(peer);

  const [draft, setDraft] = useState('');
  // Clé du dernier message au moment où l'utilisateur a quitté le bas du
  // fil (null = il suit la conversation).
  const [away, setAway] = useState(null);

  const rootRef = useRef(null);
  const scrollRef = useRef(null);
  const headingRef = useRef(null);
  const textareaRef = useRef(null);
  const liveRef = useRef(null);
  const atBottom = useRef(true);
  const previous = useRef({ key: null, count: 0 });

  const typing = useTypingSignal(onTyping, onStopTyping);

  const visible = visibleMessages(messages, now);
  const rows = buildThread(messages, currentUserId, now, ttlHours);
  const lastMessage = visible[visible.length - 1];
  const lastKey = lastMessage ? messageKey(lastMessage) : null;
  const newCount = away ? countNewSince(visible, away.key, currentUserId) : 0;
  const suggestions = icebreakers(sharedArtists);
  const disconnected = connection === 'disconnected';

  const scrollToBottom = (behavior) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  };

  // Plein écran mobile : la hauteur suit le viewport *visuel*, pour que la
  // zone de saisie reste au-dessus du clavier virtuel (100dvh ne tient pas
  // compte du clavier sur iOS). Variables CSS posées sur le conteneur.
  useEffect(() => {
    const viewport = window.visualViewport;
    const el = rootRef.current;
    if (!viewport || !el) return;
    const update = () => {
      el.style.setProperty('--chat-vh', `${viewport.height}px`);
      el.style.setProperty('--chat-top', `${viewport.offsetTop}px`);
      if (atBottom.current) scrollToBottom('auto');
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);

  // Focus à l'ouverture d'une conversation.
  useEffect(() => {
    if (window.matchMedia('(pointer: fine)').matches) textareaRef.current?.focus();
    else headingRef.current?.focus();
  }, [peer?.id]);

  // Défilement automatique + annonce des messages reçus (voir le contrat).
  useEffect(() => {
    const prev = previous.current;
    previous.current = { key: lastKey, count: visible.length };
    if (!lastMessage || lastKey === prev.key) return;
    const initial = prev.count === 0;
    const mine = isMine(lastMessage, currentUserId);
    if (initial || mine || atBottom.current) {
      atBottom.current = true;
      scrollToBottom(initial ? 'auto' : scrollBehavior());
    }
    if (!initial && !mine && liveRef.current) {
      liveRef.current.textContent = `${name} : ${lastMessage.content}`;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastKey, visible.length]);

  // L'indicateur de saisie s'ajoute en bas : on le suit si on y était.
  useEffect(() => {
    if (peerTyping && atBottom.current) scrollToBottom(scrollBehavior());
  }, [peerTyping]);

  const handleScroll = (event) => {
    const el = event.currentTarget;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    atBottom.current = near;
    if (near) setAway(null);
    else setAway((current) => current ?? { key: lastKey });
  };

  const handleChange = (text) => {
    setDraft(text);
    typing.notify(text);
  };

  const handleSubmit = () => {
    const state = draftState(draft, maxLength);
    if (!state.canSend) return;
    typing.stop();
    setDraft('');
    onSend?.(state.trimmed);
  };

  const applySuggestion = (text) => {
    handleChange(text);
    textareaRef.current?.focus();
  };

  return (
    <section
      ref={rootRef}
      aria-label={`Conversation avec ${name}`}
      // < md : plein écran par-dessus la barre d'onglets (comme un écran
      // "poussé" sur mobile). ≥ md : panneau dans la mise en page.
      className={`fixed inset-x-0 top-[var(--chat-top,0px)] z-[60] flex h-[var(--chat-vh,100dvh)] flex-col bg-background md:static md:z-auto md:h-full md:min-h-0 md:overflow-hidden md:rounded-card md:border md:border-line md:bg-surface/60 md:shadow-card ${className}`}
    >
      <header className="flex items-center gap-2 border-b border-line bg-surface/95 px-2 pt-[env(safe-area-inset-top)] backdrop-blur md:px-4">
        <Link
          href={backHref}
          onClick={onBack}
          aria-label="Retour aux conversations"
          className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-fg hover:bg-surface-2 md:hidden ${focusRing}`}
        >
          <Icon name="chevronLeft" className="size-6" />
        </Link>
        <div className="flex min-h-16 min-w-0 flex-1 items-center gap-3 py-2">
          <Avatar avatarUrl={peer?.avatar_url} firstName={peer?.first_name} size={40} />
          <div className="flex min-w-0 flex-col">
            <Heading
              ref={headingRef}
              tabIndex={-1}
              className="truncate text-base font-semibold tracking-tight text-fg outline-none"
            >
              {name}
            </Heading>
            {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
          </div>
        </div>
      </header>

      {/* État de la connexion : toujours monté pour être annoncé. */}
      <div role="status">
        {connection !== 'connected' && (
          <p className="flex items-center justify-center gap-2 border-b border-line bg-surface-2 px-4 py-2 text-center text-xs font-medium text-fg">
            {disconnected ? <Icon name="alert" className="size-4 shrink-0 text-danger" /> : <Spinner className="size-3" />}
            {disconnected ? 'Hors connexion. Tu pourras écrire dès le retour du réseau.' : 'Reconnexion en cours…'}
          </p>
        )}
      </div>

      <EphemeralNotice ttlHours={ttlHours} />

      {/* Erreur épinglée (hors zone défilante) : visible même quand le fil
          est positionné en bas. */}
      <div className={error ? 'flex flex-col gap-3 border-b border-line px-3 py-3 sm:px-5' : ''}>
        <FormAlert id="conversation-error" message={error} />
        {error && onReload && (
          <Button variant="secondary" fullWidth={false} onClick={onReload} className="self-center">
            <Icon name="refresh" />
            Réessayer
          </Button>
        )}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          // Zone défilante focalisable au clavier (SC 2.1.1).
          tabIndex={0}
          role="group"
          aria-label="Messages"
          className={`flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3 py-4 sm:px-5 ${focusRing} focus-visible:ring-offset-0 focus-visible:ring-inset`}
        >
          {loading ? (
            <LoadingState label="Chargement des messages…" className="flex-1" />
          ) : rows.length === 0 ? (
            !error && (
              <div className="flex flex-1 flex-col items-center justify-center gap-5 py-6 text-center">
                <Avatar avatarUrl={peer?.avatar_url} firstName={peer?.first_name} size={72} ring />
                <div className="flex max-w-xs flex-col gap-2">
                  <p className="text-lg font-semibold tracking-tight text-balance text-fg">
                    Dis bonjour à {name}
                  </p>
                  <p className="text-sm leading-relaxed text-pretty text-muted">
                    {suggestions.length > 0
                      ? 'Vous avez des artistes en commun : un bon point de départ.'
                      : 'Parle-lui du dernier titre que tu as écouté en boucle.'}
                  </p>
                </div>
                {suggestions.length > 0 && (
                  <ul aria-label="Idées de premier message" className="flex w-full max-w-sm flex-col gap-2">
                    {suggestions.map((suggestion) => (
                      <li key={suggestion.artist}>
                        <button
                          type="button"
                          onClick={() => applySuggestion(suggestion.text)}
                          className={`flex min-h-11 w-full items-center gap-3 rounded-2xl border border-accent/45 bg-accent/15 px-4 py-2.5 text-left text-sm text-fg hover:bg-accent/25 ${focusRing}`}
                        >
                          <Icon name="music" className="size-4 shrink-0 text-accent-text" />
                          <span>{suggestion.text}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          ) : (
            // mt-auto : un fil court reste collé en bas, près du champ.
            <ol className="mt-auto flex flex-col">
              {rows.map((row) =>
                row.type === 'day' ? (
                  <DaySeparator key={row.key} label={row.label} />
                ) : (
                  <MessageBubble key={row.key} row={row} peerName={name} onRetry={onRetry} />
                )
              )}
            </ol>
          )}
          {peerTyping && !loading && <TypingIndicator name={name} />}
        </div>

        {away && (
          <button
            type="button"
            onClick={() => scrollToBottom(scrollBehavior())}
            className={`absolute bottom-3 left-1/2 inline-flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full border border-line-strong bg-surface-2 px-4 text-sm font-semibold whitespace-nowrap text-fg shadow-card hover:bg-line ${focusRing}`}
          >
            <Icon name="arrowDown" className="size-4 text-accent-text" />
            {newCount > 0
              ? `${newCount} ${newCount > 1 ? 'nouveaux messages' : 'nouveau message'}`
              : 'Derniers messages'}
          </button>
        )}
      </div>

      {/* Annonces lecteurs d'écran : message reçu (écrit par l'effet
          ci-dessus) et saisie en cours. */}
      <p ref={liveRef} className="sr-only" aria-live="polite" aria-atomic="true" />
      <p className="sr-only" aria-live="polite">
        {peerTyping ? `${name} est en train d’écrire…` : ''}
      </p>

      <Composer
        value={draft}
        onChange={handleChange}
        onSubmit={handleSubmit}
        onBlur={typing.stop}
        peerName={name}
        maxLength={maxLength}
        busy={sending}
        disabledReason={disconnected ? 'Envoi indisponible hors connexion.' : null}
        inputRef={textareaRef}
      />
    </section>
  );
}
