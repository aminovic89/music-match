'use client';

import Button from '../Button';
import Card from '../Card';
import Chip from '../Chip';
import Section from '../Section';
import StickyBar from '../StickyBar';
import { EmptyState } from '../States';
import { moodInfo } from '../moods';


// Mêmes seuils que deriveMoods (apps/api/src/services/spotify.js), pour que
// la légende reste cohérente avec les moods affichés juste en dessous.
function energyLabel(pct) {
  if (pct < 40) return 'plutôt calme';
  if (pct > 70) return 'plutôt intense';
  return 'équilibrée';
}

function valenceLabel(pct) {
  if (pct < 35) return 'plutôt mélancolique';
  if (pct > 60) return 'plutôt joyeuse';
  return 'équilibrée';
}

function tempoLabel(bpm) {
  if (bpm < 90) return 'tempo lent';
  if (bpm > 120) return 'tempo rapide';
  return 'tempo modéré';
}

// Barre de métrique : libellé + valeur sur une ligne, barre pleine largeur
// dessous, légende en texte (plus de largeurs/décalages fixes qui
// cassaient avec une grande taille de police).
function MetricBar({ label, value, caption }) {
  const pct = Math.round((value || 0) * 100);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-fg">{label}</span>
        <span className="text-sm tabular-nums text-muted">
          {pct}<span className="sr-only"> sur 100</span>
        </span>
      </div>
      <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-linear-to-r from-accent to-accent-2 motion-safe:transition-[width] motion-safe:duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      {caption && <p className="text-xs text-muted">{caption}</p>}
    </div>
  );
}

export default function DnaStep({ titleAs: Title = 'h1', profile, onComplete, onBack }) {
  if (!profile) {
    return (
      <EmptyState title="Profil musical non disponible" headingLevel={Title}>
        <Button variant="secondary" onClick={onBack}>
          Retour
        </Button>
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-8 flex flex-col gap-2">
        <Title className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">Ton ADN musical</Title>
        <p className="text-base text-muted">Voilà ce qu&apos;on a trouvé à partir de tes titres</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Métriques — seulement si on a de vraies audio features (titres
            importés via Spotify) ; les titres Deezer/manuels n'en ont pas. */}
        {profile.avg_energy != null && (
          <Card className="sm:p-6">
            <Section title="Audio">
              <div className="flex flex-col gap-4">
                <MetricBar
                  label="Énergie"
                  value={profile.avg_energy}
                  caption={energyLabel(Math.round(profile.avg_energy * 100))}
                />
                <MetricBar
                  label="Positivité"
                  value={profile.avg_valence}
                  caption={valenceLabel(Math.round(profile.avg_valence * 100))}
                />
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-fg">BPM moy.</span>
                    <span className="text-base font-semibold tabular-nums text-fg">{Math.round(profile.avg_tempo)}</span>
                  </div>
                  <p className="text-xs text-muted">{tempoLabel(Math.round(profile.avg_tempo))}</p>
                </div>
              </div>
            </Section>
          </Card>
        )}

        {/* Artistes */}
        {profile.top_artists?.length > 0 && (
          <Card className="sm:p-6">
            <Section title="Artistes dominants">
              <ul className="flex flex-wrap gap-2">
                {profile.top_artists.map((artist) => (
                  <li key={artist}>
                    <Chip tone="accent">{artist}</Chip>
                  </li>
                ))}
              </ul>
            </Section>
          </Card>
        )}

        {/* Moods */}
        {profile.top_moods?.length > 0 && (
          <Card className="sm:p-6">
            <Section title="Tes moods">
              <ul className="flex flex-wrap gap-2">
                {profile.top_moods.map((mood) => {
                  const info = moodInfo(mood);
                  return (
                    <li key={mood}>
                      <Chip tone="accent2">
                        <span aria-hidden="true">{info.emoji}&nbsp;</span>
                        {info.label}
                      </Chip>
                    </li>
                  );
                })}
              </ul>
            </Section>
          </Card>
        )}
      </div>

      <div className="flex-1" />
      <StickyBar>
        <div className="flex flex-col gap-1 sm:flex-row-reverse sm:gap-3">
          <Button onClick={onComplete} className="sm:flex-[2]">
            Voir mes matchs
          </Button>
          <Button variant="ghost" onClick={onBack} className="sm:flex-1">
            Modifier mes titres
          </Button>
        </div>
      </StickyBar>
    </div>
  );
}
