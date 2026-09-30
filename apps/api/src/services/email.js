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

async function sendEmail(user, subject, htmlContent, logDetail) {
  if (!BREVO_API_KEY) {
    console.log(`[email] BREVO_API_KEY absente, email "${subject}" non envoyé à ${user.email} : ${logDetail}`);
    return;
  }

  try {
    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: 'Music Match', email: EMAIL_FROM },
        to: [{ email: user.email, name: user.first_name || undefined }],
        subject,
        htmlContent,
      },
      { headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json' } }
    );
  } catch (err) {
    console.error(`[email] Échec de l'envoi Brevo pour ${user.email} :`, err.response?.data || err.message);
  }
}

async function sendPasswordResetEmail(user, rawToken) {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${rawToken}`;

  await sendEmail(
    user,
    'Réinitialisation de votre mot de passe Music Match',
    `
      <p>Bonjour ${escapeHtml(user.first_name)},</p>
      <p>Vous avez demandé la réinitialisation de votre mot de passe Music Match.</p>
      <p><a href="${resetUrl}">Choisir un nouveau mot de passe</a></p>
      <p>Ce lien expire dans ${PASSWORD_RESET_TOKEN_TTL_MINUTES} minutes. Si vous n'êtes pas
      à l'origine de cette demande, ignorez cet email.</p>
    `,
    resetUrl
  );
}

/**
 * Prévient `user` qu'il a un nouveau match avec `matchedUser`. Envoyé à la
 * personne qui avait liké en premier : l'autre voit le match immédiatement
 * dans l'app, en réponse à son like.
 */
async function sendMatchEmail(user, matchedUser) {
  const matchesUrl = `${FRONTEND_URL}/matches`;
  const name = escapeHtml(matchedUser.first_name);

  await sendEmail(
    user,
    `Nouveau match avec ${matchedUser.first_name} sur Music Match`,
    `
      <p>Bonjour ${escapeHtml(user.first_name)},</p>
      <p>${name} a aussi liké ton profil : c'est un match !</p>
      <p><a href="${matchesUrl}">Voir le match et lui écrire</a></p>
      <p>Ce match expire dans ${MATCH_EXPIRY_HOURS} h.</p>
    `,
    matchesUrl
  );
}

module.exports = { sendPasswordResetEmail, sendMatchEmail };
