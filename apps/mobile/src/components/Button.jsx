import React from 'react';
import { Pressable, Text, ActivityIndicator, View, StyleSheet } from 'react-native';
import { colors, accentGradient, radius, spacing, touch, typography, shadow } from '../theme';

// Bouton de base du design system (miroir de apps/web/app/components/Button.jsx).
// - primary : dégradé accent → accent2, texte blanc (action principale)
// - secondary : surface + bordure
// - ghost : texte seul, pour les actions tertiaires
// Hauteur mini 48pt (jamais une hauteur fixe, pour le texte agrandi).
// En chargement : spinner + libellé fourni par l'écran, état "busy" annoncé.
export default function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  accessibilityHint,
  testID,
}) {
  const isDisabled = disabled || loading;
  const textColor =
    variant === 'primary' ? colors.onAccent : variant === 'ghost' ? colors.textMuted : colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && [accentGradient, shadow.glow],
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        pressed && pressedStyles[variant],
        isDisabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading && <ActivityIndicator size="small" color={textColor} />}
        <Text style={[typography.button, styles.label, { color: textColor }]}>{title}</Text>
      </View>
    </Pressable>
  );
}

const pressedStyles = StyleSheet.create({
  // Pas de filtre brightness en RN : on assombrit via l'opacité.
  primary: { opacity: 0.88 },
  secondary: { backgroundColor: colors.line },
  ghost: { backgroundColor: colors.surface2 },
});

const styles = StyleSheet.create({
  base: {
    minHeight: touch.control,
    borderRadius: radius.field,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  ghost: {
    minHeight: touch.min,
    paddingHorizontal: spacing.md,
  },
  disabled: { opacity: 0.6 },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  label: { textAlign: 'center', flexShrink: 1 },
});
