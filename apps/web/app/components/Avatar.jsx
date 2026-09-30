'use client';

// Photo de profil, ou initiale du prénom sur pastille dégradée (miroir de
// l'Avatar mobile). `ring` : anneau dégradé autour (cartes de profil).
// <img> et non next/image : l'appli est en `output: 'export'` (warning
// lint @next/next/no-img-element accepté).
export default function Avatar({ avatarUrl, firstName, size = 64, ring = false, className = '' }) {
  const style = { width: size, height: size };

  const inner = avatarUrl ? (
    <img
      src={avatarUrl}
      alt={firstName || ''}
      style={style}
      className="rounded-full bg-surface-2 object-cover"
    />
  ) : (
    <div
      aria-hidden="true"
      style={{ ...style, fontSize: size * 0.4 }}
      className="flex items-center justify-center rounded-full bg-linear-to-br from-accent to-accent-2 font-semibold text-white"
    >
      {firstName ? firstName.charAt(0).toUpperCase() : '?'}
    </div>
  );

  if (!ring) return <div className={`shrink-0 ${className}`}>{inner}</div>;
  return (
    <div className={`shrink-0 rounded-full bg-linear-to-br from-accent to-accent-2 p-[3px] ${className}`}>
      <div className="rounded-full bg-surface p-[3px]">{inner}</div>
    </div>
  );
}
