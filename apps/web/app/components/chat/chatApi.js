// Accès HTTP à l'API de chat (même schéma d'auth que les autres pages :
// jeton `mm_token` dans localStorage, base d'URL NEXT_PUBLIC_API_URL).

export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const getToken = () => (typeof window === 'undefined' ? null : localStorage.getItem('mm_token'));

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function apiGet(path) {
  const token = getToken();
  let res;
  try {
    res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    throw new ApiError(0, 'Impossible de joindre le serveur. Vérifie ta connexion.');
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    // corps vide ou non JSON
  }
  if (!res.ok) throw new ApiError(res.status, data?.error || `Erreur ${res.status}`);
  return data;
}
