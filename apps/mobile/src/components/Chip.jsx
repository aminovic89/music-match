import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, fontSize, fontWeight } from '../theme';

// Étiquette non interactive (artistes, moods). Tons :
// - accent  : violet (artistes)
// - accent2 : fuchsia (moods)
// - neutral : surface
const TONES = {
  accent: { box: { backgroundColor: colors.accentSoft, borderColor: colors.accentLine }, text: colors.accentText },
  accent2: { box: { backgroundColor: colors.accent2Soft, borderColor: colors.accent2Line }, text: colors.accent2Text },
  neutral: { box: { backgroundColor: colors.surface2, borderColor: colors.line }, text: colors.text },
};

export default function Chip({ label, tone = 'neutral', style }) {
  const t = TONES[tone];
  return (
    <View style={[styles.chip, t.box, style]}>
      <Text style={[styles.text, { color: t.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  text: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
});
