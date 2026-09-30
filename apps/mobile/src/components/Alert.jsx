import React, { useEffect } from 'react';
import { View, Text, StyleSheet, AccessibilityInfo, Platform } from 'react-native';
import { colors, radius, spacing, typography, fontSize } from '../theme';

// Message de retour (erreur / succès), miroir de apps/web/app/components/Alert.jsx.
// Icône + texte + préfixe lu par les lecteurs d'écran : l'information
// n'est jamais portée par la couleur seule.
const TONES = {
  error: {
    box: { backgroundColor: colors.dangerBg, borderColor: colors.dangerLine },
    fg: colors.danger,
    glyph: '!',
    prefix: 'Erreur',
  },
  success: {
    box: { backgroundColor: colors.successBg, borderColor: colors.successLine },
    fg: colors.success,
    glyph: '✓',
    prefix: 'Succès',
  },
};

export function Alert({ tone = 'error', message, style }) {
  const t = TONES[tone];
  return (
    <View
      style={[styles.box, t.box, style]}
      accessible
      accessibilityRole={tone === 'error' ? 'alert' : 'text'}
      accessibilityLabel={`${t.prefix} : ${message}`}
      // Android : annonce automatique quand le contenu apparaît/change.
      accessibilityLiveRegion={tone === 'error' ? 'assertive' : 'polite'}
    >
      <View style={[styles.icon, { borderColor: t.fg }]}>
        <Text style={[styles.glyph, { color: t.fg }]}>{t.glyph}</Text>
      </View>
      <Text style={[typography.subtitle, styles.text]}>{message}</Text>
    </View>
  );
}

// Annonce un message aux lecteurs d'écran à chaque changement (iOS n'a pas
// de live region → announceForAccessibility ; sur Android, l'élément
// affiché doit porter accessibilityLiveRegion).
export function useAnnounce(message) {
  useEffect(() => {
    if (message && Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }, [message]);
}

// Alerte de formulaire : rendue si `message`, et annoncée à chaque nouveau
// message.
export default function FormAlert({ message, tone = 'error', style }) {
  useAnnounce(message ? `${TONES[tone].prefix} : ${message}` : null);

  if (!message) return null;
  return <Alert tone={tone} message={message} style={style} />;
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.field,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  icon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  glyph: { fontSize: fontSize.xs, fontWeight: '700' },
  text: { flex: 1, color: colors.text },
});
