import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { apiClient } from '@music-match/shared';

export default function LoginScreen({ onSuccess, onNavigateRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.login(email, password);
      onSuccess(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Content de te revoir 👋</Text>
      <Text style={styles.subtitle}>Connecte-toi pour retrouver tes matchs</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor="#6b7280"
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Mot de passe"
        placeholderTextColor="#6b7280"
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.submitBtn, loading && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitText}>Se connecter</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity onPress={onNavigateRegister} style={styles.link}>
        <Text style={styles.linkText}>
          Pas encore de compte ? <Text style={styles.linkAccent}>Crée-en un</Text>
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b', justifyContent: 'center', paddingHorizontal: 24 },
  title: { fontSize: 24, fontWeight: '600', color: '#fff', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginBottom: 32 },
  error: { color: '#f87171', textAlign: 'center', marginBottom: 12, fontSize: 13 },
  input: {
    backgroundColor: '#18181b', borderWidth: 1, borderColor: '#3f3f46',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: '#fff', fontSize: 14, marginBottom: 12,
  },
  submitBtn: {
    marginTop: 8, paddingVertical: 14, borderRadius: 16,
    backgroundColor: '#7c3aed', alignItems: 'center',
  },
  submitDisabled: { opacity: 0.4 },
  submitText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  link: { marginTop: 24, alignItems: 'center' },
  linkText: { color: '#9ca3af', fontSize: 13 },
  linkAccent: { color: '#a78bfa' },
});
