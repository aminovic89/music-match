'use client';

const MOODS_LABELS = {
  energetic: { label: 'Énergique', emoji: '⚡' },
  chill: { label: 'Chill', emoji: '😌' },
  happy: { label: 'Joyeux', emoji: '😊' },
  melancholic: { label: 'Mélancolique', emoji: '🌙' },
  danceable: { label: 'Dansant', emoji: '💃' },
  intense: { label: 'Intense', emoji: '🔥' },
  romantic: { label: 'Romantique', emoji: '🌹' },
  neutral: { label: 'Neutre', emoji: '🎵' },
};

function MetricBar({ label, value }) {
  const pct = Math.round((value || 0) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-400 text-xs w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-2 bg-violet-500 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-gray-400 text-xs w-8 text-right">{pct}</span>
    </div>
  );
}

export default function DnaStep({ profile, onComplete, onBack }) {
  if (!profile) {
    return (
      <div className="text-center text-gray-400 py-12">
        <div className="text-4xl mb-4">🎵</div>
        <p>Profil musical non disponible</p>
        <button onClick={onBack} className="mt-4 text-violet-400 text-sm underline">
          Retour
        </button>
      </div>
    );
  }

  const avgTempo = Math.round(profile.avg_tempo || 0);

  return (
    <div className="flex flex-col">
      <h1 className="text-2xl font-semibold text-white text-center mb-2">
        Ton ADN musical 🎵
      </h1>
      <p className="text-gray-400 text-center text-sm mb-8">
        Voilà ce qu'on a trouvé à partir de tes titres
      </p>

      {/* Métriques */}
      <div className="bg-gray-900 rounded-xl p-5 mb-4 border border-gray-800">
        <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-4">Audio</h3>
        <div className="flex flex-col gap-3">
          <MetricBar label="Énergie" value={profile.avg_energy} />
          <MetricBar label="Positivité" value={profile.avg_valence} />
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-xs w-20 flex-shrink-0">BPM moy.</span>
            <div className="flex-1" />
            <span className="text-white font-medium text-sm">{avgTempo}</span>
          </div>
        </div>
      </div>

      {/* Artistes */}
      {profile.top_artists?.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-5 mb-4 border border-gray-800">
          <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-3">Artistes dominants</h3>
          <div className="flex flex-wrap gap-2">
            {profile.top_artists.map((artist) => (
              <span
                key={artist}
                className="px-3 py-1 bg-violet-500/20 text-violet-300 rounded-full text-xs border border-violet-500/30"
              >
                {artist}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Moods */}
      {profile.top_moods?.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-5 mb-6 border border-gray-800">
          <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-3">Tes moods</h3>
          <div className="flex flex-wrap gap-2">
            {profile.top_moods.map((mood) => {
              const info = MOODS_LABELS[mood] || { label: mood, emoji: '🎵' };
              return (
                <span
                  key={mood}
                  className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs border border-emerald-500/30"
                >
                  {info.emoji} {info.label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={onComplete}
        className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl transition-colors"
      >
        Voir mes matchs →
      </button>

      <button onClick={onBack} className="mt-3 text-gray-500 text-sm text-center hover:text-gray-300 transition-colors">
        ← Modifier mes titres
      </button>
    </div>
  );
}
