// Barre d'actions collée en bas de l'écran (miroir du footer de Screen
// mobile). Dans l'espace connecté, la navigation du bas est fixe : la
// barre se colle juste au-dessus via --app-bottom-nav (défini par
// app/(app)/layout.jsx, 0 ailleurs).
// Le parent ne doit pas être en overflow hidden/auto (sticky casserait).
export default function StickyBar({ className = '', children }) {
  return (
    <div
      className={`sticky bottom-[var(--app-bottom-nav,0px)] z-10 -mx-4 mt-8 border-t border-line bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:mx-0 sm:mb-4 sm:rounded-2xl sm:border sm:px-5 sm:shadow-card ${className}`}
    >
      {children}
    </div>
  );
}
