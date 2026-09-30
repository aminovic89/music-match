'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Button, { focusRing, Spinner } from '../Button';
import TextField from '../TextField';
import Section from '../Section';
import StickyBar from '../StickyBar';
import Icon from '../Icon';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const MIN_TRACKS = 10;

function generateManualId() {
  return `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalize(s) {
  return (s || '').trim().toLowerCase();
}

function isDuplicate(list, track) {
  return list.some((t) =>
    t.track_id === track.track_id ||
    (normalize(t.track_name) === normalize(track.track_name) &&
      normalize(t.artist_name) === normalize(track.artist_name))
  );
}

export default function ImportStep({ titleAs: Title = 'h1', token, selected, onSelectedChange, onSubmit, onBack, loading, autoImportSpotify = true }) {
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [importingSpotify, setImportingSpotify] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualArtist, setManualArtist] = useState('');
  const [manualSuggestions, setManualSuggestions] = useState([]);
  const [manualSearching, setManualSearching] = useState(false);
  const [belowMinAttempted, setBelowMinAttempted] = useState(false);
  const hasImportedSpotify = useRef(false);
  // Sélection vide à l'arrivée sur l'écran ? (valeur initiale uniquement)
  const startedEmpty = useRef(selected.length === 0);

  const importSpotifyTopTracks = useCallback(async () => {
    setImportingSpotify(true);
    try {
      const res = await fetch(`${API}/api/music/spotify/top-tracks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        onSelectedChange((prev) => {
          const merged = [...prev];
          for (const track of data.tracks || []) {
            if (!isDuplicate(merged, track)) merged.push(track);
          }
          return merged;
        });
      }
    } catch {}
    finally { setImportingSpotify(false); }
  }, [token, onSelectedChange]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/music/spotify/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setSpotifyConnected(data.connected);
        // Import auto uniquement à la demande ET sélection vide (onboarding) :
        // en édition il réinjecterait les titres que l'utilisateur a retirés.
        if (data.connected && autoImportSpotify && startedEmpty.current && !hasImportedSpotify.current) {
          hasImportedSpotify.current = true;
          importSpotifyTopTracks();
        }
      })
      .catch(() => {});
  }, [token, autoImportSpotify, importSpotifyTopTracks]);

  // Suggestions Deezer (recherche publique, pas besoin de compte connecté)
  // pour aider à la saisie manuelle. Recherche combinée titre + artiste,
  // pour que taper uniquement un artiste renvoie aussi des résultats.
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
    } catch {}
    finally { setManualSearching(false); }
  }, [token]);

  useEffect(() => {
    const q = [manualName, manualArtist].filter((s) => s.trim()).join(' ').trim();
    const t = setTimeout(() => searchManualSuggestions(q), 400);
    return () => clearTimeout(t);
  }, [manualName, manualArtist, searchManualSuggestions]);

  const addSuggestion = (track) => {
    onSelectedChange((prev) => (isDuplicate(prev, track) ? prev : [...prev, { ...track, source: 'deezer' }]));
    setManualName('');
    setManualArtist('');
    setManualSuggestions([]);
  };

  const addManualTrack = () => {
    if (!manualName.trim()) return;
    const track = {
      track_id: generateManualId(),
      track_name: manualName.trim(),
      artist_name: manualArtist.trim(),
      source: 'manual',
    };
    onSelectedChange((prev) => (isDuplicate(prev, track) ? prev : [...prev, track]));
    setManualName('');
    setManualArtist('');
    setManualSuggestions([]);
  };

  const removeTrack = (trackId) => {
    onSelectedChange((prev) => prev.filter((t) => t.track_id !== trackId));
  };

  const handleSubmitClick = () => {
    if (selected.length < MIN_TRACKS) {
      setBelowMinAttempted(true);
      return;
    }
    onSubmit(selected);
  };

  const missing = MIN_TRACKS - selected.length;
  const enough = selected.length >= MIN_TRACKS;

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-8 flex flex-col gap-2">
        <Title className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">Ta musique</Title>
        <p className="text-base text-muted">Choisis au moins {MIN_TRACKS} titres que tu aimes</p>
      </div>

      <div className="flex flex-col gap-10">
        {/* Connexion Spotify */}
        <a
          href={`${API}/api/auth/spotify`}
          aria-busy={importingSpotify || undefined}
          className={`group flex min-h-14 items-center gap-3 rounded-2xl border p-4 transition-colors ${
            spotifyConnected
              ? 'border-success-line bg-success-bg'
              : 'border-line-strong bg-surface hover:border-accent-text'
          } ${focusRing}`}
        >
          <span
            aria-hidden="true"
            className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
              spotifyConnected ? 'bg-success/15 text-success' : 'bg-accent/15 text-accent-text'
            }`}
          >
            {importingSpotify ? <Spinner /> : <Icon name={spotifyConnected ? 'check' : 'music'} />}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-base font-semibold text-fg">Connecter Spotify</span>
            <span className={`text-sm ${spotifyConnected ? 'font-medium text-success' : 'text-muted'}`}>
              {importingSpotify
                ? 'Importation de tes titres...'
                : spotifyConnected
                  ? '✓ Connecté'
                  : 'Importe automatiquement tes titres les plus écoutés'}
            </span>
          </span>
          <Icon name="chevronRight" className="size-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
        </a>

        {/* Saisie manuelle + suggestions Deezer en direct */}
        <Section title="Ou ajoute un titre manuellement">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Titre"
              type="text"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="Ex. Tout oublier"
              autoComplete="off"
            />
            <TextField
              label="Artiste"
              type="text"
              value={manualArtist}
              onChange={(e) => setManualArtist(e.target.value)}
              placeholder="Ex. Angèle"
              autoComplete="off"
            />
          </div>

          <div aria-live="polite">
            {manualSearching && (
              <p className="flex items-center gap-2 text-sm text-muted">
                <Spinner /> Recherche...
              </p>
            )}
          </div>
          {!manualSearching && manualSuggestions.length > 0 && (
            <ul aria-label="Suggestions" className="flex flex-col gap-2">
              {manualSuggestions.map((track) => (
                <li key={track.track_id}>
                  <button
                    type="button"
                    onClick={() => addSuggestion(track)}
                    aria-label={`Ajouter ${track.track_name}, ${track.artist_name}`}
                    className={`flex min-h-14 w-full items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2 text-left transition-colors hover:border-accent-text hover:bg-surface-2 ${focusRing}`}
                  >
                    <TrackGlyph icon="music" />
                    <TrackInfo name={track.track_name} artist={track.artist_name} />
                    <Icon name="plus" className="size-5 shrink-0 text-accent-text" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Button variant="secondary" onClick={addManualTrack} disabled={!manualName.trim()}>
            <Icon name="plus" className="size-5" />
            Ajouter ce titre
          </Button>
        </Section>

        {/* Titres sélectionnés */}
        <Section
          title="Titres sélectionnés"
          right={
            <span
              className={`rounded-full border px-3 py-0.5 text-xs font-semibold tabular-nums ${
                enough ? 'border-success-line bg-success-bg text-success' : 'border-line text-muted'
              }`}
            >
              {enough ? '✓ ' : ''}{selected.length} / {MIN_TRACKS}
              <span className="sr-only"> titres sélectionnés, minimum {MIN_TRACKS}</span>
            </span>
          }
        >
          {selected.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line-strong p-4 text-center text-sm text-muted">
              Aucun titre pour l&apos;instant
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {selected.map((track) => (
                <li
                  key={track.track_id}
                  className="flex min-h-14 items-center gap-3 rounded-xl border border-accent/45 bg-surface py-1 pr-1 pl-3"
                >
                  <TrackGlyph icon={track.source === 'manual' ? 'pencil' : 'music'} />
                  <TrackInfo name={track.track_name} artist={track.artist_name} />
                  <button
                    type="button"
                    onClick={() => removeTrack(track.track_id)}
                    aria-label={`Retirer ${track.track_name}`}
                    className={`flex size-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-danger ${focusRing}`}
                  >
                    <Icon name="x" className="size-5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <div className="flex-1" />
      <StickyBar>
        <p
          aria-live="polite"
          className={`mb-2 text-center text-xs empty:hidden ${belowMinAttempted ? 'font-semibold text-danger' : 'text-muted'}`}
        >
          {selected.length < MIN_TRACKS
            ? (belowMinAttempted
              ? `Il te manque ${missing} titre${missing > 1 ? 's' : ''} pour enregistrer (minimum ${MIN_TRACKS})`
              : `Encore ${missing} titre${missing > 1 ? 's' : ''} pour continuer`)
            : ''}
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onBack} fullWidth={false} className="flex-1 px-3">
            Retour
          </Button>
          <Button onClick={handleSubmitClick} loading={loading} fullWidth={false} className="flex-[2] px-3">
            {loading ? 'Analyse...' : `Analyser (${selected.length})`}
          </Button>
        </div>
      </StickyBar>
    </div>
  );
}

function TrackGlyph({ icon }) {
  return (
    <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-accent-text">
      <Icon name={icon} className="size-4" />
    </span>
  );
}

function TrackInfo({ name, artist }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="truncate text-sm font-medium text-fg">{name}</span>
      {artist && <span className="truncate text-xs text-muted">{artist}</span>}
    </span>
  );
}
