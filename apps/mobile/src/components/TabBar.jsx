import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, touch, fontSize, fontWeight, radius } from '../theme';

// Barre d'onglets du bas (miroir de BottomNav web) : Accueil / Découvrir /
// Matchs. Glyphes texte (pas de lib d'icônes), décoratifs : le libellé
// porte le sens. Chaque onglet fait ≥ 44pt de haut et prend 1/3 de la largeur.
export const TABS = [
  { key: 'home', label: 'Accueil', glyph: '⌂' },
  { key: 'discover', label: 'Découvrir', glyph: '◎' },
  { key: 'matches', label: 'Matchs', glyph: '♥' },
];

export default function TabBar({ current, onNavigate }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        { paddingBottom: insets.bottom + spacing.xs, paddingLeft: insets.left, paddingRight: insets.right },
      ]}
    >
      {TABS.map((tab) => {
        const selected = tab.key === current;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onNavigate(tab.key)}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected }}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            <View style={[styles.pill, selected && styles.pillSelected]}>
              <Text
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={[styles.glyph, selected && styles.selectedText]}
              >
                {tab.glyph}
              </Text>
            </View>
            <Text style={[styles.label, selected && styles.selectedText]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
    paddingTop: spacing.xs,
  },
  tab: {
    flex: 1,
    minHeight: touch.min + 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: radius.md,
  },
  pressed: { backgroundColor: colors.surface2 },
  pill: {
    minWidth: 52,
    alignItems: 'center',
    borderRadius: radius.pill,
    paddingVertical: 2,
  },
  pillSelected: { backgroundColor: colors.accentSoft },
  glyph: { color: colors.textMuted, fontSize: fontSize.xl },
  label: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.medium, textAlign: 'center' },
  selectedText: { color: colors.accentText },
});
