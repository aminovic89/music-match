const { put } = require('@vercel/blob');

/**
 * Upload une photo de profil et retourne son URL publique.
 * @param {string} userId
 * @param {Buffer} buffer
 * @param {string} mimeType  ex: "image/jpeg"
 */
async function uploadProfilePhoto(userId, buffer, mimeType) {
  const extension = (mimeType.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
  const pathname = `profile-photos/user-${userId}.${extension}`;

  const blob = await put(pathname, buffer, {
    access: 'public',
    contentType: mimeType,
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  return blob.url;
}

module.exports = { uploadProfilePhoto };
