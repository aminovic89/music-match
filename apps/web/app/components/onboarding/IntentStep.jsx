'use client';

import { useState } from 'react';
import Button from '../Button';
import StickyBar from '../StickyBar';
import { RadioGroup, RadioCard } from '../Choice';

const INTENTS = [
  {
    id: 'romantic',
    label: 'Une rencontre romantique',
    description: 'Quelqu\'un qui partage ta vision de la musique',
    icon: '❤️',
  },
  {
    id: 'friendship',
    label: 'Une amitié',
    description: 'Des gens avec qui sortir, écouter de la musique',
    icon: '👥',
  },
];

export default function IntentStep({ initialIntent = 'romantic', onSave, loading }) {
  const [selected, setSelected] = useState(initialIntent);

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">Je cherche...</h1>
        <p className="text-base text-muted">Choisis ton intention — tu pourras la changer plus tard</p>
      </div>

      <RadioGroup label="Je cherche" className="flex flex-col gap-3">
        {INTENTS.map((intent) => (
          <RadioCard
            key={intent.id}
            name="intent"
            value={intent.id}
            title={intent.label}
            description={intent.description}
            icon={intent.icon}
            checked={selected === intent.id}
            onSelect={setSelected}
          />
        ))}
      </RadioGroup>

      <div className="flex-1" />
      <StickyBar>
        <Button onClick={() => onSave(selected)} loading={loading}>
          {loading ? 'Enregistrement...' : 'Continuer'}
        </Button>
      </StickyBar>
    </div>
  );
}
