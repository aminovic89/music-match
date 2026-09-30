import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, accentGradient, radius, spacing, fontSize, fontWeight } from '../theme';

// Jauge de compatibilité (miroir de Compatibility.jsx web). Le pourcentage
// est en texte ; la barre est décorative.
export default function Compatibility({ score, style }) {
  const pct = Math.max(0, Math.min(100, Math.round((score || 0) * 100)));
  return (
    <View style={style}>
      <View style={styles.row}>
        <Text style={styles.label}>Compatibilité</Text>
        <Text style={styles.value}>{pct} %</Text>
      </View>
      <View
        style={styles.track}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={[styles.fill, accentGradient, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  label: { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  value: { color: colors.accentText, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  track: {
    height: 8,
    marginTop: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface2,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.pill },
});
