import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Chip from './Chip';
import { moodInfo } from '../moods';
import { colors, spacing, fontSize, fontWeight } from '../theme';

// Goûts affichés sur la carte de découverte (champs optionnels de
// GET /api/matching/discover, absents d'une API plus ancienne) :
// - en commun (shared_*) : "Vous aimez tous les deux", artistes en violet,
//   moods en rose ;
// - sinon ses goûts (top_*) : chips neutres ;
// - sinon rien. Miroir de TasteChips.jsx web.
export function tasteSummary(candidate) {
  const sharedArtists = candidate.shared_artists ?? [];
  const sharedMoods = candidate.shared_moods ?? [];
  const topArtists = candidate.top_artists ?? [];
  const topMoods = candidate.top_moods ?? [];

  if (sharedArtists.length > 0 || sharedMoods.length > 0) {
    return { kind: 'shared', artists: sharedArtists, moods: sharedMoods };
  }
  if (topArtists.length > 0 || topMoods.length > 0) {
    return { kind: 'top', artists: topArtists, moods: topMoods };
  }
  return null;
}

// Annonce courte pour les lecteurs d'écran ("3 artistes en commun").
export function sharedAnnouncement(candidate) {
  const a = (candidate.shared_artists ?? []).length;
  const m = (candidate.shared_moods ?? []).length;
  const parts = [];
  if (a > 0) parts.push(`${a} artiste${a > 1 ? 's' : ''} en commun`);
  if (m > 0) parts.push(`${m} mood${m > 1 ? 's' : ''} en commun`);
  return parts.join(', ');
}

function topTitle(artists, moods) {
  if (artists.length > 0 && moods.length > 0) return 'Ses artistes et ses moods';
  return artists.length > 0 ? 'Ses artistes' : 'Ses moods';
}

export default function TasteChips({ candidate, style }) {
  const summary = tasteSummary(candidate);
  if (!summary) return null;

  const shared = summary.kind === 'shared';
  const title = shared ? 'Vous aimez tous les deux' : topTitle(summary.artists, summary.moods);

  return (
    <View style={[styles.section, style]} accessibilityLabel={title}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <View style={styles.chips}>
        {summary.artists.map((artist) => (
          <Chip key={`a-${artist}`} label={artist} tone={shared ? 'accent' : 'neutral'} />
        ))}
        {summary.moods.map((mood) => {
          const info = moodInfo(mood);
          return <Chip key={`m-${mood}`} label={`${info.emoji} ${info.label}`} tone={shared ? 'accent2' : 'neutral'} />;
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  title: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 16,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
});
