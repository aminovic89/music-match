'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://music-match-api-prod.azurewebsites.net';

const INTENTS = [
  { id: 'romantic', label: 'Une rencontre romantique', icon: '❤️' },
  { id: 'friendship', label: 'Une amitié', icon: '👥' },
];

const GENDERS = [
  { id: 'male', label: 'Homme' },
  { id: 'female', label: 'Femme' },
  { id: 'other', label: 'Autre' },
];

export default function ProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('mm_token');
    if (!token) { router.replace('/login'); return; }
    fetch(`${API}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        setForm({
          first_name: data.user.first_name || '',
          age: data.user.age || '',
          city: data.user.city || '',
          intent: data.user.intent || 'romantic',
          gender: data.user.gender || null,
          looking_for: data.user.looking_for || null,
        });
      })
      .catch((err) => setError(err.message));
  }, [router]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const token = localStorage.getItem('mm_token');
      const res = await fetch(`${API}/api/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          first_name: form.first_name,
          age: Number(form.age),
          city: form.city,
          intent: form.intent,
          gender: form.gender,
          looking_for: form.looking_for,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!form) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold text-white text-center mb-2">Mon profil</h1>
        <p className="text-gray-400 text-center text-sm mb-6">
          Modifie tes informations à tout moment
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-400 text-sm text-center">
            Profil mis à jour ✓
          </div>
        )}

        <div className="flex flex-col gap-3 mb-6">
          <input
            type="text"
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            placeholder="Prénom"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 text-sm"
          />
          <input
            type="number"
            value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value })}
            placeholder="Âge"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 text-sm"
          />
          <input
            type="text"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            placeholder="Ville"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 text-sm"
          />
        </div>

        <p className="text-gray-500 text-xs mb-2">Je cherche</p>
        <div className="flex flex-col gap-2 mb-6">
          {INTENTS.map((intent) => (
            <button
              key={intent.id}
              onClick={() => setForm({ ...form, intent: intent.id })}
              className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                form.intent === intent.id
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-gray-700 bg-gray-900 hover:border-gray-500'
              }`}
            >
              <span className="text-lg">{intent.icon}</span>
              <span className="text-white text-sm">{intent.label}</span>
            </button>
          ))}
        </div>

        <p className="text-gray-500 text-xs mb-2">Genre</p>
        <div className="flex gap-2 mb-6">
          {GENDERS.map((g) => (
            <button
              key={g.id}
              onClick={() => setForm({ ...form, gender: form.gender === g.id ? null : g.id })}
              className={`flex-1 py-2 rounded-xl border text-sm transition-all ${
                form.gender === g.id
                  ? 'border-violet-500 bg-violet-500/10 text-white'
                  : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        <p className="text-gray-500 text-xs mb-2">Je recherche</p>
        <div className="flex gap-2 mb-8">
          {GENDERS.map((g) => (
            <button
              key={g.id}
              onClick={() => setForm({ ...form, looking_for: form.looking_for === g.id ? null : g.id })}
              className={`flex-1 py-2 rounded-xl border text-sm transition-all ${
                form.looking_for === g.id
                  ? 'border-violet-500 bg-violet-500/10 text-white'
                  : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <Link
            href="/home"
            className="flex-1 py-3 border border-gray-700 text-gray-300 rounded-xl text-sm text-center hover:border-gray-500 transition-colors"
          >
            ← Retour
          </Link>
          <button
            onClick={handleSave}
            disabled={loading || !form.first_name.trim() || !form.age}
            className="flex-2 flex-grow-[2] py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-medium rounded-xl text-sm transition-colors"
          >
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
