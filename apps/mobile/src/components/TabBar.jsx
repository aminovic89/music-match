import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, accentGradient, touch, fontSize, fontWeight } from '../theme';

// Barre d'onglets du bas (miroir de BottomNav web) : Accueil / Découvrir /
// Matchs / Messages. Glyphes texte (pas de lib d'icônes), décoratifs : le
// libellé porte le sens. Chaque onglet fait 56pt de haut et prend 1/4 de la
// largeur (80pt sur un écran de 320pt) : libellés d'un seul mot, sur une
// ligne, dont l'agrandissement est plafonné pour rester lisibles côte à côte.
// La barre est la SEULE à appliquer l'inset bas de la safe area pour les
// écrans à onglets (ceux-ci sont dans AboveTabBarContext, cf. Screen).
// Onglet actif (comme sur le web) : barre dégradée en haut + glyphe accent
// + libellé en couleur pleine — pas seulement une nuance de couleur.
export const TABS = [
  { key: 'home', label: 'Accueil', glyph: '⌂' },
  { key: 'discover', label: 'Découvrir', glyph: '◎' },
  { key: 'matches', label: 'Matchs', glyph: '♥' },
  // U+FE0E : force le rendu texte (monochrome) de l'enveloppe, pas l'emoji.
  { key: 'messages', label: 'Messages', glyph: '\u2709\uFE0E' },
];

// Plafond d'agrandissement du texte dans la barre : au-delà, 4 libellés ne
// tiennent plus sur 320pt (le libellé complet reste lu par VoiceOver/TalkBack).
const MAX_FONT_SCALE = 1.3;

// `badges` : compteurs par onglet, ex. { messages: 3 } (messages non lus).
// Le nombre est affiché ET ajouté au libellé accessible ("Messages, 3 non
// lus") — jamais un simple point coloré.
export default function TabBar({ current, onNavigate, badges = {} }) {
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
        const count = (badges && badges[tab.key]) || 0;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onNavigate(tab.key)}
            accessibilityRole="tab"
            accessibilityLabel={count > 0 ? `${tab.label}, ${count} non lu${count > 1 ? 's' : ''}` : tab.label}
            accessibilityState={{ selected }}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            {selected ? <View style={[styles.indicator, accentGradient]} /> : null}
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[styles.glyph, selected && styles.glyphSelected]}>
                {tab.glyph}
              </Text>
              {count > 0 ? (
                <View style={styles.badge}>
                  <Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={styles.badgeText}>
                    {count > 99 ? '99+' : count}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={MAX_FONT_SCALE}
              style={[styles.label, selected && styles.labelSelected]}
            >
              {tab.label}
            </Text>
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
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  pressed: { backgroundColor: colors.surface2 },
  indicator: { position: 'absolute', top: 0, left: 16, right: 16, height: 2, borderRadius: 1 },
  badge: {
    position: 'absolute',
    top: -4,
    left: 14,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  badgeText: { color: colors.onAccent, fontSize: 10, lineHeight: 12, fontWeight: fontWeight.semibold },
  glyph: { color: colors.textMuted, fontSize: fontSize.xl, lineHeight: 24 },
  glyphSelected: { color: colors.accentText },
  label: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.medium, textAlign: 'center' },
  labelSelected: { color: colors.text },
});
