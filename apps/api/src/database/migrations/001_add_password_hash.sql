-- Migration 001 — Sprint 1 : ajout de l'authentification par mot de passe
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
