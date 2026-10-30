-- Up Migration

-- Business dates (current_date: paid dates, leave created_at, "today" checks) follow Bangkok, not UTC.
-- Applies to new connections of this database.
DO $$ BEGIN EXECUTE format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'Asia/Bangkok'); END $$;

-- Idle timeout: a session unused for a while expires even before its absolute expiry
ALTER TABLE sessions ADD COLUMN last_used_at timestamptz NOT NULL DEFAULT now();

-- Down Migration
ALTER TABLE sessions DROP COLUMN IF EXISTS last_used_at;
DO $$ BEGIN EXECUTE format('ALTER DATABASE %I RESET timezone', current_database()); END $$;
