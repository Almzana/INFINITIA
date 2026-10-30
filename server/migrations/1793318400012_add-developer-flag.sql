-- Up Migration

-- Developer Console access (/dev, /api/dev/*) is separate from the business roles: a developer
-- keeps the least-privileged role (usually staff) and only gains the console.
ALTER TABLE users ADD COLUMN is_developer boolean NOT NULL DEFAULT false;
CREATE INDEX users_developer_idx ON users (id) WHERE is_developer;

-- Down Migration

DROP INDEX IF EXISTS users_developer_idx;
ALTER TABLE users DROP COLUMN IF EXISTS is_developer;
