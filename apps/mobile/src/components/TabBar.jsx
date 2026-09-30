import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, accentGradient, touch, fontSize, fontWeight } from '../theme';

// Barre d'onglets du bas (miroir de BottomNav web) : Accueil / Découvrir /
// Matchs. Glyphes texte (pas de lib d'icônes), décoratifs : le libellé
// porte le sens. Chaque onglet fait 56pt de haut et prend 1/3 de la largeur.
// La barre est la SEULE à appliquer l'inset bas de la safe area pour les
// écrans à onglets (ceux-ci sont dans AboveTabBarContext, cf. Screen).
// Onglet actif (comme sur le web) : barre dégradée en haut + glyphe accent
// + libellé en couleur pleine — pas seulement une nuance de couleur.
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
        { paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right },
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
            {selected ? <View style={[styles.indicator, accentGradient]} /> : null}
            <Text
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[styles.glyph, selected && styles.glyphSelected]}
            >
              {tab.glyph}
            </Text>
            <Text style={[styles.label, selected && styles.labelSelected]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
  },
  tab: {
    flex: 1,
    minHeight: touch.control + 8, // 56pt, comme min-h-14 côté web
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  pressed: { backgroundColor: colors.surface2 },
  indicator: { position: 'absolute', top: 0, left: 24, right: 24, height: 2, borderRadius: 1 },
  glyph: { color: colors.textMuted, fontSize: fontSize.xl, lineHeight: 24 },
  glyphSelected: { color: colors.accentText },
  label: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.medium, textAlign: 'center' },
  labelSelected: { color: colors.text },
});
