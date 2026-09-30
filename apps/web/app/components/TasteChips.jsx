import Chip from './Chip';
import { moodInfo } from './moods';

// Goûts affichés sur la carte de découverte (champs optionnels de
// GET /api/matching/discover — une API plus ancienne ne les renvoie pas) :
// - en commun (shared_*) → "Vous aimez tous les deux", artistes en violet,
//   moods en rose ;
// - sinon ses goûts (top_*) → chips neutres ;
// - sinon rien (pas de section vide).
export function tasteSummary(candidate) {
  const sharedArtists = candidate.shared_artists ?? [];
  const sharedMoods = candidate.shared_moods ?? [];
  const topArtists = candidate.top_artists ?? [];
  const topMoods = candidate.top_moods ?? [];

  if (sharedArtists.length > 0 || sharedMoods.length > 0) {
    return { kind: 'shared', artists: sharedArtists, moods: sharedMoods };
  }
  if (topArtists.length > 0 || topMoods.length > 0) {
    return { kind: 'top', artists: topArtists, moods: topMoods };
  }
  return null;
}

// Annonce courte pour les lecteurs d'écran ("3 artistes en commun").
export function sharedAnnouncement(candidate) {
  const a = (candidate.shared_artists ?? []).length;
  const m = (candidate.shared_moods ?? []).length;
  const parts = [];
  if (a > 0) parts.push(`${a} artiste${a > 1 ? 's' : ''} en commun`);
  if (m > 0) parts.push(`${m} mood${m > 1 ? 's' : ''} en commun`);
  return parts.join(', ');
}

function topTitle(artists, moods) {
  if (artists.length > 0 && moods.length > 0) return 'Ses artistes et ses moods';
  return artists.length > 0 ? 'Ses artistes' : 'Ses moods';
}

export default function TasteChips({ candidate, className = '' }) {
  const summary = tasteSummary(candidate);
  if (!summary) return null;

  const shared = summary.kind === 'shared';
  const title = shared ? 'Vous aimez tous les deux' : topTitle(summary.artists, summary.moods);

  return (
    <section aria-label={title} className={`flex flex-col gap-2 ${className}`}>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</h3>
      <ul className="flex flex-wrap gap-1.5">
        {summary.artists.map((artist) => (
          <li key={`a-${artist}`}>
            <Chip size="sm" tone={shared ? 'accent' : 'neutral'}>
              {artist}
            </Chip>
          </li>
        ))}
        {summary.moods.map((mood) => {
          const info = moodInfo(mood);
          return (
            <li key={`m-${mood}`}>
              <Chip size="sm" tone={shared ? 'accent2' : 'neutral'}>
                <span aria-hidden="true">{info.emoji}&nbsp;</span>
                {info.label}
              </Chip>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
