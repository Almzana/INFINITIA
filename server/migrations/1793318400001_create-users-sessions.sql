-- Up Migration
CREATE TABLE users (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text        NOT NULL UNIQUE CHECK (email = lower(email) AND char_length(email) <= 254),
  name          text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  role          text        NOT NULL CHECK (role IN ('executive', 'hr', 'staff')),
  department    text        NOT NULL DEFAULT '' CHECK (char_length(department) <= 120),
  password_hash text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Opaque session tokens; only the SHA-256 of the token is stored.
CREATE TABLE sessions (
  token_hash text        PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

-- Down Migration
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;
