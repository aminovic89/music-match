import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';

const INTENTS = [
  {
    id: 'romantic',
    label: 'Une rencontre romantique',
    description: "Quelqu'un qui partage ta vision de la musique",
    icon: '❤️',
  },
  {
    id: 'friendship',
    label: 'Une amitié',
    description: 'Des gens avec qui sortir, écouter de la musique',
    icon: '👥',
  },
];

export default function IntentScreen({ initialIntent = 'romantic', onSave, loading, error }) {
  const [selected, setSelected] = useState(initialIntent);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Je cherche...</Text>
      <Text style={styles.subtitle}>Choisis ton intention — tu pourras la changer plus tard</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.cards}>
        {INTENTS.map((intent) => (
          <TouchableOpacity
            key={intent.id}
            style={[styles.card, selected === intent.id && styles.cardSelected]}
            onPress={() => setSelected(intent.id)}
          >
            <Text style={styles.cardIcon}>{intent.icon}</Text>
            <Text style={styles.cardLabel}>{intent.label}</Text>
            <Text style={styles.cardDesc}>{intent.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.btn, loading && styles.btnDisabled]}
        onPress={() => onSave(selected)}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnText}>Continuer →</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 24, fontWeight: '600', color: '#fff', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginBottom: 32 },
  error: { color: '#f87171', textAlign: 'center', marginBottom: 16, fontSize: 13 },
  cards: { gap: 12, marginBottom: 32 },
  card: {
    padding: 16, borderRadius: 16,
    borderWidth: 1, borderColor: '#3f3f46',
    backgroundColor: '#18181b',
  },
  cardSelected: { borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.1)' },
  cardIcon: { fontSize: 24, marginBottom: 8 },
  cardLabel: { fontSize: 15, fontWeight: '500', color: '#fff', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#9ca3af' },
  btn: {
    backgroundColor: '#7c3aed', borderRadius: 16,
    paddingVertical: 14, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
