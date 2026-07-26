import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { apiClient } from '@music-match/shared';

export default function HomeScreen({ onLogout }) {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiClient.getMe()
      .then((data) => setUser(data.user))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <View style={styles.container}>
      {error && <Text style={styles.error}>{error}</Text>}

      <Text style={styles.emoji}>🎉</Text>
      <Text style={styles.title}>
        {user ? `Salut ${user.first_name} !` : 'Bienvenue'}
      </Text>
      <Text style={styles.subtitle}>Ton profil est prêt.</Text>

      <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  error: { color: '#f87171', textAlign: 'center', marginBottom: 12, fontSize: 13 },
  emoji: { fontSize: 40, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '600', color: '#fff', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginBottom: 32 },
  logoutBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  logoutText: { color: '#6b7280', fontSize: 13 },
});
