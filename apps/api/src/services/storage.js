const { put, del } = require('@vercel/blob');

const PHOTO_PREFIX = 'profile-photos/';

/**
 * Upload une photo de profil et retourne son URL publique.
 * Chaque envoi a sa propre URL (suffixe aléatoire) : en réécrivant la même
 * URL, les clients et le CDN continuaient d'afficher l'ancienne photo en cache.
 * @param {string} userId
 * @param {Buffer} buffer
 * @param {string} mimeType  ex: "image/jpeg"
 */
async function uploadProfilePhoto(userId, buffer, mimeType) {
  const extension = (mimeType.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
  const pathname = `${PHOTO_PREFIX}user-${userId}.${extension}`;

  const blob = await put(pathname, buffer, {
    access: 'public',
    contentType: mimeType,
    addRandomSuffix: true,
  });

  return blob.url;
}

/**
 * Supprime une ancienne photo de profil. Ne touche qu'aux photos de notre
 * store, et n'échoue jamais : un fichier orphelin ne doit pas casser l'envoi.
 * @param {string|null} url
 */
async function deleteProfilePhoto(url) {
  try {
    const { hostname, pathname } = new URL(url);
    if (!hostname.endsWith('.blob.vercel-storage.com') || !pathname.startsWith(`/${PHOTO_PREFIX}`)) return;
    await del(url);
  } catch (err) {
    console.warn('Suppression de l\'ancienne photo impossible :', err.message);
  }
}

module.exports = { uploadProfilePhoto, deleteProfilePhoto };
