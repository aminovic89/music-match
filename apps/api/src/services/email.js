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

async function sendPasswordResetEmail(user, rawToken) {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${rawToken}`;

  if (!BREVO_API_KEY) {
    console.log(`[email] BREVO_API_KEY absente, lien loggé pour ${user.email} : ${resetUrl}`);
    return;
  }

  try {
    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { name: 'Music Match', email: EMAIL_FROM },
        to: [{ email: user.email, name: user.first_name || undefined }],
        subject: 'Réinitialisation de votre mot de passe Music Match',
        htmlContent: `
          <p>Bonjour ${user.first_name || ''},</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe Music Match.</p>
          <p><a href="${resetUrl}">Choisir un nouveau mot de passe</a></p>
          <p>Ce lien expire dans ${PASSWORD_RESET_TOKEN_TTL_MINUTES} minutes. Si vous n'êtes pas
          à l'origine de cette demande, ignorez cet email.</p>
        `,
      },
      { headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json' } }
    );
  } catch (err) {
    console.error(`[email] Échec de l'envoi Brevo pour ${user.email} :`, err.response?.data || err.message);
  }
}

module.exports = { sendPasswordResetEmail };
