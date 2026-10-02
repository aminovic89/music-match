import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  BackHandler,
  Platform,
  StyleSheet,
  AccessibilityInfo,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import FormAlert from '../components/Alert';
import { LoadingState } from '../components/States';
import { useKeyboardVisible } from '../components/Screen';
import Composer from '../components/chat/Composer';
import MessageBubble, { DaySeparator, EphemeralNotice, TypingIndicator } from '../components/chat/MessageBubble';
import { useNow, useTypingSignal } from '../components/chat/hooks';
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
} from '../chatFormat';
import { colors, radius, spacing, touch, fontSize, fontWeight, lineHeight, shadow } from '../theme';

// En dessous de cette distance au bas du fil, on considère que
// l'utilisateur "suit" la conversation.
const NEAR_BOTTOM = 80;
const MAX_CONTENT_WIDTH = 560;

/**
 * Vue d'une conversation — écran de présentation, sans fetch ni socket.
 * Écran "poussé" (sans barre d'onglets). Miroir de
 * apps/web/app/components/chat/ConversationView.jsx.
 *
 * CONTRAT (pour l'agent mobile-expo)
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
 *                                    (`{ ...ack.message, tempId }`) : la clé React reste stable.
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
 * @param {() => void} props.onBack     Bouton retour de l'en-tête.
 * @param {number} [props.now]          Horloge injectée (tests).
 *
 * DÉFILEMENT AUTOMATIQUE
 * - À l'ouverture : positionné en bas, sans animation.
 * - Envoi ou nouvel essai de MA part : on revient toujours en bas.
 * - Nouveau message reçu, indicateur de saisie ou ouverture du clavier : on suit seulement si l'utilisateur était
 *   déjà en bas (à moins de 80pt). Sinon la position est conservée et un bouton "N nouveaux messages" apparaît ;
 *   sans nouveau message, le même bouton ("Derniers messages") ramène simplement en bas.
 * - Défilement animé, sauf si "Réduire les animations" est activé.
 *
 * CLAVIER ET ZONES SÛRES
 * - KeyboardAvoidingView (padding sur iOS, redimensionnement natif sur Android, comme Screen) : la zone de saisie
 *   reste au-dessus du clavier ; elle porte l'inset bas quand le clavier est fermé, plus quand il est ouvert.
 * - Un appui dans le fil ne ferme pas le clavier (keyboardShouldPersistTaps) ; le tirer vers le bas le ferme.
 *
 * ACCESSIBILITÉ
 * - Chaque bulle est un seul élément : "Toi, 14:02 : … (Vu)" / "<Prénom>, 14:02 : …".
 * - Le rappel "Les messages s'effacent 24 h après leur envoi" est épinglé sous l'en-tête ; une bulle n'affiche
 *   "S'efface dans …" que dans son dernier quart de vie, et passe en contour pointillé la dernière heure.
 * - Messages reçus et saisie en cours annoncés (AccessibilityInfo.announceForAccessibility).
 *
 * POURQUOI ScrollView ET PAS FlatList : le fil est borné par la durée de vie des messages (24 h), l'ordre de
 * lecture reste naturel pour les lecteurs d'écran (pas de liste inversée) et scrollToEnd y est fiable sans
 * getItemLayout. À revoir si le TTL augmente beaucoup.
 *
 * LIMITES CONNUES DE L'API (rien à faire côté présentation)
 * - `is_read` ne change que quand l'autre recharge l'historique en REST : "Vu" n'est pas temps réel.
 */
