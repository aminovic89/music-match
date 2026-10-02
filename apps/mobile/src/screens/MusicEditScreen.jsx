import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { apiClient } from '@music-match/shared';
import ImportScreen from './onboarding/ImportScreen';
import DnaScreen from './onboarding/DnaScreen';
import Screen, { ScreenHeader } from '../components/Screen';
import { LoadingState } from '../components/States';
import { colors } from '../theme';

const STEPS = { IMPORT: 0, DNA: 1 };

function toSelection(tracks) {
  return (tracks || []).map((t) => ({
    track_id: t.track_id,
    track_name: t.track_name,
    artist_name: t.artist_name,
    source: t.source,
  }));
}

export default function MusicEditScreen({ token, onBack }) {
  const [step, setStep] = useState(STEPS.IMPORT);
  const [selectedTracks, setSelectedTracks] = useState([]);
  // Titres tels qu'enregistrés : restaurés si l'utilisateur annule ses
  // modifications et revient à la synthèse sans relancer l'analyse.
  const [savedTracks, setSavedTracks] = useState([]);
  const [musicProfile, setMusicProfile] = useState(null);
  const [focusAdd, setFocusAdd] = useState(false);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    apiClient.getMusicProfile()
      .then((data) => {
        const tracks = toSelection(data.tracks);
        setSelectedTracks(tracks);
        setSavedTracks(tracks);
        // Profil déjà analysé : on affiche sa synthèse plutôt que la liste
        // des titres, l'édition reste accessible depuis la synthèse.
        if (data.profile) {
          setMusicProfile(data.profile);
          setStep(STEPS.DNA);
        }
      })
      .catch(() => {}) // pas encore de profil musical — on démarre à vide
      .finally(() => setReady(true));
  }, []);

  const handleTracksSubmit = async (tracks) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.saveTracks(tracks);
      setMusicProfile({ ...data.profile, tracks_count: tracks.length });
      setSavedTracks(tracks);
      setNotice('Profil musical mis à jour');
      setStep(STEPS.DNA);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openEditor = (withFocus) => {
    setFocusAdd(withFocus);
    setNotice(null);
    setError(null);
    setStep(STEPS.IMPORT);
  };

  const cancelEdit = () => {
    setSelectedTracks(savedTracks);
    setError(null);
    setStep(STEPS.DNA);
  };

  // En-tête commun aux deux étapes : l'utilisateur sait qu'il modifie sa
  // musique (et non qu'il refait l'onboarding) et peut revenir à l'accueil.
  const header = <ScreenHeader title="Modifier ma musique" onBack={onBack} />;

  if (!ready) {
    return (
      <Screen header={header} center scroll={false}>
        <LoadingState label="Chargement de ta musique…" />
      </Screen>
    );
  }

  return (
    <View style={styles.container}>
      {step === STEPS.IMPORT && (
        <ImportScreen
          header={header}
          token={token}
          selected={selectedTracks}
          onSelectedChange={setSelectedTracks}
          autoImportSpotify={false}
          onSubmit={handleTracksSubmit}
          // Avec un profil existant, "Annuler" ramène à la synthèse.
          onBack={musicProfile ? cancelEdit : onBack}
          backLabel={musicProfile ? 'Annuler' : 'Retour'}
          focusManualInput={focusAdd}
          loading={loading}
          error={error}
        />
      )}

      {step === STEPS.DNA && (
        <DnaScreen
          header={header}
          profile={musicProfile}
          notice={notice}
          onAddTracks={() => openEditor(true)}
          onEditTracks={() => openEditor(false)}
          onBack={() => openEditor(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});
