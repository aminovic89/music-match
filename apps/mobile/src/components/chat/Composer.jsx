import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, accentGradient, radius, spacing, touch, fontSize, fontWeight, lineHeight, shadow } from '../../theme';
import { MAX_MESSAGE_LENGTH, counterText, draftState } from '../../chatFormat';

// Hauteur max du champ (≈ 5 lignes) : au-delà, il défile. Volontairement
// plus bas que sur le web : avec le clavier ouvert sur un iPhone SE, il
// doit rester de la place pour le fil.
const MAX_HEIGHT = 132;

/**
 * Zone de saisie du chat (contrôlée). Miroir de
 * apps/web/app/components/chat/Composer.jsx.
 *
 * - champ multiligne qui grandit avec le texte jusqu'à MAX_HEIGHT ;
 * - Entrée saute une ligne, l'envoi se fait au bouton (48pt) ;
 * - bouton désactivé si le message est vide, trop long, ou si
 *   `disabledReason` est fourni ;
 * - compteur affiché à l'approche de la limite (200 derniers caractères),
 *   dépassement signalé par "!" + texte (pas la couleur seule).
 *
 * @param {Object} props
 * @param {string} props.value
 * @param {(text: string) => void} props.onChange
 * @param {() => void} props.onSubmit  Appelé seulement si le message est envoyable.
 * @param {string} props.peerName      Libellé accessible du champ : "Message à <prénom>".
 * @param {number} [props.maxLength]   Défaut 2000 (limite de l'API, après trim).
 * @param {boolean} [props.busy]       Envoi en cours (flux non optimiste) : bouton occupé.
 * @param {string|null} [props.disabledReason]  Envoi impossible (ex. hors connexion) : texte affiché.
 * @param {number} [props.bottomInset] Marge basse (safe area), 0 quand le clavier est ouvert.
 * @param {import('react').Ref} [props.inputRef]
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
  bottomInset = 0,
  inputRef,
  onBlur,
}) {
  const [focused, setFocused] = useState(false);
  const state = draftState(value, maxLength);
  const counter = counterText(state);
  const canSend = state.canSend && !busy && !disabledReason;
  const help = disabledReason || counter;

  return (
    <View style={[styles.bar, { paddingBottom: bottomInset + spacing.sm }]}>
      <View style={styles.line}>
        <View style={[styles.field, focused && styles.fieldFocused, state.isOver && styles.fieldError]}>
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={onChange}
            multiline
            placeholder="Écris un message…"
            placeholderTextColor={colors.textSubtle}
            selectionColor={colors.accentText}
            cursorColor={colors.accentText}
            keyboardAppearance="dark"
            accessibilityLabel={`Message à ${peerName}`}
            accessibilityHint={help || undefined}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              onBlur?.();
            }}
            style={styles.input}
          />
        </View>
        <Pressable
          onPress={() => {
            if (canSend) onSubmit();
          }}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel={busy ? 'Envoi en cours' : 'Envoyer'}
          accessibilityHint={!canSend && help ? help : undefined}
          accessibilityState={{ disabled: !canSend, busy }}
          style={({ pressed }) => [
            styles.send,
            accentGradient,
            canSend && shadow.glow,
            pressed && styles.sendPressed,
            !canSend && styles.sendDisabled,
          ]}
        >
          {busy ? <ActivityIndicator size="small" color={colors.onAccent} /> : <Text style={styles.sendGlyph}>↑</Text>}
        </Pressable>
      </View>

      {help ? (
        <Text
          style={[styles.help, state.isOver && !disabledReason && styles.helpError]}
          // Android : le dépassement est annoncé quand il apparaît.
          accessibilityLiveRegion={state.isOver ? 'polite' : 'none'}
        >
          {state.isOver && !disabledReason ? `! ${help}` : help}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  line: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  field: {
    flex: 1,
    minHeight: touch.control,
    maxHeight: MAX_HEIGHT,
    justifyContent: 'center',
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface2,
  },
  fieldFocused: { borderColor: colors.accentText, boxShadow: '0px 0px 0px 3px rgba(196, 181, 253, 0.3)' },
  fieldError: { borderColor: colors.danger },
  input: {
    maxHeight: MAX_HEIGHT - 2,
    paddingHorizontal: spacing.lg,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
    color: colors.text,
    textAlignVertical: 'center',
  },
  send: {
    width: touch.control,
    height: touch.control,
    borderRadius: touch.control / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendPressed: { opacity: 0.88 },
  sendDisabled: { opacity: 0.5 },
  sendGlyph: { color: colors.onAccent, fontSize: fontSize['2xl'], lineHeight: 28, fontWeight: fontWeight.semibold },
  help: { color: colors.textMuted, fontSize: fontSize.xs, lineHeight: lineHeight.xs, marginTop: 6, paddingHorizontal: spacing.xs },
  helpError: { color: colors.danger, fontWeight: fontWeight.medium },
});
