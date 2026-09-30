'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthShell from '../components/AuthShell';
import Button from '../components/Button';
import { PasswordField } from '../components/TextField';
import TextLink from '../components/TextLink';
import FormAlert, { Alert } from '../components/Alert';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setDone(true);
      setTimeout(() => router.push('/login'), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div role="alert">
        <Alert tone="error">
          Lien invalide.{' '}
          <TextLink href="/forgot-password">Demander un nouveau lien</TextLink>
        </Alert>
      </div>
    );
  }

  if (done) {
    return (
      <div role="status">
        <Alert tone="success">Mot de passe mis à jour. Redirection...</Alert>
      </div>
    );
  }

  return (
    <>
      <FormAlert id="reset-error" message={error} className="mb-4" />

      <form
        onSubmit={handleSubmit}
        aria-describedby={error ? 'reset-error' : undefined}
        className="flex flex-col gap-4"
      >
        <PasswordField
          label="Nouveau mot de passe"
          hint="8 caractères minimum"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordField
          label="Confirme le mot de passe"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <Button type="submit" loading={loading} className="mt-1">
          {loading ? 'Mise à jour...' : 'Réinitialiser le mot de passe'}
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Nouveau mot de passe"
      subtitle="Choisis un nouveau mot de passe pour ton compte"
      footer={
        <TextLink href="/login" standalone>
          <span aria-hidden="true">←&nbsp;</span>Retour à la connexion
        </TextLink>
      }
    >
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
