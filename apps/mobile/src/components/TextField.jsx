import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { colors, radius, spacing, touch, typography, fontSize, fontWeight } from '../theme';

// Champ texte avec libellé visible, aide (hint) et erreur optionnelles.
// Miroir de apps/web/app/components/TextField.jsx.
// - fontSize 16 + minHeight 48 : lisible, et pas de hauteur fixe qui
//   tronquerait le texte agrandi (Dynamic Type / taille de police Android).
// - Le libellé visible est aussi passé en accessibilityLabel (iOS ne gère
//   pas accessibilityLabelledBy) ; hint/erreur passent en accessibilityHint.
// - Focus visible : bordure accent + halo, pas seulement une nuance.
export default function TextField({
  label,
  hint,
  error,
  style,
  inputStyle,
  right,
  onFocus,
  onBlur,
  ref,
  ...inputProps
}) {
  const [focused, setFocused] = useState(false);
  const description = [error, hint].filter(Boolean).join('. ') || undefined;

  return (
    <View style={style}>
      <Text style={[typography.label, styles.label]}>{label}</Text>
      <View style={[styles.field, focused && styles.fieldFocused, error && styles.fieldError]}>
        <TextInput
          ref={ref}
          {...inputProps}
          accessibilityLabel={label}
          accessibilityHint={description}
          placeholderTextColor={colors.textSubtle}
          selectionColor={colors.accentText}
          cursorColor={colors.accentText}
          keyboardAppearance="dark"
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, inputStyle]}
        />
        {right}
      </View>
      {error ? (
        <Text style={[typography.caption, styles.helper, styles.error]}>{error}</Text>
      ) : hint ? (
        <Text style={[typography.caption, styles.helper]}>{hint}</Text>
      ) : null}
    </View>
  );
}

// Champ mot de passe avec bouton Afficher/Masquer (état purement visuel,
// la valeur reste gérée par l'écran). Libellé texte plutôt qu'une icône :
// pas de lib d'icônes, et le sens est explicite.
export function PasswordField(props) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      secureTextEntry={!visible}
      right={
        <Pressable
          onPress={() => setVisible((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          style={({ pressed }) => [styles.toggle, pressed && styles.togglePressed]}
        >
          <Text style={styles.toggleText}>{visible ? 'Masquer' : 'Afficher'}</Text>
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 6 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touch.control,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface2,
  },
  fieldFocused: {
    borderColor: colors.accentText,
    boxShadow: '0px 0px 0px 3px rgba(196, 181, 253, 0.3)',
  },
  fieldError: { borderColor: colors.danger },
  input: {
    flex: 1,
    minHeight: touch.control - 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    color: colors.text,
  },
  toggle: {
    minHeight: touch.min,
    minWidth: touch.min,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    marginRight: spacing.xxs,
  },
  togglePressed: { backgroundColor: colors.line },
  toggleText: { color: colors.accentText, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  helper: { marginTop: 6 },
  error: { color: colors.danger },
});
