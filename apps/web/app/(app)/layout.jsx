import BottomNav from '@/components/BottomNav';

export default function AppLayout({ children }) {
  return (
    <>
      {/* La barre est en position fixed — cette marge garantit toujours de
          la place en bas, même quand le contenu d'une page dépasse 100vh
          (ex. le formulaire de /profile sur un petit écran). */}
      <div className="pb-20">{children}</div>
      <BottomNav />
    </>
  );
}
