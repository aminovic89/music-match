-- Music Match — Schema initial
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE intent_type AS ENUM ('romantic', 'friendship');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
CREATE TYPE source_type AS ENUM ('spotify', 'deezer', 'soundcloud', 'manual');
CREATE TYPE match_status AS ENUM ('pending', 'active', 'expired', 'blocked');
CREATE TYPE oauth_provider AS ENUM ('spotify', 'deezer', 'soundcloud');

-- USERS (password_hash inclus dès le départ)
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           VARCHAR(255) UNIQUE,
  phone           VARCHAR(20) UNIQUE,
  password_hash   VARCHAR(255),
  first_name      VARCHAR(100) NOT NULL,
  avatar_url      TEXT,
  age             INT CHECK (age >= 18 AND age <= 99),
  city            VARCHAR(100),
  intent          intent_type NOT NULL DEFAULT 'romantic',
  gender          gender_type,
  looking_for     gender_type,
  is_verified     BOOLEAN DEFAULT FALSE,
  is_premium      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- MUSIC_PROFILES
CREATE TABLE music_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  top_genres      TEXT[] DEFAULT '{}',
  top_artists     TEXT[] DEFAULT '{}',
  avg_energy      FLOAT CHECK (avg_energy >= 0 AND avg_energy <= 1),
  avg_valence     FLOAT CHECK (avg_valence >= 0 AND avg_valence <= 1),
  avg_tempo       FLOAT,
  top_moods       TEXT[] DEFAULT '{}',
  last_synced_at  TIMESTAMPTZ DEFAULT NOW()
);

-- USER_TRACKS
CREATE TABLE user_tracks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id        VARCHAR(255) NOT NULL,
  track_name      VARCHAR(255) NOT NULL,
  artist_name     VARCHAR(255),
  genre           VARCHAR(100),
  energy          FLOAT,
  valence         FLOAT,
  tempo           FLOAT,
  source          source_type NOT NULL DEFAULT 'manual',
  order_index     INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, track_id)
);

-- OAUTH_TOKENS
CREATE TABLE oauth_tokens (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider        oauth_provider NOT NULL,
  access_token    TEXT NOT NULL,
  refresh_token   TEXT,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- LIKES
CREATE TABLE likes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id)
);

-- MATCHES
CREATE TABLE matches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score           FLOAT NOT NULL CHECK (score >= 0 AND score <= 1),
  status          match_status DEFAULT 'active',
  matched_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours'),
  CHECK (user_a_id < user_b_id)
);

-- CONVERSATIONS
CREATE TABLE conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id        UUID UNIQUE NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- MESSAGES
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  sent_at         TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  is_read         BOOLEAN DEFAULT FALSE
);

-- DAILY_LIMITS
CREATE TABLE daily_limits (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  matches_count   INT DEFAULT 0,
  messages_count  INT DEFAULT 0,
  UNIQUE(user_id, date)
);

-- Indexes
CREATE INDEX idx_users_intent      ON users(intent);
CREATE INDEX idx_users_city        ON users(city);
CREATE INDEX idx_matches_user_a    ON matches(user_a_id);
CREATE INDEX idx_matches_user_b    ON matches(user_b_id);
CREATE INDEX idx_matches_status    ON matches(status);
CREATE INDEX idx_messages_conv     ON messages(conversation_id);
CREATE INDEX idx_messages_expires  ON messages(expires_at);
CREATE INDEX idx_daily_limits_date ON daily_limits(user_id, date);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
