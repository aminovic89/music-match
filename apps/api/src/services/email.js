/**
 * Service d'envoi d'email — Brevo (API transactionnelle).
 * Sans BREVO_API_KEY (ex. en local), on logge le lien côté serveur au lieu
 * d'appeler l'API, pour permettre les tests sans compte Brevo.
 */

const axios = require('axios');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM;
const PASSWORD_RESET_TOKEN_TTL_MINUTES = process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES || '60';

// Durée de vie d'un match : défaut de matches.expires_at dans init.sql
const MATCH_EXPIRY_HOURS = 48;

// Les prénoms sont saisis par les utilisateurs : on les échappe avant de les
// insérer dans le HTML de l'email.
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

// Charte des emails : mêmes couleurs que l'app (apps/web/app/globals.css,
// bloc @theme). En hexadécimal uniquement : Outlook ignore rgb()/rgba().
const BRAND = {
  background: '#030712',
  surface: '#0f1320',
  line: '#232a3d',
  text: '#f5f6fa',
  muted: '#a3aac0',
  accent: '#7c3aed',
  accent2: '#c026d3',
  accentText: '#b69cff',
};
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/**
 * Gabarit commun des emails transactionnels. Pensé pour les clients mail :
 * - mise en page en tableaux + styles en ligne (Gmail/Outlook ignorent les
 *   feuilles de style et flexbox) ;
 * - chaque texte est posé sur un fond explicite (bgcolor + style) : la carte
 *   reste sombre et lisible même dans un client en thème clair ;
 * - aucune image : rien à bloquer ni à charger ;
 * - bouton "bulletproof" (cellule colorée + lien), dégradé en amélioration
 *   progressive (texte blanc ≥ 4.5:1 sur les deux extrémités), et lien en
 *   clair dessous si le bouton ne s'affiche pas.
 *
 * Tous les champs sont du texte brut : ils sont échappés ici.
 */
function renderEmail({ title, greeting, paragraphs, cta, note }) {
  const href = escapeHtml(cta.url);
  const text = `margin:0 0 16px 0;font-family:${FONT};font-size:16px;line-height:24px;color:${BRAND.text};`;
  const small = `margin:0;font-family:${FONT};font-size:14px;line-height:22px;color:${BRAND.muted};`;
  // Aperçu affiché par les clients mail à côté de l'objet.
  const preheader = escapeHtml([...paragraphs, note].join(' '));

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.background};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${BRAND.background};font-size:1px;line-height:1px;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BRAND.background}" style="background-color:${BRAND.background};">
<tr>
<td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
<tr>
<td align="left" style="padding:0 4px 20px 4px;font-family:${FONT};font-size:18px;line-height:28px;font-weight:600;color:${BRAND.text};">
<span style="color:${BRAND.accentText};">&#9835;</span>&nbsp;Music Match
</td>
</tr>
<tr>
<td align="left" bgcolor="${BRAND.surface}" style="background-color:${BRAND.surface};border:1px solid ${BRAND.line};border-radius:24px;padding:32px 24px;">
<h1 style="margin:0 0 16px 0;font-family:${FONT};font-size:24px;line-height:32px;font-weight:600;color:${BRAND.text};">${escapeHtml(title)}</h1>
<p style="${text}">${escapeHtml(greeting)}</p>
${paragraphs.map((p) => `<p style="${text}">${escapeHtml(p)}</p>`).join('\n')}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px 0;">
<tr>
<td align="center" bgcolor="${BRAND.accent}" style="background-color:${BRAND.accent};background-image:linear-gradient(90deg, ${BRAND.accent}, ${BRAND.accent2});border-radius:14px;">
<a href="${href}" style="display:inline-block;padding:14px 24px;font-family:${FONT};font-size:16px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:14px;">${escapeHtml(cta.label)}</a>
</td>
</tr>
</table>
<p style="${small}">${escapeHtml(note)}</p>
<p style="${small}padding-top:16px;">Le bouton ne fonctionne pas&nbsp;? Lien &agrave; copier dans le navigateur&nbsp;:<br>
<a href="${href}" style="color:${BRAND.accentText};text-decoration:underline;word-break:break-all;">${href}</a></p>
</td>
</tr>
<tr>
<td align="center" style="padding:20px 4px 0 4px;font-family:${FONT};font-size:12px;line-height:18px;color:${BRAND.muted};">
Music Match
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
}

// Version texte du même contenu : clients sans HTML, lecteurs d'écran,
// filtres anti-spam.
function renderText({ greeting, paragraphs, cta, note }) {
  return [greeting, ...paragraphs, `${cta.label} :\n${cta.url}`, note, 'Music Match'].join('\n\n');
}

// "Bonjour Imen," — ou "Bonjour," si le prénom manque (pas de "Bonjour ,").
function greetingFor(user) {
  return user.first_name ? `Bonjour ${user.first_name},` : 'Bonjour,';
}

async function sendEmail(user, subject, content) {
  if (!BREVO_API_KEY) {
    console.log(`[email] BREVO_API_KEY absente, email "${subject}" non envoyé à ${user.email} : ${content.cta.url}`);
    return;
  }

  try {
    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: 'Music Match', email: EMAIL_FROM },
        to: [{ email: user.email, name: user.first_name || undefined }],
        subject,
        htmlContent: renderEmail(content),
        textContent: renderText(content),
      },
      { headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json' } }
    );
  } catch (err) {
    console.error(`[email] Échec de l'envoi Brevo pour ${user.email} :`, err.response?.data || err.message);
  }
}

async function sendPasswordResetEmail(user, rawToken) {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${rawToken}`;

  await sendEmail(user, 'Réinitialisation de ton mot de passe Music Match', {
    title: 'Nouveau mot de passe',
    greeting: greetingFor(user),
    paragraphs: ['Tu as demandé la réinitialisation de ton mot de passe Music Match.'],
    cta: { label: 'Choisir un nouveau mot de passe', url: resetUrl },
    note: `Ce lien expire dans ${PASSWORD_RESET_TOKEN_TTL_MINUTES} minutes. Si tu n'es pas à l'origine de cette demande, ignore cet email.`,
  });
}

/**
 * Prévient `user` qu'il a un nouveau match avec `matchedUser`. Envoyé à la
 * personne qui avait liké en premier : l'autre voit le match immédiatement
 * dans l'app, en réponse à son like.
 */
async function sendMatchEmail(user, matchedUser) {
  const matchesUrl = `${FRONTEND_URL}/matches`;

  await sendEmail(user, `Nouveau match avec ${matchedUser.first_name} sur Music Match`, {
    title: 'Nouveau match',
    greeting: greetingFor(user),
    paragraphs: [`${matchedUser.first_name} a aussi liké ton profil : c'est un match !`],
    cta: { label: 'Voir le match et lui écrire', url: matchesUrl },
    note: `Ce match expire dans ${MATCH_EXPIRY_HOURS} h.`,
  });
}

module.exports = { sendPasswordResetEmail, sendMatchEmail };
