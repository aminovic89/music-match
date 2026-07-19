'use client';

import { useState, useCallback, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://music-match-api-dev.azurewebsites.net';
const MAX_TRACKS = 20;

export default function ImportStep({ token, onSubmit, onBack, loading }) {
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
      const res = await fetch(`${API}/api/music/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
    <div className="flex flex-col">
      <h1 className="text-2xl font-semibold text-white text-center mb-2">
        Ta musique
      </h1>
      <p className="text-gray-400 text-center text-sm mb-6">
        Sélectionne jusqu'à {MAX_TRACKS} titres qui te définissent
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
            {spotifyConnected ? '✓ Connecté' : 'Recommandé pour la recherche'}
          </div>
        </div>
        {spotifyConnected && <span className="text-green-400 text-sm">✓</span>}
      </a>

      {/* Barre de recherche */}
      <div className="relative mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un titre ou artiste..."
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 text-sm"
        />
        {searching && (
          <div className="absolute right-3 top-3 text-gray-400 text-xs">...</div>
        )}
      </div>

      {/* Compteur */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-gray-400 text-xs">
          {results.length > 0 ? `${results.length} résultats` : ''}
        </span>
        <span className={`text-xs font-medium ${selected.length >= MAX_TRACKS ? 'text-violet-400' : 'text-gray-400'}`}>
          {selected.length}/{MAX_TRACKS} sélectionnés
        </span>
      </div>

      {/* Résultats */}
      <div className="flex flex-col gap-2 mb-6 max-h-64 overflow-y-auto">
        {results.map((track) => (
          <button
            key={track.track_id}
            onClick={() => toggleTrack(track)}
            className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
              isSelected(track)
                ? 'border-violet-500 bg-violet-500/10'
                : 'border-gray-800 hover:border-gray-600'
            }`}
          >
            <span className="text-lg">🎵</span>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{track.track_name}</div>
              <div className="text-gray-400 text-xs truncate">{track.artist_name}</div>
            </div>
            {isSelected(track) && <span className="text-violet-400 text-sm flex-shrink-0">✓</span>}
          </button>
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
