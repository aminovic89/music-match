/**
 * Service d'envoi d'email — Gmail SMTP.
 * Sans GMAIL_USER/GMAIL_APP_PASSWORD (ex. en local), on logge le lien côté
 * serveur au lieu d'envoyer, pour permettre les tests sans compte Gmail.
 */

const nodemailer = require('nodemailer');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const PASSWORD_RESET_TOKEN_TTL_MINUTES = process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES || '60';

const transporter = GMAIL_USER && GMAIL_APP_PASSWORD
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    })
  : null;

async function sendPasswordResetEmail(user, rawToken) {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${rawToken}`;

  if (!transporter) {
    console.log(`[email] GMAIL_USER/GMAIL_APP_PASSWORD absents, lien loggé pour ${user.email} : ${resetUrl}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: `Music Match <${GMAIL_USER}>`,
      to: user.email,
      subject: 'Réinitialisation de votre mot de passe Music Match',
      html: `
        <p>Bonjour ${user.first_name || ''},</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe Music Match.</p>
        <p><a href="${resetUrl}">Choisir un nouveau mot de passe</a></p>
        <p>Ce lien expire dans ${PASSWORD_RESET_TOKEN_TTL_MINUTES} minutes. Si vous n'êtes pas
        à l'origine de cette demande, ignorez cet email.</p>
      `,
    });
  } catch (err) {
    console.error(`[email] Échec de l'envoi Gmail pour ${user.email} :`, err.message);
  }
}

module.exports = { sendPasswordResetEmail };
