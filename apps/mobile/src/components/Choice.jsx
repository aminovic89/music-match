import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, radius, spacing, touch, typography, fontSize, fontWeight } from '../theme';

// Choix exclusifs (intention, genre…). Rôle "radio" + accessibilityState
// checked ; l'état sélectionné est porté par une coche ✓ ET la couleur,
// jamais par la seule bordure.

export function RadioGroup({ label, children, style }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={style}>
      {children}
    </View>
  );
}

function Check({ selected }) {
  return (
    <View style={[styles.check, selected && styles.checkOn]}>
      {selected ? <Text style={styles.checkGlyph}>✓</Text> : null}
    </View>
  );
}

// Carte de choix : icône (décorative), titre, description, coche.
export function RadioCard({ title, description, icon, selected, onPress, accessibilityHint }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: !!selected, selected: !!selected }}
      accessibilityLabel={description ? `${title}. ${description}` : title}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.card, selected && styles.selected, pressed && styles.pressed]}
    >
      {icon ? (
        <View style={styles.iconBubble} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <Text style={styles.icon}>{icon}</Text>
        </View>
      ) : null}
      <View style={styles.cardText}>
        <Text style={[typography.label, styles.cardTitle]}>{title}</Text>
        {description ? <Text style={typography.subtitle}>{description}</Text> : null}
      </View>
      <Check selected={selected} />
    </Pressable>
  );
}

// Pastille de choix compacte (ex. Homme / Femme / Autre).
export function RadioChip({ label, selected, onPress, accessibilityHint }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: !!selected, selected: !!selected }}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>
        {selected ? '✓ ' : ''}
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touch.control,
    padding: spacing.lg,
    borderRadius: radius.field + 2,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
  },
  selected: { borderColor: colors.accentText, backgroundColor: colors.accentSoft },
  pressed: { opacity: 0.85 },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: fontSize.lg },
  cardText: { flex: 1, gap: 2 },
  cardTitle: { fontSize: fontSize.base },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { borderColor: colors.accent, backgroundColor: colors.accent },
  checkGlyph: { color: colors.onAccent, fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  chip: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 88,
    minHeight: touch.min,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: fontWeight.medium, textAlign: 'center' },
  chipTextOn: { color: colors.text },
});
