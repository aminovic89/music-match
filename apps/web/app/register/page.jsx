'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthShell from '../components/AuthShell';
import Button from '../components/Button';
import TextField, { PasswordField } from '../components/TextField';
import TextLink from '../components/TextLink';
import FormAlert from '../components/Alert';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          age: Number(age),
          email,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      localStorage.setItem('mm_token', data.token);
      router.push('/onboarding');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Rejoins Music Match"
      subtitle="Trouve des gens qui ressentent la musique comme toi"
      footer={
        <>
          Déjà un compte ?{' '}
          <TextLink href="/login">Connecte-toi</TextLink>
        </>
      }
    >
      <FormAlert id="register-error" message={error} className="mb-4" />

      <form
        onSubmit={handleSubmit}
        aria-describedby={error ? 'register-error' : undefined}
        className="flex flex-col gap-4"
      >
        <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-3">
          <TextField
            label="Prénom"
            type="text"
            required
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <TextField
            label="Âge"
            type="number"
            inputMode="numeric"
            required
            min={18}
            max={99}
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />
        </div>
        <TextField
          label="Email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="toi@exemple.com"
        />
        <PasswordField
          label="Mot de passe"
          hint="8 caractères minimum"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button type="submit" loading={loading} className="mt-1">
          {loading ? 'Création...' : 'Créer mon compte'}
        </Button>

        <p className="text-center text-xs text-muted">Réservé aux 18 ans et plus.</p>
      </form>
    </AuthShell>
  );
}
