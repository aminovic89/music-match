import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Screen, { ScreenIntro } from '../components/Screen';
import Button from '../components/Button';
import Avatar from '../components/Avatar';
import { LoadingState, EmptyState } from '../components/States';
import FormAlert from '../components/Alert';
import { useNow } from '../components/chat/hooks';
import { formatListTime, unreadBadge, unreadLabel } from '../chatFormat';
import { colors, radius, spacing, fontSize, fontWeight, lineHeight } from '../theme';

/**
 * Liste des conversations (onglet "Messages") — écran de présentation,
 * sans fetch ni socket. Miroir de
 * apps/web/app/components/chat/ConversationList.jsx.
 *
 * CONTRAT (pour l'agent mobile-expo)
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
 * @param {() => void} [props.onRetry] Affiche "Réessayer" sous l'erreur.
 * @param {(id: string) => void} props.onOpenConversation  Appui sur une ligne (id de la conversation).
 * @param {() => void} [props.onNavigateDiscover]  CTA principal de l'état vide.
 * @param {() => void} [props.onNavigateMatches]   CTA secondaire de l'état vide.
 * @param {number} [props.now]  Horloge injectée (tests) ; sinon rafraîchie toutes les 30 s.
 *
 * Le total des non-lus (somme des `unread_count`) est à passer à
 * `<TabBar badges={{ messages: total }} />` dans App.tsx.
 */
export default function MessagesScreen({
  conversations = [],
  loading = false,
  error = null,
  onRetry,
  onOpenConversation,
  onNavigateDiscover,
  onNavigateMatches,
  now: nowProp,
}) {
  const tick = useNow();
  const now = nowProp ?? tick;

  return (
    <Screen header={null}>
      <ScreenIntro title="Messages" subtitle="Tes conversations avec tes matchs" />
      <FormAlert message={error} style={styles.alert} />
      {error && onRetry ? <Button title="Réessayer" variant="secondary" onPress={onRetry} style={styles.alert} /> : null}

      {loading ? (
        <LoadingState label="Chargement des conversations…" />
      ) : conversations.length === 0 ? (
        !error && (
          <EmptyState
            glyph={'\u2709\uFE0E'}
            title="Pas encore de conversation"
            text="Dès que tu as un match, vous pouvez vous écrire ici. Les messages s'effacent au bout de 24 h : l'important se dit sur le moment."
          >
            <Button title="Trouver des matchs" onPress={onNavigateDiscover} />
            {onNavigateMatches ? <Button title="Voir mes matchs" variant="secondary" onPress={onNavigateMatches} /> : null}
          </EmptyState>
        )
      ) : (
        <View style={styles.list} accessibilityRole="list">
          {conversations.map((conversation) => {
            const { user, last_message: last, unread_count: unread } = conversation;
            const hasUnread = unread > 0;
            // Sans message : la conversation date du match (created_at).
            const time = formatListTime(last ? last.sent_at : conversation.created_at, now);
            const preview = last ? last.content : 'Aucun message récent · dis bonjour';
            const label = [
              user.first_name,
              hasUnread ? unreadLabel(unread) : null,
              last ? `Dernier message : ${last.content}` : 'Aucun message récent',
              time,
            ]
              .filter(Boolean)
              .join(', ');
            return (
              <Pressable
                key={conversation.id}
                onPress={() => onOpenConversation?.(conversation.id)}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityHint="Ouvre la conversation"
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <Avatar avatarUrl={user.avatar_url} firstName={user.first_name} size={48} />
                <View style={styles.text}>
                  <View style={styles.line}>
                    <Text style={[styles.name, hasUnread && styles.nameUnread]} numberOfLines={1}>
                      {user.first_name}
                    </Text>
                    <Text style={styles.time}>{time}</Text>
                  </View>
                  <View style={styles.line}>
                    <Text
                      style={[styles.preview, hasUnread && styles.previewUnread, !last && styles.previewEmpty]}
                      numberOfLines={1}
                    >
                      {preview}
                    </Text>
                    {/* Non-lus : nombre + graisse du texte, pas la couleur seule. */}
                    {hasUnread ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{unreadBadge(unread)}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  alert: { marginBottom: spacing.lg },
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 72, // toute la ligne est la cible tactile
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.field + 2,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  rowPressed: { backgroundColor: colors.surface2 },
  text: { flex: 1, gap: 2 },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  name: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
    fontWeight: fontWeight.semibold,
  },
  nameUnread: { fontWeight: '700' },
  time: { color: colors.textMuted, fontSize: fontSize.xs, lineHeight: lineHeight.xs },
  preview: { flex: 1, color: colors.textMuted, fontSize: fontSize.sm, lineHeight: lineHeight.sm },
  previewUnread: { color: colors.text, fontWeight: fontWeight.medium },
  previewEmpty: { fontStyle: 'italic' },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  badgeText: { color: colors.onAccent, fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
});
