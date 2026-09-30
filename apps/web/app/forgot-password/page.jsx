'use client';

import { useState } from 'react';
import AuthShell from '../components/AuthShell';
import Button from '../components/Button';
import TextField from '../components/TextField';
import TextLink from '../components/TextLink';
import FormAlert, { Alert } from '../components/Alert';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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
    <AuthShell
      title="Mot de passe oublié ?"
      subtitle="Indique ton email, on t'envoie un lien de réinitialisation"
      footer={
        <TextLink href="/login" standalone>
          <span aria-hidden="true">←&nbsp;</span>Retour à la connexion
        </TextLink>
      }
    >
      <FormAlert id="forgot-error" message={error} className="mb-4" />

      <div role="status">
        {sent && (
          <Alert tone="success">
            Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.
          </Alert>
        )}
      </div>

      {!sent && (
        <form
          onSubmit={handleSubmit}
          aria-describedby={error ? 'forgot-error' : undefined}
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

          <Button type="submit" loading={loading} className="mt-1">
            {loading ? 'Envoi...' : 'Envoyer le lien'}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
