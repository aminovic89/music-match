-- Migration 002 — Sprint 3 : empêche les matchs en double pour une même paire
-- (protège contre une course entre deux appels concurrents de POST /api/matching/like)
ALTER TABLE matches ADD CONSTRAINT matches_user_pair_unique UNIQUE (user_a_id, user_b_id);
