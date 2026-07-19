import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';

const MOODS_LABELS = {
  energetic: { label: 'Énergique', emoji: '⚡' },
  chill: { label: 'Chill', emoji: '😌' },
  happy: { label: 'Joyeux', emoji: '😊' },
  melancholic: { label: 'Mélancolique', emoji: '🌙' },
  danceable: { label: 'Dansant', emoji: '💃' },
  intense: { label: 'Intense', emoji: '🔥' },
  romantic: { label: 'Romantique', emoji: '🌹' },
  neutral: { label: 'Neutre', emoji: '🎵' },
};

function MetricBar({ label, value }) {
  const pct = Math.round((value || 0) * 100);
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.metricValue}>{pct}</Text>
    </View>
  );
}

export default function DnaScreen({ profile, onComplete, onBack }) {
  if (!profile) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🎵</Text>
        <Text style={styles.emptyText}>Profil musical non disponible</Text>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.linkText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Ton ADN musical 🎵</Text>
      <Text style={styles.subtitle}>Voilà ce qu'on a trouvé à partir de tes titres</Text>

      {/* Métriques audio */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>AUDIO</Text>
        <MetricBar label="Énergie" value={profile.avg_energy} />
        <MetricBar label="Positivité" value={profile.avg_valence} />
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>BPM moy.</Text>
          <View style={styles.barBg} />
          <Text style={styles.metricValueBold}>{Math.round(profile.avg_tempo || 0)}</Text>
        </View>
      </View>

      {/* Artistes */}
      {profile.top_artists?.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ARTISTES DOMINANTS</Text>
          <View style={styles.tags}>
            {profile.top_artists.map((artist) => (
              <View key={artist} style={styles.tagPurple}>
                <Text style={styles.tagPurpleText}>{artist}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Moods */}
      {profile.top_moods?.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>TES MOODS</Text>
          <View style={styles.tags}>
            {profile.top_moods.map((mood) => {
              const info = MOODS_LABELS[mood] || { label: mood, emoji: '🎵' };
              return (
                <View key={mood} style={styles.tagGreen}>
                  <Text style={styles.tagGreenText}>{info.emoji} {info.label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.btn} onPress={onComplete}>
        <Text style={styles.btnText}>Voir mes matchs →</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backLink} onPress={onBack}>
        <Text style={styles.linkText}>← Modifier mes titres</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: '#9ca3af', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '600', color: '#fff', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginBottom: 24 },
  card: {
    backgroundColor: '#18181b', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#27272a', marginBottom: 12,
  },
  cardTitle: { color: '#6b7280', fontSize: 11, letterSpacing: 1, marginBottom: 12 },
  metricRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  metricLabel: { color: '#9ca3af', fontSize: 12, width: 70 },
  barBg: { flex: 1, height: 6, backgroundColor: '#27272a', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: '#7c3aed', borderRadius: 3 },
  metricValue: { color: '#9ca3af', fontSize: 12, width: 24, textAlign: 'right' },
  metricValueBold: { color: '#fff', fontSize: 14, fontWeight: '500', width: 24, textAlign: 'right' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagPurple: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)',
  },
  tagPurpleText: { color: '#c4b5fd', fontSize: 12 },
  tagGreen: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
  },
  tagGreenText: { color: '#6ee7b7', fontSize: 12 },
  btn: {
    backgroundColor: '#7c3aed', borderRadius: 16,
    paddingVertical: 14, alignItems: 'center', marginBottom: 12,
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  backLink: { alignItems: 'center', paddingBottom: 32 },
  linkText: { color: '#6b7280', fontSize: 13 },
});
