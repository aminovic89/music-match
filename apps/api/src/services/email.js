/**
 * Service d'envoi d'email — stub.
 * Aucun fournisseur n'est configuré pour l'instant : on logge le lien côté
 * serveur pour permettre les tests. Point d'extension unique pour brancher
 * un vrai provider (SendGrid, Resend, Azure Communication Services...) plus
 * tard sans toucher au reste du code.
 */

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

async function sendPasswordResetEmail(user, rawToken) {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${rawToken}`;
  console.log(`[email] Reset mot de passe pour ${user.email} : ${resetUrl}`);
}

module.exports = { sendPasswordResetEmail };
