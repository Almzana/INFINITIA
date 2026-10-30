-- Up Migration

-- Set when HR creates an account or sets a password for someone: they must choose their own at next login
ALTER TABLE users ADD COLUMN must_change_password boolean NOT NULL DEFAULT false;

-- "Forgot password" links: only the SHA-256 of the token is stored; single use, short-lived
CREATE TABLE password_resets (
  token_hash text        PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX password_resets_user_idx ON password_resets (user_id);

-- Who did what, when. Append-only from the application's point of view (no update/delete paths).
CREATE TABLE audit_log (
  id            bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at            timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid        REFERENCES users (id) ON DELETE SET NULL,
  -- Kept as text so the trail survives deleting the account
  actor_name    text        NOT NULL,
  action        text        NOT NULL CHECK (char_length(action) BETWEEN 1 AND 64),
  entity        text        NOT NULL CHECK (char_length(entity) BETWEEN 1 AND 64),
  entity_id     text,
  details       jsonb       NOT NULL DEFAULT '{}',
  ip            text
);
-- The viewer lists newest first and filters by entity / actor
CREATE INDEX audit_log_at_idx ON audit_log (at DESC);
CREATE INDEX audit_log_entity_idx ON audit_log (entity, entity_id);
CREATE INDEX audit_log_actor_idx ON audit_log (actor_user_id);

-- Down Migration
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS password_resets;
ALTER TABLE users DROP COLUMN IF EXISTS must_change_password;
