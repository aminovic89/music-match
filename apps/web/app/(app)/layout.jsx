import ChatBottomNav from '@/components/chat/ChatBottomNav';
import { ChatProvider } from '@/components/chat/ChatProvider';
import BackgroundGlow from '@/components/BackgroundGlow';

export default function AppLayout({ children }) {
  return (
    // ChatProvider : socket + état du chat partagés par tout l'espace
    // connecté (pastille de non-lus de la barre d'onglets, /messages).
    <ChatProvider>
      {/* --app-bottom-nav : hauteur de la barre d'onglets mobile, utilisée par
          les barres d'actions collantes (StickyBar) pour se placer au-dessus.
          overflow-x-clip (et non hidden) : coupe les halos sans créer de
          conteneur de scroll, sinon position: sticky ne marcherait plus. */}
      <div className="relative isolate flex min-h-dvh flex-1 flex-col overflow-x-clip bg-background [--app-bottom-nav:calc(3.5rem+env(safe-area-inset-bottom))] md:[--app-bottom-nav:0px]">
        <BackgroundGlow />
        <ChatBottomNav />
        {/* La barre est en position fixed — cette marge garantit toujours de
            la place en bas, même quand le contenu d'une page dépasse 100vh
            (ex. le formulaire de /profile sur un petit écran). Exactement la
            hauteur de la barre (et non une valeur fixe plus grande), pour que
            les barres d'actions collantes s'y posent sans laisser de jour. */}
        <div className="flex flex-1 flex-col pb-[var(--app-bottom-nav)]">{children}</div>
      </div>
    </ChatProvider>
  );
}
