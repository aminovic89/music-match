import React, { useRef, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { apiClient } from '@music-match/shared';
import AuthScreen from '../../components/AuthScreen';
import Button from '../../components/Button';
import TextField, { PasswordField } from '../../components/TextField';
import TextLink from '../../components/TextLink';
import FormAlert from '../../components/Alert';
import { colors, fontSize, spacing } from '../../theme';

export default function LoginScreen({ onSuccess, onNavigateRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const passwordRef = useRef(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.login(email, password);
      onSuccess(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen
      title="Content de te revoir"
      subtitle="Connecte-toi pour retrouver tes matchs"
      footer={
        <>
          <Text style={styles.footerText}>Pas encore de compte ? </Text>
          <TextLink title="Crée-en un" onPress={onNavigateRegister} />
        </>
      }
    >
      <FormAlert message={error} style={styles.alert} />

      <View style={styles.form}>
        <TextField
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
          value={password}
          onChangeText={setPassword}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          // Touche "Go" du clavier = même action que le bouton (ignorée
          // pendant l'envoi, comme le bouton désactivé).
          onSubmitEditing={() => {
            if (!loading) handleSubmit();
          }}
        />

        <Button
          title={loading ? 'Connexion...' : 'Se connecter'}
          onPress={handleSubmit}
          loading={loading}
          style={styles.submit}
        />
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  alert: { marginBottom: spacing.lg },
  form: { gap: spacing.lg },
  submit: { marginTop: spacing.xs },
  footerText: { color: colors.textMuted, fontSize: fontSize.sm },
});
