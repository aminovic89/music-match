import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, Linking,
} from 'react-native';

const API = process.env.EXPO_PUBLIC_API_URL || 'https://music-match-api-dev.azurewebsites.net';
const MAX_TRACKS = 20;

function generateManualId() {
  return `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function ImportScreen({ token, onSubmit, onBack, loading, error }) {
  const [selected, setSelected] = useState([]);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [importingSpotify, setImportingSpotify] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualArtist, setManualArtist] = useState('');
  const [manualSuggestions, setManualSuggestions] = useState([]);
  const [manualSearching, setManualSearching] = useState(false);
  const hasImportedSpotify = useRef(false);

  const importSpotifyTopTracks = useCallback(async () => {
    setImportingSpotify(true);
    try {
      const res = await fetch(`${API}/api/music/spotify/top-tracks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setSelected((prev) => {
          const existingIds = new Set(prev.map((t) => t.track_id));
          const toAdd = (data.tracks || []).filter((t) => !existingIds.has(t.track_id));
          return [...prev, ...toAdd].slice(0, MAX_TRACKS);
        });
      }
    } catch (_e) {}
    finally { setImportingSpotify(false); }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/music/spotify/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setSpotifyConnected(data.connected);
        if (data.connected && !hasImportedSpotify.current) {
          hasImportedSpotify.current = true;
          importSpotifyTopTracks();
        }
      })
      .catch(() => {});
  }, [token, importSpotifyTopTracks]);

  // Suggestions Deezer (recherche publique, pas besoin de compte connecté)
  // pour aider à la saisie manuelle.
  const searchManualSuggestions = useCallback(async (q) => {
    if (q.trim().length < 2) { setManualSuggestions([]); return; }
    setManualSearching(true);
    try {
      const res = await fetch(
        `${API}/api/music/search?q=${encodeURIComponent(q.trim())}&source=deezer`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok) setManualSuggestions(data.tracks || []);
    } catch (_e) {}
    finally { setManualSearching(false); }
  }, [token]);

  useEffect(() => {
    const t = setTimeout(() => searchManualSuggestions(manualName), 400);
    return () => clearTimeout(t);
  }, [manualName, searchManualSuggestions]);

  const addSuggestion = (track) => {
    if (selected.length >= MAX_TRACKS) return;
    setSelected((prev) => [...prev, { ...track, source: 'deezer' }]);
    setManualName('');
    setManualArtist('');
    setManualSuggestions([]);
  };

  const addManualTrack = () => {
    if (!manualName.trim() || selected.length >= MAX_TRACKS) return;
    setSelected((prev) => [
      ...prev,
      {
        track_id: generateManualId(),
        track_name: manualName.trim(),
        artist_name: manualArtist.trim(),
        source: 'manual',
      },
    ]);
    setManualName('');
    setManualArtist('');
    setManualSuggestions([]);
  };

  const removeTrack = (trackId) => {
    setSelected((prev) => prev.filter((t) => t.track_id !== trackId));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ta musique</Text>
      <Text style={styles.subtitle}>
        Sélectionne jusqu&apos;à {MAX_TRACKS} titres qui te définissent
      </Text>

      {error && <Text style={styles.error}>{error}</Text>}

      {/* Connexion Spotify */}
      <TouchableOpacity
        style={[styles.spotifyBtn, spotifyConnected && styles.spotifyConnected]}
        onPress={() => Linking.openURL(`${API}/api/auth/spotify?platform=mobile`)}
      >
        <Text style={styles.spotifyIcon}>🎵</Text>
        <View style={styles.spotifyInfo}>
          <Text style={styles.spotifyTitle}>Connecter Spotify</Text>
          <Text style={styles.spotifyDesc}>
            {importingSpotify
              ? 'Importation de tes titres...'
              : spotifyConnected
                ? '✓ Connecté'
                : 'Importe automatiquement tes titres les plus écoutés'}
          </Text>
        </View>
        {spotifyConnected && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>

      {/* Saisie manuelle */}
      <Text style={styles.manualLabel}>Ou ajoute un titre manuellement</Text>
      <View style={styles.manualRow}>
        <TextInput
          style={[styles.searchInput, styles.manualInput]}
          value={manualName}
          onChangeText={setManualName}
          placeholder="Titre"
          placeholderTextColor="#6b7280"
        />
        <TextInput
          style={[styles.searchInput, styles.manualInput]}
          value={manualArtist}
          onChangeText={setManualArtist}
          placeholder="Artiste"
          placeholderTextColor="#6b7280"
        />
        <TouchableOpacity
          style={[styles.addBtn, (!manualName.trim() || selected.length >= MAX_TRACKS) && styles.submitDisabled]}
          onPress={addManualTrack}
          disabled={!manualName.trim() || selected.length >= MAX_TRACKS}
        >
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Suggestions Deezer en direct */}
      {manualSearching && <Text style={styles.manualLabel}>Recherche...</Text>}
      {!manualSearching && manualSuggestions.length > 0 && (
        <View style={styles.suggestionsBox}>
          {manualSuggestions.map((track) => (
            <TouchableOpacity
              key={track.track_id}
              style={styles.suggestionItem}
              onPress={() => addSuggestion(track)}
            >
              <Text style={styles.trackIcon}>🎵</Text>
              <View style={styles.trackInfo}>
                <Text style={styles.trackName} numberOfLines={1}>{track.track_name}</Text>
                <Text style={styles.trackArtist} numberOfLines={1}>{track.artist_name}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Titres sélectionnés */}
      <View style={styles.selectedHeader}>
        <Text style={styles.selectedLabel}>Titres sélectionnés</Text>
        <Text style={styles.counter}>{selected.length}/{MAX_TRACKS}</Text>
      </View>
      <FlatList
        data={selected}
        keyExtractor={(item) => item.track_id}
        style={styles.selectedList}
        ListEmptyComponent={<Text style={styles.emptyText}>Aucun titre pour l&apos;instant</Text>}
        renderItem={({ item }) => (
          <View style={[styles.trackItem, styles.trackSelected]}>
            <Text style={styles.trackIcon}>{item.source === 'manual' ? '✏️' : '🎵'}</Text>
            <View style={styles.trackInfo}>
              <Text style={styles.trackName} numberOfLines={1}>{item.track_name}</Text>
              <Text style={styles.trackArtist} numberOfLines={1}>{item.artist_name}</Text>
            </View>
            <TouchableOpacity onPress={() => removeTrack(item.track_id)}>
              <Text style={styles.removeText}>✕</Text>
            </TouchableOpacity>
          </View>
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
  searchInput: {
    flex: 1, backgroundColor: '#18181b', borderWidth: 1,
    borderColor: '#3f3f46', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 11, color: '#fff', fontSize: 14,
  },
  manualLabel: { color: '#6b7280', fontSize: 11, marginBottom: 6 },
  manualRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  manualInput: { flex: 1, marginBottom: 0 },
  addBtn: {
    paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#27272a',
    borderWidth: 1, borderColor: '#3f3f46', alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  suggestionsBox: { marginBottom: 12, maxHeight: 140 },
  suggestionItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, borderRadius: 10, borderWidth: 1,
    borderColor: '#27272a', marginBottom: 6,
  },
  selectedHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  selectedLabel: { color: '#9ca3af', fontSize: 12 },
  counter: { color: '#9ca3af', fontSize: 12 },
  emptyText: { color: '#4b5563', fontSize: 12, fontStyle: 'italic' },
  selectedList: { flex: 1, marginBottom: 16 },
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
  removeText: { color: '#6b7280', fontSize: 14, paddingHorizontal: 4 },
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
