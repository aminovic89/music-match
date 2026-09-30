import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius, spacing, shadow } from '../theme';

// Surface de contenu (formulaires, panneaux), miroir de Card web.
// `compact` pour les petits écrans (< 360pt), où 24pt de padding mangent
// trop de largeur utile.
export default function Card({ children, style, compact = false }) {
  return <View style={[styles.card, compact && styles.compact, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.xl,
    ...shadow.card,
  },
  compact: { padding: spacing.lg + 4 },
});
