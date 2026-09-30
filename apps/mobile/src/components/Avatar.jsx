import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, accentGradientDiagonal, fontWeight } from '../theme';

// Photo de profil, ou initiale du prénom sur pastille dégradée (miroir de
// apps/web/app/components/Avatar.jsx). Décoratif : le prénom est déjà dit
// dans le texte à côté.
export default function Avatar({ avatarUrl, firstName, size = 56 }) {
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={[box, styles.image]}
        accessibilityIgnoresInvertColors
        accessible={false}
      />
    );
  }
  const initial = (firstName || '').trim().charAt(0).toUpperCase() || '♪';
  return (
    <View
      style={[box, styles.fallback, accentGradientDiagonal]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.surface2 },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initial: { color: colors.onAccent, fontWeight: fontWeight.semibold },
});
