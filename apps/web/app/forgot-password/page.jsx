'use client';

import { useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://music-match-api-prod.azurewebsites.net';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold text-white text-center mb-2">
          Mot de passe oublié ?
        </h1>
        <p className="text-gray-400 text-center text-sm mb-8">
          Indique ton email, on t&apos;envoie un lien de réinitialisation
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {sent ? (
          <div className="p-4 bg-violet-500/10 border border-violet-500 rounded-xl text-gray-300 text-sm text-center">
            Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 text-sm"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
            >
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </button>
          </form>
        )}

        <p className="text-gray-500 text-sm text-center mt-6">
          <Link href="/login" className="text-violet-400 hover:text-violet-300">
            ← Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
