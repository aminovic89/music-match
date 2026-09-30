import React, { useRef, useState } from 'react';
import { Text, View, StyleSheet, useWindowDimensions } from 'react-native';
import { apiClient } from '@music-match/shared';
import AuthScreen from '../../components/AuthScreen';
import Button from '../../components/Button';
import TextField, { PasswordField } from '../../components/TextField';
import TextLink from '../../components/TextLink';
import FormAlert from '../../components/Alert';
import { colors, fontSize, spacing } from '../../theme';

export default function RegisterScreen({ onSuccess, onNavigateLogin }) {
  const [firstName, setFirstName] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const ageRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  // Prénom + Âge côte à côte (comme sur le web) seulement s'il y a la
  // place : sur iPhone SE (320pt) ou avec une grande taille de police,
  // on empile pour ne pas tronquer les libellés.
  const { width, fontScale } = useWindowDimensions();
  const sideBySide = width >= 360 && fontScale <= 1.3;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.register({
        first_name: firstName,
        age: Number(age),
        email,
        password,
      });
      onSuccess(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen
      title="Rejoins Music Match"
      subtitle="Trouve des gens qui ressentent la musique comme toi"
      footer={
        <>
          <Text style={styles.footerText}>Déjà un compte ? </Text>
          <TextLink title="Connecte-toi" onPress={onNavigateLogin} />
        </>
      }
    >
      <FormAlert message={error} style={styles.alert} />

      <View style={styles.form}>
        <View style={sideBySide ? styles.row : styles.form}>
          <TextField
            label="Prénom"
            value={firstName}
            onChangeText={setFirstName}
            autoComplete="given-name"
            textContentType="givenName"
            autoCapitalize="words"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => ageRef.current?.focus()}
            style={sideBySide && styles.grow}
          />
          <TextField
            ref={ageRef}
            label="Âge"
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => emailRef.current?.focus()}
            style={sideBySide && styles.age}
          />
        </View>
        <TextField
          ref={emailRef}
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="toi@exemple.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <PasswordField
          ref={passwordRef}
          label="Mot de passe"
          hint="8 caractères minimum"
          value={password}
          onChangeText={setPassword}
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
        />

        <Button
          title={loading ? 'Création...' : 'Créer mon compte'}
          onPress={handleSubmit}
          loading={loading}
          style={styles.submit}
        />

        <Text style={styles.note}>Réservé aux 18 ans et plus.</Text>
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  alert: { marginBottom: spacing.lg },
  form: { gap: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md },
  grow: { flex: 1 },
  age: { width: 104 },
  submit: { marginTop: spacing.xs },
  note: { color: colors.textMuted, fontSize: fontSize.xs, textAlign: 'center' },
  footerText: { color: colors.textMuted, fontSize: fontSize.sm },
});
