import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import Screen, { ScreenIntro } from '../../components/Screen';
import Button from '../../components/Button';
import FormAlert from '../../components/Alert';
import { RadioGroup, RadioCard } from '../../components/Choice';
import { spacing } from '../../theme';

const INTENTS = [
  {
    id: 'romantic',
    label: 'Une rencontre romantique',
    description: "Quelqu'un qui partage ta vision de la musique",
    icon: '❤️',
  },
  {
    id: 'friendship',
    label: 'Une amitié',
    description: 'Des gens avec qui sortir, écouter de la musique',
    icon: '👥',
  },
];

export default function IntentScreen({ header, initialIntent = 'romantic', onSave, loading, error }) {
  const [selected, setSelected] = useState(initialIntent);

  return (
    <Screen
      header={header}
      footer={
        <Button
          title={loading ? 'Enregistrement...' : 'Continuer'}
          onPress={() => onSave(selected)}
          loading={loading}
        />
      }
    >
      <ScreenIntro
        title="Je cherche..."
        subtitle="Choisis ton intention — tu pourras la changer plus tard"
      />

      <FormAlert message={error} style={styles.alert} />

      <RadioGroup label="Je cherche" style={styles.cards}>
        {INTENTS.map((intent) => (
          <RadioCard
            key={intent.id}
            title={intent.label}
            description={intent.description}
            icon={intent.icon}
            selected={selected === intent.id}
            onPress={() => setSelected(intent.id)}
          />
        ))}
      </RadioGroup>
    </Screen>
  );
}

const styles = StyleSheet.create({
  alert: { marginBottom: spacing.lg },
  cards: { gap: spacing.md },
});
