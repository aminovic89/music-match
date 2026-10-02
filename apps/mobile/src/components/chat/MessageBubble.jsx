import React from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, radius, spacing, touch, fontSize, fontWeight, lineHeight } from '../../theme';
import { messageLabel, statusText } from '../../chatFormat';

// Briques du fil de discussion (présentation pure). Miroir de
// apps/web/app/components/chat/MessageBubble.jsx.
//
// Contrastes (WCAG AA, texte normal ≥ 4.5:1) :
// - ma bulle : blanc sur accent #7c3aed → 5.7:1 (aplat, pas le dégradé) ;
// - sa bulle : text #f5f6fa sur surface2 #151a2b → 15.9:1 ;
// - infos sous la bulle : textMuted #a3aac0 sur background → 8.3:1.

// Rappel du caractère éphémère : fin bandeau épinglé sous l'en-tête (le
// fil s'ouvre en bas, un rappel placé en tête de fil ne serait jamais vu).
// Ton neutre, pas de compte à rebours anxiogène.
export function EphemeralNotice({ ttlHours = 24 }) {
  return (
    <View style={styles.notice} accessible accessibilityRole="text">
      <View style={styles.noticeDot} />
      <Text style={styles.noticeText}>{`Les messages s'effacent ${ttlHours} h après leur envoi.`}</Text>
    </View>
  );
}

export function DaySeparator({ label }) {
  return (
    <View style={styles.day} accessible accessibilityRole="text" accessibilityLabel={label}>
      <View style={styles.dayLine} />
      <Text style={styles.dayText}>{label}</Text>
      <View style={styles.dayLine} />
    </View>
  );
}

// Indicateur de saisie : trois points + texte visible (statique : rien à
// couper pour "réduire les animations"). L'annonce vocale est faite par
// ConversationScreen, d'où le libellé porté par le conteneur.
export function TypingIndicator({ name }) {
  const label = `${name} est en train d'écrire…`;
  return (
    <View style={styles.typing} accessible accessibilityRole="text" accessibilityLabel={label} testID="typing-indicator">
      <View style={styles.typingBubble}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.typingDot} />
        ))}
      </View>
      <Text style={styles.meta}>{`${name} écrit…`}</Text>
    </View>
  );
}

/**
 * Bulle de message.
 * @param {Object} props
 * @param {Object} props.row  Ligne produite par buildThread (chatFormat.js).
 * @param {string} props.peerName
 * @param {(tempId: string) => void} [props.onRetry]  Bouton "Réessayer" des messages `status: 'failed'`.
 */
export default function MessageBubble({ row, peerName, onRetry }) {
  const { message, mine, first, time, status, expiry, showMeta } = row;
  const failed = status === 'failed';
  const state = statusText(row);
  const metaParts = [time, state && `${stateGlyph(row)}${state}`, expiry.label].filter(Boolean);

  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs, { marginTop: first ? spacing.md : spacing.xs }]}>
      {/* Un seul élément accessible par message : "Toi, 14:02 : … (Vu)" */}
      <View accessible accessibilityRole="text" accessibilityLabel={messageLabel(row, peerName)} style={mine ? styles.alignEnd : styles.alignStart}>
        <View
          style={[
            styles.bubble,
            mine ? styles.mine : styles.theirs,
            mine ? (first ? null : styles.mineGrouped) : first ? null : styles.theirsGrouped,
            // Dernière heure avant effacement : contour en pointillés
            // (indice de forme, le texte garde tout son contraste).
            expiry.soon && (mine ? styles.mineSoon : styles.theirsSoon),
            failed && styles.failed,
          ]}
        >
          <Text style={[styles.content, mine && styles.contentMine]}>{message.content}</Text>
        </View>
        {showMeta ? (
          <View style={styles.metaRow}>
            {status === 'sending' ? <ActivityIndicator size="small" color={colors.textMuted} style={styles.spinner} /> : null}
            <Text style={[styles.meta, failed && styles.metaFailed]}>{metaParts.join(' · ')}</Text>
          </View>
        ) : null}
      </View>

      {failed && onRetry ? (
        <Pressable
          onPress={() => onRetry(message.tempId || message.id)}
          accessibilityRole="button"
          accessibilityLabel="Réessayer l'envoi"
          style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
        >
          <Text style={styles.retryText}>↻ Réessayer</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// Glyphe devant le statut : l'état n'est jamais porté par la couleur seule.
function stateGlyph(row) {
  if (row.status === 'failed') return '! ';
  if (row.receipt === 'read') return '✓✓ ';
  if (row.receipt === 'sent' && row.status === 'sent') return '✓ ';
  return '';
}

const TAIL = 6;

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.gutter,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    backgroundColor: colors.background,
  },
  noticeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accentText },
  noticeText: { flexShrink: 1, color: colors.textMuted, fontSize: fontSize.xs, lineHeight: lineHeight.xs + 2, textAlign: 'center' },

  day: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  dayLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
  dayText: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.medium },

  typing: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.field + 2,
    borderBottomLeftRadius: TAIL,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface2,
  },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textMuted },

  row: { gap: spacing.xs },
  rowMine: { alignItems: 'flex-end' },
  rowTheirs: { alignItems: 'flex-start' },
  alignEnd: { alignItems: 'flex-end', maxWidth: '82%' },
  alignStart: { alignItems: 'flex-start', maxWidth: '82%' },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
    borderRadius: radius.field + 2,
    borderWidth: 1,
  },
  mine: { backgroundColor: colors.accent, borderColor: colors.accent, borderBottomRightRadius: TAIL },
  mineGrouped: { borderTopRightRadius: TAIL },
  theirs: { backgroundColor: colors.surface2, borderColor: colors.line, borderBottomLeftRadius: TAIL },
  theirsGrouped: { borderTopLeftRadius: TAIL },
  mineSoon: { borderStyle: 'dashed', borderColor: 'rgba(255, 255, 255, 0.6)' },
  theirsSoon: { borderStyle: 'dashed', borderColor: colors.lineStrong },
  failed: { borderStyle: 'solid', borderColor: colors.danger },
  content: { color: colors.text, fontSize: fontSize.base, lineHeight: lineHeight.base },
  contentMine: { color: colors.onAccent },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs, paddingHorizontal: spacing.xs },
  spinner: { transform: [{ scale: 0.6 }] },
  meta: { color: colors.textMuted, fontSize: fontSize.xs, lineHeight: lineHeight.xs },
  metaFailed: { color: colors.danger, fontWeight: fontWeight.medium },

  retry: {
    minHeight: touch.min,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface2,
  },
  retryPressed: { backgroundColor: colors.line },
  retryText: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
});
