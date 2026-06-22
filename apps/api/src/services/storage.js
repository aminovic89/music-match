const { BlobServiceClient } = require('@azure/storage-blob');

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER || 'profile-photos';
const publicBaseUrl = process.env.AZURE_STORAGE_PUBLIC_URL
  || `https://musicmatchdev.blob.core.windows.net`;

let containerClient = null;

function getContainerClient() {
  if (!containerClient) {
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    containerClient = blobServiceClient.getContainerClient(containerName);
  }
  return containerClient;
}

/**
 * Upload une photo de profil et retourne son URL publique.
 * @param {string} userId
 * @param {Buffer} buffer
 * @param {string} mimeType  ex: "image/jpeg"
 */
async function uploadProfilePhoto(userId, buffer, mimeType) {
  const client = getContainerClient();
  await client.createIfNotExists({ access: 'blob' });

  const extension = (mimeType.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
  const blobName = `user-${userId}.${extension}`;

  const blockBlobClient = client.getBlockBlobClient(blobName);
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: mimeType },
    overwrite: true,
  });

  return `${publicBaseUrl}/${containerName}/${blobName}`;
}

module.exports = { uploadProfilePhoto };
