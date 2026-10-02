import { useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';

// Bouton / geste retour d'Android : sans navigateur, le système quitte
// l'appli à chaque appui. Ce hook le branche sur le même `onBack` que le
// bouton retour affiché à l'écran. Sans `onBack` (écran racine), on laisse
// le comportement système. Sans effet sur iOS (BackHandler y est inerte).
//
// Un seul écran à la fois doit fournir un `onBack` : les écrans à étapes
// (onboarding, musique) gèrent eux-mêmes leur retour, App.tsx ne gère que
// les écrans qu'il rend directement.
export default function useHardwareBack(onBack) {
  const handler = useRef(onBack);
  useEffect(() => {
    handler.current = onBack;
  });

  const enabled = typeof onBack === 'function';
  useEffect(() => {
    if (!enabled) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handler.current();
      return true;
    });
    return () => subscription.remove();
  }, [enabled]);
}
