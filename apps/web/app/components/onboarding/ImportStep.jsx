'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://music-match-api-prod.azurewebsites.net';
const MAX_TRACKS = 20;

function generateManualId() {
  return `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function ImportStep({ token, onSubmit, onBack, loading }) {
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
    <div className="flex flex-col">
      <h1 className="text-2xl font-semibold text-white text-center mb-2">
        Ta musique
      </h1>
      <p className="text-gray-400 text-center text-sm mb-6">
        Sélectionne jusqu&apos;à {MAX_TRACKS} titres qui te définissent
      </p>

      {/* Connexion Spotify */}
      <a
        href={`${API}/api/auth/spotify`}
        className={`flex items-center gap-3 p-4 rounded-xl border mb-4 transition-all ${
          spotifyConnected
            ? 'border-green-600 bg-green-900/20'
            : 'border-gray-700 bg-gray-900 hover:border-violet-500'
        }`}
      >
        <span className="text-2xl">🎵</span>
        <div className="flex-1">
          <div className="text-white font-medium text-sm">Connecter Spotify</div>
          <div className="text-gray-400 text-xs">
            {importingSpotify
              ? 'Importation de tes titres...'
              : spotifyConnected
                ? '✓ Connecté'
                : 'Importe automatiquement tes titres les plus écoutés'}
          </div>
        </div>
        {spotifyConnected && <span className="text-green-400 text-sm">✓</span>}
      </a>

      {/* Saisie manuelle */}
      <div className="mb-4">
        <p className="text-gray-500 text-xs mb-2">Ou ajoute un titre manuellement</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            placeholder="Titre"
            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 text-sm"
          />
          <input
            type="text"
            value={manualArtist}
            onChange={(e) => setManualArtist(e.target.value)}
            placeholder="Artiste"
            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 text-sm"
          />
          <button
            onClick={addManualTrack}
            disabled={!manualName.trim() || selected.length >= MAX_TRACKS}
            className="px-4 bg-gray-800 border border-gray-700 disabled:opacity-40 text-white rounded-xl text-sm hover:border-violet-500 transition-colors"
          >
            + Ajouter
          </button>
        </div>

        {/* Suggestions Deezer en direct */}
        {manualSearching && (
          <p className="text-gray-500 text-xs mt-2">Recherche...</p>
        )}
        {!manualSearching && manualSuggestions.length > 0 && (
          <div className="flex flex-col gap-2 mt-2 max-h-40 overflow-y-auto">
            {manualSuggestions.map((track) => (
              <button
                key={track.track_id}
                onClick={() => addSuggestion(track)}
                className="flex items-center gap-3 p-2 rounded-lg border border-gray-800 hover:border-violet-500 text-left transition-all"
              >
                <span className="text-base">🎵</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm truncate">{track.track_name}</div>
                  <div className="text-gray-400 text-xs truncate">{track.artist_name}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Titres sélectionnés */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-gray-400 text-xs">Titres sélectionnés</span>
        <span className={`text-xs font-medium ${selected.length >= MAX_TRACKS ? 'text-violet-400' : 'text-gray-400'}`}>
          {selected.length}/{MAX_TRACKS}
        </span>
      </div>
      <div className="flex flex-col gap-2 mb-6 max-h-56 overflow-y-auto">
        {selected.length === 0 && (
          <p className="text-gray-600 text-xs italic">Aucun titre pour l&apos;instant</p>
        )}
        {selected.map((track) => (
          <div
            key={track.track_id}
            className="flex items-center gap-3 p-3 rounded-lg border border-violet-500 bg-violet-500/10"
          >
            <span className="text-lg">{track.source === 'manual' ? '✏️' : '🎵'}</span>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{track.track_name}</div>
              <div className="text-gray-400 text-xs truncate">{track.artist_name}</div>
            </div>
            <button
              onClick={() => removeTrack(track.track_id)}
              className="text-gray-500 hover:text-red-400 text-sm flex-shrink-0 px-1"
              aria-label="Retirer"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 border border-gray-700 text-gray-300 rounded-xl text-sm hover:border-gray-500 transition-colors"
        >
          ← Retour
        </button>
        <button
          onClick={() => onSubmit(selected)}
          disabled={selected.length === 0 || loading}
          className="flex-2 flex-grow-[2] py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-medium rounded-xl text-sm transition-colors"
        >
          {loading ? 'Analyse...' : `Analyser (${selected.length})`}
        </button>
      </div>
    </div>
  );
}
