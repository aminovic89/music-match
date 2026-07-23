'use client';

import { useState } from 'react';

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
    <div className="flex flex-col">
      <h1 className="text-2xl font-semibold text-white text-center mb-2">
        Je cherche...
      </h1>
      <p className="text-gray-400 text-center text-sm mb-8">
        Choisis ton intention — tu pourras la changer plus tard
      </p>

      <div className="flex flex-col gap-3 mb-8">
        {INTENTS.map((intent) => (
          <button
            key={intent.id}
            onClick={() => setSelected(intent.id)}
            className={`p-4 rounded-xl border text-left transition-all ${
              selected === intent.id
                ? 'border-violet-500 bg-violet-500/10'
                : 'border-gray-700 bg-gray-900 hover:border-gray-500'
            }`}
          >
            <div className="text-2xl mb-2">{intent.icon}</div>
            <div className="text-white font-medium mb-1">{intent.label}</div>
            <div className="text-gray-400 text-sm">{intent.description}</div>
          </button>
        ))}
      </div>

      <button
        onClick={() => onSave(selected)}
        disabled={loading}
        className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
      >
        {loading ? 'Enregistrement...' : 'Continuer →'}
      </button>
    </div>
  );
}
