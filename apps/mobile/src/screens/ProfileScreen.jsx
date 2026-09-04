import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import { apiClient } from '@music-match/shared';

const INTENTS = [
  { id: 'romantic', label: 'Une rencontre romantique', icon: '❤️' },
  { id: 'friendship', label: 'Une amitié', icon: '👥' },
];

const GENDERS = [
  { id: 'male', label: 'Homme' },
  { id: 'female', label: 'Femme' },
  { id: 'other', label: 'Autre' },
];

export default function ProfileScreen({ onBack }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    apiClient.getMe()
      .then((data) => {
        setForm({
          first_name: data.user.first_name || '',
          age: data.user.age ? String(data.user.age) : '',
          city: data.user.city || '',
          intent: data.user.intent || 'romantic',
          gender: data.user.gender || null,
          looking_for: data.user.looking_for || null,
        });
      })
      .catch((err) => setError(err.message));
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await apiClient.updateMe({
        first_name: form.first_name,
        age: Number(form.age),
        city: form.city,
        intent: form.intent,
        gender: form.gender,
        looking_for: form.looking_for,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!form) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#7c3aed" size="large" />
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Mon profil</Text>
      <Text style={styles.subtitle}>Modifie tes informations à tout moment</Text>

      {error && <Text style={styles.error}>{error}</Text>}
      {success && <Text style={styles.success}>Profil mis à jour ✓</Text>}

      <TextInput
        style={styles.input}
        value={form.first_name}
        onChangeText={(v) => setForm({ ...form, first_name: v })}
        placeholder="Prénom"
        placeholderTextColor="#6b7280"
      />
      <TextInput
        style={styles.input}
        value={form.age}
        onChangeText={(v) => setForm({ ...form, age: v })}
        placeholder="Âge"
        placeholderTextColor="#6b7280"
        keyboardType="number-pad"
      />
      <TextInput
        style={styles.input}
        value={form.city}
        onChangeText={(v) => setForm({ ...form, city: v })}
        placeholder="Ville"
        placeholderTextColor="#6b7280"
      />

      <Text style={styles.sectionLabel}>Je cherche</Text>
      <View style={styles.cards}>
        {INTENTS.map((intent) => (
          <TouchableOpacity
            key={intent.id}
            style={[styles.intentCard, form.intent === intent.id && styles.cardSelected]}
            onPress={() => setForm({ ...form, intent: intent.id })}
          >
            <Text style={styles.intentIcon}>{intent.icon}</Text>
            <Text style={styles.intentLabel}>{intent.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Genre</Text>
      <View style={styles.pillRow}>
        {GENDERS.map((g) => (
          <TouchableOpacity
            key={g.id}
            style={[styles.pill, form.gender === g.id && styles.cardSelected]}
            onPress={() => setForm({ ...form, gender: form.gender === g.id ? null : g.id })}
          >
            <Text style={[styles.pillText, form.gender === g.id && styles.pillTextSelected]}>
              {g.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Je recherche</Text>
      <View style={styles.pillRow}>
        {GENDERS.map((g) => (
          <TouchableOpacity
            key={g.id}
            style={[styles.pill, form.looking_for === g.id && styles.cardSelected]}
            onPress={() => setForm({ ...form, looking_for: form.looking_for === g.id ? null : g.id })}
          >
            <Text style={[styles.pillText, form.looking_for === g.id && styles.pillTextSelected]}>
              {g.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitBtn, (loading || !form.first_name.trim() || !form.age) && styles.submitDisabled]}
          onPress={handleSave}
          disabled={loading || !form.first_name.trim() || !form.age}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitText}>Enregistrer</Text>
          }
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  content: { padding: 24, paddingTop: 60 },
  loading: { flex: 1, backgroundColor: '#09090b', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '600', color: '#fff', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginBottom: 20 },
  error: { color: '#f87171', textAlign: 'center', marginBottom: 12, fontSize: 13 },
  success: { color: '#4ade80', textAlign: 'center', marginBottom: 12, fontSize: 13 },
  input: {
    backgroundColor: '#18181b', borderWidth: 1, borderColor: '#3f3f46',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    color: '#fff', fontSize: 14, marginBottom: 12,
  },
  sectionLabel: { color: '#6b7280', fontSize: 12, marginBottom: 8, marginTop: 4 },
  cards: { gap: 10, marginBottom: 16 },
  intentCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 14, borderWidth: 1,
    borderColor: '#3f3f46', backgroundColor: '#18181b',
  },
  intentIcon: { fontSize: 18 },
  intentLabel: { color: '#fff', fontSize: 14 },
  cardSelected: { borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.1)' },
  pillRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  pill: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1, borderColor: '#3f3f46', alignItems: 'center',
  },
  pillText: { color: '#9ca3af', fontSize: 13 },
  pillTextSelected: { color: '#fff' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  backBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 16,
    borderWidth: 1, borderColor: '#3f3f46', alignItems: 'center',
  },
  backText: { color: '#d1d5db', fontSize: 14 },
  submitBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 16,
    backgroundColor: '#7c3aed', alignItems: 'center',
  },
  submitDisabled: { opacity: 0.4 },
  submitText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
