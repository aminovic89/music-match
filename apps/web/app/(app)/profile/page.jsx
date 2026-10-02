'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Avatar from '@/components/Avatar';
import Button, { buttonClasses, Spinner } from '@/components/Button';
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

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // même limite que l'API (multer)

// Envoi multipart via XHR : fetch n'expose pas la progression d'upload.
function uploadPhoto(file, token, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API}/api/users/me/photo`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () => reject(new Error('Connexion impossible. Vérifie ta connexion et réessaie.'));
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText); } catch { /* corps non JSON */ }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(data);
      if (xhr.status === 401) return reject(Object.assign(new Error('Session expirée'), { status: 401 }));
      if (xhr.status >= 500) return reject(new Error("L'envoi a échoué. Réessaie dans un instant."));
      reject(new Error(data.error || `HTTP ${xhr.status}`));
    };
    const body = new FormData();
    body.append('photo', file);
    xhr.send(body);
  });
}

export default function ProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [photoError, setPhotoError] = useState(null);
  const [photoSuccess, setPhotoSuccess] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('mm_token');
    if (!token) { router.replace('/login'); return; }
    fetch(`${API}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        setUser({ first_name: data.user.first_name, avatar_url: data.user.avatar_url });
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

  // Envoi immédiat à la sélection : la photo a son propre endpoint et reste
  // indépendante du bouton « Enregistrer » (qui ne gère que le texte).
  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permet de re-sélectionner le même fichier
    if (!file) return;
    setPhotoSuccess(false);
    if (!file.type.startsWith('image/')) {
      setPhotoError('Ce fichier n’est pas une image. Choisis une photo (JPG, PNG…).');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError('Cette photo est trop volumineuse (5 Mo maximum).');
      return;
    }
    setPhotoError(null);
    setProgress(0);
    setUploading(true);
    const url = URL.createObjectURL(file);
    setPreview(url);
    try {
      const token = localStorage.getItem('mm_token');
      const data = await uploadPhoto(file, token, setProgress);
      setUser((u) => ({ ...u, avatar_url: data.user.avatar_url }));
      setPhotoSuccess(true);
    } catch (err) {
      if (err.status === 401) { router.replace('/login'); return; }
      setPhotoError(err.message);
    } finally {
      setUploading(false);
      setPreview(null);
      URL.revokeObjectURL(url);
    }
  };

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
          <Section title="Photo de profil">
            <div className="flex flex-col items-center gap-4 sm:flex-row" aria-busy={uploading || undefined}>
              <Avatar
                avatarUrl={preview || user?.avatar_url}
                firstName={user?.first_name}
                size={112}
                ring
                className={uploading ? 'opacity-70' : ''}
              />
              <div className="flex w-full flex-col gap-2 sm:w-auto">
                <input
                  id="profile-photo-input"
                  type="file"
                  accept="image/*"
                  onChange={handlePhoto}
                  disabled={uploading}
                  aria-describedby="profile-photo-hint"
                  className="peer sr-only"
                />
                <label
                  htmlFor="profile-photo-input"
                  className={`${buttonClasses({ variant: 'secondary', fullWidth: false, className: 'cursor-pointer' })} peer-focus-visible:ring-2 peer-focus-visible:ring-focus peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background ${uploading ? 'pointer-events-none opacity-60' : ''}`}
                >
                  {uploading && <Spinner />}
                  {uploading
                    ? `Envoi en cours… ${progress}\u00a0%`
                    : user?.avatar_url ? 'Changer ma photo' : 'Ajouter une photo'}
                </label>
                <p id="profile-photo-hint" className="text-center text-xs text-muted sm:text-left">
                  Image JPG, PNG… · 5 Mo maximum
                </p>
              </div>
            </div>
            <FormAlert id="profile-photo-error" message={photoError} />
            <FormAlert id="profile-photo-success" tone="success" message={photoSuccess ? 'Photo mise à jour' : null} />
          </Section>

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
