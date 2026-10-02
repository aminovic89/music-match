'use client';

import Link from 'next/link';
import Avatar from '../Avatar';
import Button, { buttonClasses, focusRing } from '../Button';
import FormAlert from '../Alert';
import Icon from '../Icon';
import { EmptyState, LoadingState } from '../States';
import { formatListTime, unreadBadge, unreadLabel } from './chatFormat';
import useNow from './useNow';

/**
 * Liste des conversations — composant de présentation, sans fetch ni socket.
 * Miroir de apps/mobile/src/screens/MessagesScreen.jsx.
 *
 * CONTRAT (pour l'agent web-frontend)
 *
 * @typedef {Object} Conversation        Réponse de GET /api/chat/conversations
 * @property {string} id
 * @property {string} created_at
 * @property {{ id: string, first_name: string, avatar_url: string|null, age: number|null, city: string|null }} user
 * @property {{ content: string, sent_at: string } | null} last_message  null = aucun message non expiré
 * @property {number} unread_count
 *
 * @param {Object} props
 * @param {Conversation[]} props.conversations  Déjà triées par l'API (activité la plus récente d'abord) ; affichées telles quelles.
 * @param {boolean} [props.loading]    Premier chargement : remplace la liste par l'état de chargement.
 * @param {string|null} [props.error]  Message d'erreur (annoncé). La liste déjà chargée reste affichée dessous.
 * @param {() => void} [props.onRetry] Affiche "Réessayer" à côté de l'erreur.
 * @param {string|null} [props.selectedId]  Conversation ouverte (mise en avant + aria-current, vue deux colonnes).
 * @param {(id: string) => string} [props.getHref]  URL d'une conversation. Défaut : `/messages?c=<id>` (compatible export statique).
 * @param {(id: string) => void} [props.onOpenConversation]  Appelé au clic, en plus de la navigation du lien.
 * @param {string} [props.discoverHref]  Défaut `/discover` (état vide).
 * @param {string} [props.matchesHref]   Défaut `/matches` (état vide).
 * @param {number} [props.now]  Horloge injectée (tests, captures) ; sinon rafraîchie toutes les 30 s.
 *
 * Non couvert par l'API actuelle (à demander à api-backend si souhaité) :
 * l'auteur du dernier message (`last_message.sender_id`) permettrait
 * d'afficher "Toi : …" dans l'aperçu.
 */
export default function ConversationList({
  conversations = [],
  loading = false,
  error = null,
  onRetry,
  selectedId = null,
  getHref = (id) => `/messages?c=${encodeURIComponent(id)}`,
  onOpenConversation,
  discoverHref = '/discover',
  matchesHref = '/matches',
  now: nowProp,
  className = '',
}) {
  const tick = useNow();
  const now = nowProp ?? tick;

  return (
    <div className={`flex flex-col ${className}`}>
      <FormAlert id="conversations-error" message={error} className="mb-4" />
      {error && onRetry && (
        <Button variant="secondary" onClick={onRetry} className="mb-4">
          <Icon name="refresh" />
          Réessayer
        </Button>
      )}

      {loading ? (
        <LoadingState label="Chargement des conversations…" />
      ) : conversations.length === 0 ? (
        !error && (
          <EmptyState
            icon="chat"
            title="Pas encore de conversation"
            text="Dès que tu as un match, vous pouvez vous écrire ici. Les messages s'effacent au bout de 24 h : l'important se dit sur le moment."
          >
            <Link href={discoverHref} className={buttonClasses()}>
              <Icon name="compass" />
              Trouver des matchs
            </Link>
            <Link href={matchesHref} className={buttonClasses({ variant: 'secondary' })}>
              <Icon name="heart" />
              Voir mes matchs
            </Link>
          </EmptyState>
        )
      ) : (
        <ul className="flex flex-col gap-2">
          {conversations.map((conversation) => {
            const { user, last_message: last, unread_count: unread } = conversation;
            const selected = conversation.id === selectedId;
            const hasUnread = unread > 0;
            // Sans message : la conversation date du match (created_at).
            const time = formatListTime(last ? last.sent_at : conversation.created_at, now);
            return (
              <li key={conversation.id}>
                <Link
                  href={getHref(conversation.id)}
                  onClick={onOpenConversation ? () => onOpenConversation(conversation.id) : undefined}
                  aria-current={selected ? 'true' : undefined}
                  className={`group flex min-h-18 items-center gap-3 rounded-2xl border px-3 py-3 transition-colors ${
                    selected
                      ? 'border-accent/45 bg-accent/15'
                      : 'border-line bg-surface hover:border-line-strong hover:bg-surface-2'
                  } ${focusRing}`}
                >
                  <Avatar avatarUrl={user.avatar_url} firstName={user.first_name} size={48} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className={`truncate text-base text-fg ${hasUnread ? 'font-bold' : 'font-semibold'}`}>
                        {user.first_name}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-muted">{time}</span>
                    </span>
                    <span className="flex items-center justify-between gap-3">
                      {last ? (
                        <span className={`truncate text-sm ${hasUnread ? 'font-medium text-fg' : 'text-muted'}`}>
                          {last.content}
                        </span>
                      ) : (
                        <span className="truncate text-sm text-muted italic">Aucun message récent · dis bonjour</span>
                      )}
                      {/* Non-lus : nombre + graisse du texte, pas la couleur seule. */}
                      {hasUnread && (
                        <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-semibold tabular-nums text-white">
                          <span aria-hidden="true">{unreadBadge(unread)}</span>
                          <span className="sr-only">{unreadLabel(unread)}</span>
                        </span>
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
