'use client';

import { useEffect, useState } from 'react';

// Horloge de présentation : heures relatives, temps restant avant
// effacement et masquage des messages expirés se recalculent toutes les
// `intervalMs` sans que la page ait à le faire.
export default function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
