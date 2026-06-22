const multer = require('multer');

/* eslint-disable no-unused-vars */
function errorHandler(err, req, res, next) {
  console.error(err);

  // Violation contrainte unique PostgreSQL
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Cette ressource existe déjà' });
  }

  // Erreurs Multer (upload fichier)
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Fichier trop volumineux (max 5 MB)' });
    }
    return res.status(400).json({ error: err.message });
  }

  if (err.message === 'Seules les images sont acceptées') {
    return res.status(400).json({ error: err.message });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Erreur interne du serveur',
  });
}

module.exports = { errorHandler };
