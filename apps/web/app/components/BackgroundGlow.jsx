// Halos décoratifs (violet en haut, fuchsia en bas à droite) derrière les
// écrans "vitrine" (auth, landing). Le parent doit être `relative isolate
// overflow-hidden` : les halos débordent volontairement et ne doivent
// jamais créer de scroll horizontal.
export default function BackgroundGlow() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-accent/25 blur-3xl" />
      <div className="absolute -bottom-48 -right-32 size-[28rem] rounded-full bg-accent-2/15 blur-3xl" />
    </div>
  );
}
