import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, accentGradient, spacing, typography, fontWeight } from '../theme';

// Progression d'un parcours en étapes (onboarding). Remplace les points :
// texte explicite "Étape n sur N" (pas seulement de la couleur / largeur)
// + barre segmentée décorative. Exposé comme "progressbar" avec sa valeur.
// `current` est 1-based.
export default function StepProgress({ current, total, label }) {
  const text = `Étape ${current} sur ${total}`;
  return (
    <View
      style={styles.root}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label ? `${text} : ${label}` : text}
      accessibilityValue={{ min: 1, max: total, now: current, text }}
    >
      <View style={styles.row}>
        <Text style={[typography.caption, styles.step]}>{text}</Text>
        {label ? <Text style={[typography.caption, styles.label]}>{label}</Text> : null}
      </View>
      <View style={styles.track}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={[styles.segment, i < current ? accentGradient : styles.segmentTodo]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingVertical: spacing.sm, gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm },
  step: { color: colors.text, fontWeight: fontWeight.semibold },
  label: { color: colors.textMuted },
  track: { flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 4, borderRadius: 2 },
  segmentTodo: { backgroundColor: colors.line },
});
