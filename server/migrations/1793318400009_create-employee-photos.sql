-- Up Migration

-- Profile photos live in the database so a pg_dump backup carries them too.
-- The browser resizes to ~512px before upload, so rows stay small (typically 20–80 KB).
CREATE TABLE employee_photos (
  employee_id  text        PRIMARY KEY REFERENCES employees (id) ON DELETE CASCADE,
  content_type text        NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
  data         bytea       NOT NULL CHECK (octet_length(data) BETWEEN 1 AND 2097152),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Down Migration
DROP TABLE IF EXISTS employee_photos;
