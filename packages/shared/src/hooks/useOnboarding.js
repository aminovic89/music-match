// packages/shared/src/hooks/useOnboarding.js
// Hook partagé — logique d'onboarding identique sur web et mobile

const { useState, useCallback } = require('react');
const { apiClient } = require('../api/client');

const STEPS = {
  INTENT: 0,
  IMPORT: 1,
  DNA: 2,
};

function useOnboarding({ onComplete }) {
  const [step, setStep] = useState(STEPS.INTENT);
  const [intent, setIntent] = useState('romantic');
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [musicProfile, setMusicProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Étape 1 — Sauvegarder l'intention
  const saveIntent = useCallback(async (selectedIntent) => {
    setIntent(selectedIntent);
    try {
      await apiClient.updateMe({ intent: selectedIntent });
      setStep(STEPS.IMPORT);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // Étape 2 — Recherche de titres
  const searchTracks = useCallback(async (query) => {
    if (query.length < 2) return;
    setSearchQuery(query);
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.searchTracks(query);
      setSearchResults(data.tracks || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Étape 2 — Ajouter/retirer un titre de la sélection
  const toggleTrack = useCallback((track) => {
    setSelectedTracks((prev) => {
      const exists = prev.find((t) => t.track_id === track.track_id);
      if (exists) return prev.filter((t) => t.track_id !== track.track_id);
      if (prev.length >= 20) return prev; // limite 20 titres
      return [...prev, track];
    });
  }, []);

  // Étape 2 — Soumettre les titres sélectionnés
  const submitTracks = useCallback(async () => {
    if (selectedTracks.length === 0) {
      setError('Sélectionne au moins un titre');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.saveTracks(selectedTracks);
      setMusicProfile(data.profile);
      setStep(STEPS.DNA);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedTracks]);

  // Étape 3 — Finaliser l'onboarding
  const finishOnboarding = useCallback(() => {
    if (onComplete) onComplete(musicProfile);
  }, [onComplete, musicProfile]);

  const goBack = useCallback(() => {
    setStep((prev) => Math.max(0, prev - 1));
    setError(null);
  }, []);

  return {
    // État
    step,
    intent,
    selectedTracks,
    searchResults,
    searchQuery,
    musicProfile,
    loading,
    error,
    totalSteps: Object.keys(STEPS).length,
    STEPS,

    // Actions
    saveIntent,
    searchTracks,
    toggleTrack,
    submitTracks,
    finishOnboarding,
    goBack,
    setError,
  };
}

module.exports = { useOnboarding, STEPS };
