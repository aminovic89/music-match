import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, Linking,
} from 'react-native';

const API = process.env.EXPO_PUBLIC_API_URL || 'https://music-match-api-dev.azurewebsites.net';
const MAX_TRACKS = 20;

export default function ImportScreen({ token, onSubmit, onBack, loading, error }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [searching, setSearching] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/music/spotify/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setSpotifyConnected(data.connected))
      .catch(() => {});
  }, [token]);

  const search = useCallback(async (q) => {
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(
        `${API}/api/music/search?q=${encodeURIComponent(q)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok) setResults(data.tracks || []);
    } catch (_e) {}
    finally { setSearching(false); }
  }, [token]);

  useEffect(() => {
    const t = setTimeout(() => search(query), 400);
    return () => clearTimeout(t);
  }, [query, search]);

  const toggleTrack = (track) => {
    setSelected((prev) => {
      const exists = prev.find((t) => t.track_id === track.track_id);
      if (exists) return prev.filter((t) => t.track_id !== track.track_id);
      if (prev.length >= MAX_TRACKS) return prev;
      return [...prev, { ...track, source: 'spotify' }];
    });
  };

  const isSelected = (track) => selected.some((t) => t.track_id === track.track_id);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ta musique</Text>
      <Text style={styles.subtitle}>
        Sélectionne jusqu'à {MAX_TRACKS} titres qui te définissent
      </Text>

      {error && <Text style={styles.error}>{error}</Text>}

      {/* Connexion Spotify */}
      <TouchableOpacity
        style={[styles.spotifyBtn, spotifyConnected && styles.spotifyConnected]}
        onPress={() => Linking.openURL(`${API}/api/auth/spotify`)}
      >
        <Text style={styles.spotifyIcon}>🎵</Text>
        <View style={styles.spotifyInfo}>
          <Text style={styles.spotifyTitle}>Connecter Spotify</Text>
          <Text style={styles.spotifyDesc}>
            {spotifyConnected ? '✓ Connecté' : 'Recommandé'}
          </Text>
        </View>
        {spotifyConnected && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>

      {/* Recherche */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher un titre..."
          placeholderTextColor="#6b7280"
          returnKeyType="search"
        />
        {searching && <ActivityIndicator style={styles.searchSpinner} color="#7c3aed" size="small" />}
      </View>

      {/* Compteur */}
      <Text style={styles.counter}>{selected.length}/{MAX_TRACKS} sélectionnés</Text>

      {/* Résultats */}
      <FlatList
        data={results}
        keyExtractor={(item) => item.track_id}
        style={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.trackItem, isSelected(item) && styles.trackSelected]}
            onPress={() => toggleTrack(item)}
          >
            <Text style={styles.trackIcon}>🎵</Text>
            <View style={styles.trackInfo}>
              <Text style={styles.trackName} numberOfLines={1}>{item.track_name}</Text>
              <Text style={styles.trackArtist} numberOfLines={1}>{item.artist_name}</Text>
            </View>
            {isSelected(item) && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
        )}
      />

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitBtn, (selected.length === 0 || loading) && styles.submitDisabled]}
          onPress={() => onSubmit(selected)}
          disabled={selected.length === 0 || loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitText}>Analyser ({selected.length})</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 24, fontWeight: '600', color: '#fff', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginBottom: 20 },
  error: { color: '#f87171', textAlign: 'center', marginBottom: 12, fontSize: 13 },
  spotifyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 16, borderWidth: 1,
    borderColor: '#3f3f46', backgroundColor: '#18181b', marginBottom: 16,
  },
  spotifyConnected: { borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,0.1)' },
  spotifyIcon: { fontSize: 22 },
  spotifyInfo: { flex: 1 },
  spotifyTitle: { color: '#fff', fontSize: 14, fontWeight: '500' },
  spotifyDesc: { color: '#9ca3af', fontSize: 12 },
  checkmark: { color: '#4ade80', fontWeight: '600' },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  searchInput: {
    flex: 1, backgroundColor: '#18181b', borderWidth: 1,
    borderColor: '#3f3f46', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 11, color: '#fff', fontSize: 14,
  },
  searchSpinner: { marginLeft: 8 },
  counter: { color: '#9ca3af', fontSize: 12, textAlign: 'right', marginBottom: 8 },
  list: { flex: 1, marginBottom: 16 },
  trackItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 10, borderWidth: 1,
    borderColor: '#27272a', marginBottom: 6,
  },
  trackSelected: { borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.1)' },
  trackIcon: { fontSize: 16 },
  trackInfo: { flex: 1 },
  trackName: { color: '#fff', fontSize: 13, fontWeight: '500' },
  trackArtist: { color: '#9ca3af', fontSize: 12 },
  actions: { flexDirection: 'row', gap: 12 },
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
