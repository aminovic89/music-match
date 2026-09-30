'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button, { buttonClasses } from '@/components/Button';
import FormAlert from '@/components/Alert';
import PageContainer from '@/components/PageContainer';
import PageHeader from '@/components/PageHeader';
import Section from '@/components/Section';
import StickyBar from '@/components/StickyBar';
import TextField from '@/components/TextField';
import { RadioGroup, RadioCard, RadioChip } from '@/components/Choice';
import { LoadingState } from '@/components/States';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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
      <PageContainer>
        <PageHeader title="Mon profil" backHref="/home" />
        <FormAlert id="profile-load-error" message={error} />
        {!error && <LoadingState label="Chargement du profil…" />}
      </PageContainer>
    );
  }

  const missingRequired = !form.first_name.trim() || !form.age;

  return (
    <PageContainer>
      <PageHeader title="Mon profil" subtitle="Modifie tes informations à tout moment" />

      <form
        className="flex flex-1 flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          if (!loading && !missingRequired) handleSave();
        }}
      >
        <div className="flex flex-col gap-10">
          <Section title="Informations">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
              <TextField
                label="Prénom"
                type="text"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                autoComplete="given-name"
                error={!form.first_name.trim() ? 'Obligatoire' : undefined}
              />
              <TextField
                label="Âge"
                type="number"
                inputMode="numeric"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                error={!form.age ? 'Obligatoire' : undefined}
              />
            </div>
            <TextField
              label="Ville"
              type="text"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              autoComplete="address-level2"
            />
          </Section>

          <Section title="Je cherche">
            <RadioGroup label="Je cherche" className="flex flex-col gap-3">
              {INTENTS.map((intent) => (
                <RadioCard
                  key={intent.id}
                  name="intent"
                  value={intent.id}
                  title={intent.label}
                  icon={intent.icon}
                  checked={form.intent === intent.id}
                  onSelect={(v) => setForm({ ...form, intent: v })}
                />
              ))}
            </RadioGroup>
          </Section>

          <Section title="Genre">
            <RadioGroup label="Genre" className="flex flex-wrap gap-2">
              {GENDERS.map((g) => (
                <RadioChip
                  key={g.id}
                  name="gender"
                  value={g.id}
                  label={g.label}
                  checked={form.gender === g.id}
                  deselectable
                  onSelect={(v) => setForm({ ...form, gender: v })}
                />
              ))}
            </RadioGroup>
          </Section>

          <Section title="Je recherche">
            <RadioGroup label="Je recherche" className="flex flex-wrap gap-2">
              {GENDERS.map((g) => (
                <RadioChip
                  key={g.id}
                  name="looking_for"
                  value={g.id}
                  label={g.label}
                  checked={form.looking_for === g.id}
                  deselectable
                  onSelect={(v) => setForm({ ...form, looking_for: v })}
                />
              ))}
            </RadioGroup>
          </Section>
        </div>

        <div className="flex-1" />
        <StickyBar>
          <div className="flex flex-col gap-3">
            <FormAlert id="profile-error" message={error} />
            <FormAlert id="profile-success" tone="success" message={success ? 'Profil mis à jour' : null} />
            {missingRequired && !loading && (
              <p id="profile-save-reason" className="text-center text-xs text-muted">
                Renseigne ton prénom et ton âge pour enregistrer.
              </p>
            )}
            <div className="flex gap-3">
              <Link
                href="/home"
                className={buttonClasses({ variant: 'secondary', fullWidth: false, className: 'flex-1 px-3' })}
              >
                Retour
              </Link>
              <Button
                type="submit"
                loading={loading}
                disabled={missingRequired}
                aria-describedby={missingRequired ? 'profile-save-reason' : undefined}
                fullWidth={false}
                className="flex-[2] px-3"
              >
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </StickyBar>
      </form>
    </PageContainer>
  );
}
