import React, { useState } from 'react';
import { View, Text, Image, ActivityIndicator, Alert, ActionSheetIOS, Linking, Platform, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { apiClient } from '@music-match/shared';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import Section from '../components/Section';
import FormAlert from '../components/Alert';
import { colors, spacing } from '../theme';

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const SIZE = 120;

const PICKER_OPTIONS = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
};

// Partie fichier d'un FormData en React Native : { uri, name, type }.
// Le fetch d'Expo (global depuis le SDK 57) ignore `uri` et exige `bytes()` :
// on lit donc le fichier local nous-mêmes, sinon l'envoi échoue avec
// "Unsupported FormDataPart implementation".
function toFile(asset) {
  const type = asset.mimeType && asset.mimeType.startsWith('image/') ? asset.mimeType : 'image/jpeg';
  const ext = type.split('/')[1].replace('jpeg', 'jpg');
  return {
    uri: asset.uri,
    name: asset.fileName || `photo.${ext}`,
    type,
    bytes: () => new File(asset.uri).bytes(),
  };
}

// Section "Photo" : choix galerie / appareil photo, envoi immédiat
// (indépendant du bouton Enregistrer du profil).
export default function ProfilePhoto({ avatarUrl, firstName, onUploaded }) {
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const denied = (what) => {
    Alert.alert(
      'Autorisation nécessaire',
      `Music Match n'a pas accès à ${what}. Autorise l'accès dans les réglages de ton téléphone pour choisir ta photo.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Ouvrir les réglages', onPress: () => Linking.openSettings() },
      ]
    );
    setError(`Accès à ${what} refusé. Autorise-le dans les réglages pour changer ta photo.`);
  };

  const upload = async (asset) => {
    if (typeof asset.fileSize === 'number' && asset.fileSize > MAX_PHOTO_BYTES) {
      setError('Cette photo est trop lourde (max 5 Mo). Choisis une image plus légère.');
      return;
    }
    setPreview(asset.uri);
    setUploading(true);
    try {
      const data = await apiClient.uploadPhoto(toFile(asset));
      onUploaded?.(data.user);
      setSuccess('Photo mise à jour');
    } catch (err) {
      setError(err.message || "Impossible d'envoyer la photo");
    } finally {
      setPreview(null);
      setUploading(false);
    }
  };

  const pick = async (source) => {
    setError(null);
    setSuccess(null);
    try {
      const camera = source === 'camera';
      const perm = camera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        denied(camera ? "l'appareil photo" : 'tes photos');
        return;
      }
      const result = camera
        ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
        : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
      if (result.canceled || !result.assets?.length) return;
      await upload(result.assets[0]);
    } catch (err) {
      setError(err.message || "Impossible d'ouvrir la photo");
    }
  };

  const openChooser = () => {
    if (uploading) return;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Choisir dans la galerie', 'Prendre une photo', 'Annuler'], cancelButtonIndex: 2 },
        (i) => {
          if (i === 0) pick('library');
          if (i === 1) pick('camera');
        }
      );
    } else {
      Alert.alert('Photo de profil', undefined, [
        { text: 'Choisir dans la galerie', onPress: () => pick('library') },
        { text: 'Prendre une photo', onPress: () => pick('camera') },
        { text: 'Annuler', style: 'cancel' },
      ]);
    }
  };

  return (
    <Section title="Photo">
      <View style={styles.row}>
        <View
          style={styles.frame}
          accessible
          accessibilityRole="image"
          accessibilityLabel={avatarUrl || preview ? 'Ta photo de profil' : 'Pas encore de photo de profil'}
        >
          {preview ? (
            <Image source={{ uri: preview }} style={styles.preview} accessibilityIgnoresInvertColors />
          ) : (
            <Avatar avatarUrl={avatarUrl} firstName={firstName} size={SIZE} />
          )}
          {uploading ? (
            <View style={styles.overlay}>
              <ActivityIndicator color={colors.text} size="large" />
            </View>
          ) : null}
        </View>
        <Button
          title={uploading ? 'Envoi de la photo…' : avatarUrl ? 'Changer ma photo' : 'Ajouter une photo'}
          variant="secondary"
          onPress={openChooser}
          loading={uploading}
          accessibilityHint="Choisir dans la galerie ou prendre une photo"
          style={styles.button}
        />
      </View>
      <FormAlert message={error} />
      <FormAlert tone="success" message={success} />
      {uploading ? (
        <Text style={styles.hidden} accessibilityLiveRegion="polite">
          Envoi de la photo en cours
        </Text>
      ) : null}
    </Section>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', gap: spacing.md },
  frame: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, overflow: 'hidden' },
  preview: { width: SIZE, height: SIZE, borderRadius: SIZE / 2 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: { alignSelf: 'stretch' },
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
