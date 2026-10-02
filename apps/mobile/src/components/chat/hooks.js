import { useCallback, useEffect, useRef, useState } from 'react';

// Horloge de présentation : heures relatives, temps restant avant
// effacement et masquage des messages expirés se recalculent toutes les
// `intervalMs` sans que l'écran appelant ait à le faire.
export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

// Après ce délai sans frappe, on considère que l'utilisateur n'écrit plus.
export const TYPING_IDLE_MS = 3000;

// Transforme les frappes en deux signaux : `onTyping()` une fois au début
// d'une rafale, `onStopTyping()` après 3 s d'inactivité, quand le champ
// est vidé, à l'envoi, à la perte de focus et au démontage. Le câblage
// n'a donc qu'à relayer ces deux appels vers le socket (`typing` /
// `stop_typing`), sans gérer de minuterie. Miroir du hook web
// (apps/web/app/components/chat/useTypingSignal.js).
export function useTypingSignal(onTyping, onStopTyping) {
  const active = useRef(false);
  const timer = useRef(null);
  const callbacks = useRef({ onTyping, onStopTyping });
  useEffect(() => {
    callbacks.current = { onTyping, onStopTyping };
  });

  const stop = useCallback(() => {
    clearTimeout(timer.current);
    if (!active.current) return;
    active.current = false;
    callbacks.current.onStopTyping?.();
  }, []);

  const notify = useCallback(
    (text) => {
      if (!text.trim()) {
        stop();
        return;
      }
      if (!active.current) {
        active.current = true;
        callbacks.current.onTyping?.();
      }
      clearTimeout(timer.current);
      timer.current = setTimeout(stop, TYPING_IDLE_MS);
    },
    [stop]
  );

  useEffect(() => stop, [stop]);

  return { notify, stop };
}
