import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Screen from '../components/Screen';
import Button from '../components/Button';
import TextField from '../components/TextField';
import Section from '../components/Section';
import FormAlert from '../components/Alert';
import ProfilePhoto from './ProfilePhoto';
import { RadioGroup, RadioCard, RadioChip } from '../components/Choice';
import { colors, spacing, fontSize, typography } from '../theme';
import { apiClient } from '@music-match/shared';

const INTENTS = [
  { id: 'romantic', label: 'Une rencontre romantique', icon: '❤️' },
  { id: 'friendship', label: 'Une amitié', icon: '👥' },
];

const GENDERS = [
  { id: 'male', label: 'Homme' },
  { id: 'female', label: 'Femme' },
  { id: 'other', label: 'Autre' },
];

export default function ProfileScreen({ onBack }) {
  const [form, setForm] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    apiClient.getMe()
      .then((data) => {
        setAvatarUrl(data.user.avatar_url || null);
        setForm({
          first_name: data.user.first_name || '',
          age: data.user.age ? String(data.user.age) : '',
          city: data.user.city || '',
          intent: data.user.intent || 'romantic',
          gender: data.user.gender || null,
          looking_for: data.user.looking_for || null,
        });
      })
      .catch((err) => setError(err.message));
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await apiClient.updateMe({
        first_name: form.first_name,
        age: Number(form.age),
        city: form.city,
        intent: form.intent,
        gender: form.gender,
        looking_for: form.looking_for,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!form) {
    return (
      <Screen title="Mon profil" onBack={onBack} center>
        {error ? (
          <FormAlert message={error} style={styles.loadingAlert} />
        ) : (
          <View style={styles.loading} accessible accessibilityLabel="Chargement du profil">
            <ActivityIndicator color={colors.accentText} size="large" />
            <Text style={typography.subtitle}>Chargement du profil…</Text>
          </View>
        )}
      </Screen>
    );
  }

  const missingRequired = !form.first_name.trim() || !form.age;
  const saveDisabled = loading || missingRequired;

  return (
    <Screen
      title="Mon profil"
      footer={
        <View style={styles.footer}>
          <FormAlert message={error} />
          <FormAlert tone="success" message={success ? 'Profil mis à jour' : null} />
          {missingRequired && !loading ? (
            <Text style={styles.disabledReason} accessibilityLiveRegion="polite">
              Renseigne ton prénom et ton âge pour enregistrer.
            </Text>
          ) : null}
          <View style={styles.actions}>
            <Button title="Retour" variant="secondary" onPress={onBack} style={styles.backBtn} />
            <Button
              title={loading ? 'Enregistrement...' : 'Enregistrer'}
              onPress={handleSave}
              loading={loading}
              disabled={saveDisabled}
              accessibilityHint={missingRequired ? 'Renseigne ton prénom et ton âge pour enregistrer' : undefined}
              style={styles.submitBtn}
            />
          </View>
        </View>
      }
    >
      <Text style={[typography.subtitle, styles.intro]}>Modifie tes informations à tout moment</Text>

      <View style={styles.sections}>
        <ProfilePhoto
          avatarUrl={avatarUrl}
          firstName={form.first_name}
          onUploaded={(u) => setAvatarUrl(u?.avatar_url || null)}
        />

        <Section title="Informations">
          <TextField
            label="Prénom"
            value={form.first_name}
            onChangeText={(v) => setForm({ ...form, first_name: v })}
            autoComplete="given-name"
            textContentType="givenName"
            autoCapitalize="words"
            error={!form.first_name.trim() ? 'Obligatoire' : undefined}
          />
          <TextField
            label="Âge"
            value={form.age}
            onChangeText={(v) => setForm({ ...form, age: v })}
            keyboardType="number-pad"
            error={!form.age ? 'Obligatoire' : undefined}
          />
          <TextField
            label="Ville"
            value={form.city}
            onChangeText={(v) => setForm({ ...form, city: v })}
            autoComplete="postal-address-locality"
            textContentType="addressCity"
          />
        </Section>

        <Section title="Je cherche">
          <RadioGroup label="Je cherche" style={styles.cards}>
            {INTENTS.map((intent) => (
              <RadioCard
                key={intent.id}
                title={intent.label}
                icon={intent.icon}
                selected={form.intent === intent.id}
                onPress={() => setForm({ ...form, intent: intent.id })}
              />
            ))}
          </RadioGroup>
        </Section>

        <Section title="Genre">
          <RadioGroup label="Genre" style={styles.pillRow}>
            {GENDERS.map((g) => (
              <RadioChip
                key={g.id}
                label={g.label}
                selected={form.gender === g.id}
                accessibilityHint={form.gender === g.id ? 'Touche à nouveau pour désélectionner' : undefined}
                onPress={() => setForm({ ...form, gender: form.gender === g.id ? null : g.id })}
              />
            ))}
          </RadioGroup>
        </Section>

        <Section title="Je recherche">
          <RadioGroup label="Je recherche" style={styles.pillRow}>
            {GENDERS.map((g) => (
              <RadioChip
                key={g.id}
                label={g.label}
                selected={form.looking_for === g.id}
                accessibilityHint={form.looking_for === g.id ? 'Touche à nouveau pour désélectionner' : undefined}
                onPress={() => setForm({ ...form, looking_for: form.looking_for === g.id ? null : g.id })}
              />
            ))}
          </RadioGroup>
        </Section>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', gap: spacing.md },
  loadingAlert: { alignSelf: 'stretch' },
  intro: { marginBottom: spacing.xl },
  sections: { gap: spacing.xxl },
  cards: { gap: spacing.md },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  footer: { gap: spacing.sm },
  disabledReason: { color: colors.textMuted, fontSize: fontSize.xs, lineHeight: 16, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: spacing.md },
  backBtn: { flex: 1, paddingHorizontal: spacing.md },
  submitBtn: { flex: 2, paddingHorizontal: spacing.md },
});
