import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight } from '../theme';

// Titre de section (petites capitales, contraste AA : textMuted ≈ 8:1 sur
// le fond) + contenu. `right` : élément aligné à droite du titre (compteur…).
export function SectionTitle({ children, right, style }) {
  return (
    <View style={[styles.titleRow, style]}>
      <Text accessibilityRole="header" style={styles.title}>
        {children}
      </Text>
      {right}
    </View>
  );
}

export default function Section({ title, right, children, style }) {
  return (
    <View style={[styles.section, style]}>
      {title ? <SectionTitle right={right}>{title}</SectionTitle> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  title: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 16,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
