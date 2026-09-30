import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight, touch, spacing } from '../theme';

// Lien texte accentué (navigation interne), miroir de TextLink web.
// Zone tactile ≥ 44pt de haut même si le texte est petit.
export default function TextLink({ title, onPress, style, textStyle, accessibilityHint }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      hitSlop={{ left: spacing.xs, right: spacing.xs }}
      style={({ pressed }) => [styles.base, pressed && styles.pressed, style]}
    >
      <Text style={[styles.text, textStyle]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touch.min,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    borderRadius: 6,
  },
  pressed: { opacity: 0.7 },
  text: { color: colors.accentText, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
});
