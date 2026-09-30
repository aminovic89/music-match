import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, radius, touch, fontSize } from '../theme';

// Bouton icône (glyphe texte, pas de lib d'icônes). Cible 44×44pt
// garantie ; `accessibilityLabel` obligatoire puisqu'il n'y a pas de texte.
export default function IconButton({ glyph, accessibilityLabel, onPress, disabled = false, tone = 'muted', style }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.base, pressed && styles.pressed, disabled && styles.disabled, style]}
    >
      <Text style={[styles.glyph, { color: tone === 'accent' ? colors.accentText : colors.textMuted }]}>{glyph}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minWidth: touch.min,
    minHeight: touch.min,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: colors.line },
  disabled: { opacity: 0.5 },
  glyph: { fontSize: fontSize.lg },
});
