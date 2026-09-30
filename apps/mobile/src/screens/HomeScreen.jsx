import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Screen from '../components/Screen';
import Button from '../components/Button';
import Card from '../components/Card';
import Section from '../components/Section';
import ListRow from '../components/ListRow';
import Avatar from '../components/Avatar';
import Logo, { LogoMark } from '../components/Logo';
import FormAlert from '../components/Alert';
import { colors, spacing, fontSize, fontWeight, lineHeight, typography } from '../theme';
import { apiClient } from '@music-match/shared';

export default function HomeScreen({ onLogout, onNavigateProfile, onNavigateMusic }) {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiClient.getMe()
      .then((data) => setUser(data.user))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <Screen header={<View style={styles.brand}><Logo /></View>}>
      <FormAlert message={error} style={styles.alert} />

      {/* Salutation */}
      <View style={styles.greeting}>
        <Avatar avatarUrl={user?.avatar_url} firstName={user?.first_name} size={56} />
        <View style={styles.greetingText}>
          <Text style={styles.hello} accessibilityRole="header">
            {user ? `Salut ${user.first_name} !` : 'Bienvenue'}
          </Text>
          <Text style={typography.subtitle}>Content de te revoir.</Text>
        </View>
      </View>

      <View style={styles.sections}>
        {/* Statut : la découverte et les matchs n'existent que sur le web
            (apps/web/app/(app)/discover et /matches) ; pas de lien profond
            vers le web dans l'appli, donc simple note non interactive. */}
        <Card compact style={styles.status}>
          <LogoMark size={40} />
          <View style={styles.statusText}>
            <Text style={styles.statusTitle}>Tes matchs sont sur le web</Text>
            <Text style={typography.subtitle}>
              {"Pour l'instant, la découverte de profils et tes matchs se trouvent sur la version web de Music Match."}
            </Text>
          </View>
        </Card>

        <Section title="Ton compte">
          <View style={styles.rows}>
            <ListRow
              icon="✎"
              title="Mon profil"
              description="Prénom, âge, ville et ce que tu recherches"
              onPress={onNavigateProfile}
            />
            <ListRow
              icon="♪"
              title="Ma musique"
              description="Tes titres et ton ADN musical"
              onPress={onNavigateMusic}
            />
          </View>
        </Section>
      </View>

      {/* Déconnexion : volontairement discrète, en bas du contenu. */}
      <View style={styles.logout}>
        <Button title="Se déconnecter" variant="ghost" onPress={onLogout} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { paddingVertical: spacing.sm },
  alert: { marginBottom: spacing.lg },
  greeting: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.xl },
  greetingText: { flex: 1, gap: spacing.xs },
  hello: {
    color: colors.text,
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight['2xl'],
    fontWeight: fontWeight.semibold,
    letterSpacing: -0.4,
  },
  sections: { gap: spacing.xxl },
  status: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg },
  statusText: { flex: 1, gap: spacing.xs },
  statusTitle: { color: colors.text, fontSize: fontSize.base, lineHeight: lineHeight.base, fontWeight: fontWeight.semibold },
  rows: { gap: spacing.sm },
  logout: { marginTop: 'auto', paddingTop: spacing.xxl, alignItems: 'center' },
});
