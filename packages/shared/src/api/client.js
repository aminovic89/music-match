// packages/shared/src/api/client.js
// Client API partagé entre web (Next.js) et mobile (React Native)

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL
  || process.env.EXPO_PUBLIC_API_URL
  || 'https://music-match-api-dev.azurewebsites.net';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  async request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${this.baseUrl}${path}`, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  }

  // Auth
  register(payload) { return this.request('POST', '/api/auth/register', payload); }
  login(email, password) { return this.request('POST', '/api/auth/login', { email, password }); }
  getSpotifyAuthUrl() { return `${this.baseUrl}/api/auth/spotify`; }

  // Profil
  getMe() { return this.request('GET', '/api/users/me'); }
  updateMe(payload) { return this.request('PATCH', '/api/users/me', payload); }

  // Musique
  searchTracks(query) { return this.request('GET', `/api/music/search?q=${encodeURIComponent(query)}`); }
  saveTracks(tracks) { return this.request('POST', '/api/music/tracks', tracks); }
  getMusicProfile() { return this.request('GET', '/api/music/profile'); }
  getSpotifyStatus() { return this.request('GET', '/api/music/spotify/status'); }
}

const apiClient = new ApiClient();
module.exports = { apiClient, ApiClient };
