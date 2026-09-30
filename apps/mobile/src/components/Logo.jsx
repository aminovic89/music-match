import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, accentGradientDiagonal, fontSize, fontWeight, shadow } from '../theme';

// Marque Music Match : pastille dégradée (égaliseur) + wordmark.
// Miroir de apps/web/app/components/Logo.jsx.
const BARS = [
  { h: 0.3, o: 0.9 },
  { h: 0.55, o: 1 },
  { h: 0.4, o: 0.9 },
  { h: 0.65, o: 1 },
];

// Décorative : masquée des lecteurs d'écran (le nom est porté par le wordmark).
export function LogoMark({ size = 40 }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.mark,
        accentGradientDiagonal,
        shadow.glow,
        { width: size, height: size, borderRadius: size * 0.3, gap: Math.max(2, size * 0.075) },
      ]}
    >
      {BARS.map((bar, i) => (
        <View
          key={i}
          style={{
            width: Math.max(2, size * 0.07),
            height: size * bar.h,
            borderRadius: size,
            backgroundColor: `rgba(255, 255, 255, ${bar.o})`,
          }}
        />
      ))}
    </View>
  );
}

export default function Logo({ style }) {
  return (
    <View style={[styles.row, style]} accessible accessibilityLabel="Music Match">
      <LogoMark size={36} />
      <Text style={styles.wordmark}>Music Match</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wordmark: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    letterSpacing: -0.3,
  },
});
