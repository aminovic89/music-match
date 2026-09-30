'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthShell from '../components/AuthShell';
import Button from '../components/Button';
import TextField, { PasswordField } from '../components/TextField';
import TextLink from '../components/TextLink';
import FormAlert from '../components/Alert';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      localStorage.setItem('mm_token', data.token);
      router.push('/home');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Content de te revoir"
      subtitle="Connecte-toi pour retrouver tes matchs"
      footer={
        <>
          Pas encore de compte ?{' '}
          <TextLink href="/register">Crée-en un</TextLink>
        </>
      }
    >
      <FormAlert id="login-error" message={error} className="mb-4" />

      <form
        onSubmit={handleSubmit}
        aria-describedby={error ? 'login-error' : undefined}
        className="flex flex-col gap-4"
      >
        <TextField
          label="Email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="toi@exemple.com"
        />
        <div>
          <PasswordField
            label="Mot de passe"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="mt-1 flex justify-end">
            <TextLink href="/forgot-password" standalone className="text-sm">
              Mot de passe oublié ?
            </TextLink>
          </div>
        </div>

        <Button type="submit" loading={loading} className="mt-1">
          {loading ? 'Connexion...' : 'Se connecter'}
        </Button>
      </form>
    </AuthShell>
  );
}