export default function ConversationScreen({
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
  onBack,
  now: nowProp,
}) {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const tick = useNow();
  const now = nowProp ?? tick;
  const name = peer?.first_name || 'Ton match';
  const subtitle = peerSubtitle(peer);

  const [draft, setDraft] = useState('');
  // Clé du dernier message au moment où l'utilisateur a quitté le bas du
  // fil (null = il suit la conversation).
  const [away, setAway] = useState(null);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const follow = useRef(true);
  const opened = useRef(false);
  const reduceMotion = useRef(false);
  const previous = useRef({ key: null, count: 0 });

  const typing = useTypingSignal(onTyping, onStopTyping);

  const visible = visibleMessages(messages, now);
  const rows = buildThread(messages, currentUserId, now, ttlHours);
  const lastMessage = visible[visible.length - 1];
  const lastKey = lastMessage ? messageKey(lastMessage) : null;
  const newCount = away ? countNewSince(visible, away.key, currentUserId) : 0;
  const suggestions = icebreakers(sharedArtists);
  const disconnected = connection === 'disconnected';

  const scrollToEnd = (animated) => {
    scrollRef.current?.scrollToEnd({ animated: animated && !reduceMotion.current });
  };

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      ?.then((enabled) => {
        if (active) reduceMotion.current = !!enabled;
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Bouton retour matériel Android : même effet que le chevron.
  const backRef = useRef(onBack);
  useEffect(() => {
    backRef.current = onBack;
  });
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!backRef.current) return false;
      backRef.current();
      return true;
    });
    return () => sub.remove();
  }, []);

  // Le clavier réduit la zone visible : on reste en bas si on y était.
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      if (follow.current) scrollRef.current?.scrollToEnd({ animated: !reduceMotion.current });
    });
    return () => sub.remove();
  }, []);

  // Annonce des messages reçus (hors chargement initial).
  useEffect(() => {
    const prev = previous.current;
    previous.current = { key: lastKey, count: visible.length };
    if (!lastMessage || lastKey === prev.key || prev.count === 0) return;
    if (!isMine(lastMessage, currentUserId)) {
      AccessibilityInfo.announceForAccessibility(`${name} : ${lastMessage.content}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastKey, visible.length]);

  useEffect(() => {
    if (peerTyping) AccessibilityInfo.announceForAccessibility(`${name} est en train d'écrire`);
  }, [peerTyping, name]);

  // Le contenu a grandi (message, indicateur de saisie) : on suit si
  // l'utilisateur était en bas. Première mise en page : sans animation.
  const handleContentSizeChange = () => {
    if (!follow.current) return;
    scrollToEnd(opened.current);
    opened.current = true;
  };

  const handleScroll = (event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const near = contentSize.height - contentOffset.y - layoutMeasurement.height < NEAR_BOTTOM;
    follow.current = near;
    if (near) setAway(null);
    else setAway((current) => current ?? { key: lastKey });
  };

  const jumpToEnd = () => {
    follow.current = true;
    setAway(null);
    scrollToEnd(true);
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
    follow.current = true;
    setAway(null);
    onSend?.(state.trimmed);
  };

  const handleRetry = onRetry
    ? (id) => {
        follow.current = true;
        onRetry(id);
      }
    : undefined;

  const applySuggestion = (text) => {
    handleChange(text);
    inputRef.current?.focus();
  };

  const side = { paddingLeft: insets.left + spacing.gutter, paddingRight: insets.right + spacing.gutter };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs, paddingLeft: insets.left + spacing.sm, paddingRight: insets.right + spacing.gutter }]}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Retour aux conversations"
          style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
        >
          <Text style={styles.backChevron}>‹</Text>
        </Pressable>
        <Avatar avatarUrl={peer?.avatar_url} firstName={peer?.first_name} size={40} />
        <View style={styles.headerText}>
          <Text accessibilityRole="header" numberOfLines={1} style={styles.name}>
            {name}
          </Text>
          {subtitle ? (
            <Text numberOfLines={1} style={styles.subtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <EphemeralNotice ttlHours={ttlHours} />

      {connection !== 'connected' ? (
        <View
          style={styles.connection}
          accessible
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
          testID="connection-banner"
        >
          {disconnected ? <Text style={styles.connectionGlyph}>!</Text> : <ActivityIndicator size="small" color={colors.textMuted} />}
          <Text style={styles.connectionText}>
            {disconnected ? "Hors connexion. Tu pourras écrire dès que la connexion sera revenue." : 'Reconnexion en cours…'}
          </Text>
        </View>
      ) : null}

      {/* Erreur épinglée (hors zone défilante) : visible même quand le fil
          est positionné en bas. */}
      {error ? (
        <View style={[styles.errorBox, side]}>
          <FormAlert message={error} />
          {onReload ? <Button title="Réessayer" variant="secondary" onPress={onReload} /> : null}
        </View>
      ) : null}

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.flex}>
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={[styles.thread, side]}
            onScroll={handleScroll}
            scrollEventThrottle={100}
            onContentSizeChange={handleContentSizeChange}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            <View style={styles.constrained}>
              {loading ? (
                <LoadingState label="Chargement des messages…" />
              ) : rows.length === 0 ? (
                !error && (
                  <View style={styles.empty}>
                    <Avatar avatarUrl={peer?.avatar_url} firstName={peer?.first_name} size={72} />
                    <Text accessibilityRole="header" style={styles.emptyTitle}>
                      {`Dis bonjour à ${name}`}
                    </Text>
                    <Text style={styles.emptyText}>
                      {suggestions.length > 0
                        ? 'Vous avez des artistes en commun : un bon point de départ.'
                        : 'Parle-lui du dernier titre que tu as écouté en boucle.'}
                    </Text>
                    {suggestions.length > 0 ? (
                      <View style={styles.suggestions}>
                        {suggestions.map((suggestion) => (
                          <Pressable
                            key={suggestion.artist}
                            onPress={() => applySuggestion(suggestion.text)}
                            accessibilityRole="button"
                            accessibilityLabel={suggestion.text}
                            accessibilityHint="Copie cette phrase dans le champ de message"
                            style={({ pressed }) => [styles.suggestion, pressed && styles.suggestionPressed]}
                          >
                            <Text style={styles.suggestionGlyph}>♪</Text>
                            <Text style={styles.suggestionText}>{suggestion.text}</Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                  </View>
                )
              ) : (
                <View accessibilityRole="list">
                  {rows.map((row) =>
                    row.type === 'day' ? (
                      <DaySeparator key={row.key} label={row.label} />
                    ) : (
                      <MessageBubble key={row.key} row={row} peerName={name} onRetry={handleRetry} />
                    )
                  )}
                </View>
              )}
              {peerTyping && !loading ? <TypingIndicator name={name} /> : null}
            </View>
          </ScrollView>

          {away ? (
            <Pressable
              onPress={jumpToEnd}
              accessibilityRole="button"
              accessibilityLabel={
                newCount > 0
                  ? `${newCount} ${newCount > 1 ? 'nouveaux messages' : 'nouveau message'}, aller en bas`
                  : 'Aller aux derniers messages'
              }
              style={({ pressed }) => [styles.jump, shadow.card, pressed && styles.jumpPressed]}
            >
              <Text style={styles.jumpGlyph}>↓</Text>
              <Text style={styles.jumpText}>
                {newCount > 0
                  ? `${newCount} ${newCount > 1 ? 'nouveaux messages' : 'nouveau message'}`
                  : 'Derniers messages'}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View style={{ paddingLeft: insets.left, paddingRight: insets.right, backgroundColor: colors.surface }}>
          <Composer
            value={draft}
            onChange={handleChange}
            onSubmit={handleSubmit}
            onBlur={typing.stop}
            peerName={name}
            maxLength={maxLength}
            busy={sending}
            disabledReason={disconnected ? 'Envoi indisponible hors connexion.' : null}
            bottomInset={keyboardVisible ? 0 : insets.bottom}
            inputRef={inputRef}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  constrained: { flexGrow: 1, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', justifyContent: 'flex-end' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.surface,
  },
  back: {
    minWidth: touch.min,
    minHeight: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  backPressed: { backgroundColor: colors.surface2 },
  backChevron: { color: colors.text, fontSize: 34, lineHeight: 38, marginTop: -4 },
  headerText: { flex: 1, marginLeft: spacing.xs },
  name: { color: colors.text, fontSize: fontSize.base, lineHeight: lineHeight.base, fontWeight: fontWeight.semibold },
  subtitle: { color: colors.textMuted, fontSize: fontSize.sm, lineHeight: lineHeight.sm },

  connection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.surface2,
  },
  connectionGlyph: { color: colors.danger, fontSize: fontSize.sm, fontWeight: '700' },
  connectionText: { flexShrink: 1, color: colors.text, fontSize: fontSize.xs, lineHeight: lineHeight.xs + 2, fontWeight: fontWeight.medium },
  errorBox: { gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },

  // flexGrow + justifyContent (via `constrained`) : un fil court reste
  // collé en bas, près du champ.
  thread: { flexGrow: 1, paddingTop: spacing.md, paddingBottom: spacing.lg },

  empty: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  emptyTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  emptyText: { color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 22, textAlign: 'center', maxWidth: 300 },
  suggestions: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.sm },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touch.min,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.field + 2,
    borderWidth: 1,
    borderColor: colors.accentLine,
    backgroundColor: colors.accentSoft,
  },
  suggestionPressed: { backgroundColor: colors.surface2 },
  suggestionGlyph: { color: colors.accentText, fontSize: fontSize.base },
  suggestionText: { flex: 1, color: colors.text, fontSize: fontSize.sm, lineHeight: lineHeight.sm },

  jump: {
    position: 'absolute',
    bottom: spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: touch.min,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface2,
  },
  jumpPressed: { backgroundColor: colors.line },
  jumpGlyph: { color: colors.accentText, fontSize: fontSize.base, fontWeight: fontWeight.semibold },
  jumpText: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
});
