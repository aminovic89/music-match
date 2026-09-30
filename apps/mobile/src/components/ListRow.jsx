import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, radius, spacing, touch, fontSize, fontWeight, lineHeight } from '../theme';

// Ligne d'action (menu) : icône décorative, titre, description, chevron.
// Toute la ligne est la cible (≥ 56pt) ; titre + description forment le
// libellé accessible.
export default function ListRow({ icon, title, description, onPress, accessibilityHint }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={description ? `${title}. ${description}` : title}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {icon ? (
        <View style={styles.icon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Text style={styles.iconGlyph}>{icon}</Text>
        </View>
      ) : null}
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touch.control + 8,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.field + 2,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  pressed: { backgroundColor: colors.surface2 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlyph: { color: colors.accentText, fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
  text: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: fontSize.base, lineHeight: lineHeight.base, fontWeight: fontWeight.semibold },
  description: { color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 20 },
  chevron: { color: colors.textMuted, fontSize: 26 },
});
