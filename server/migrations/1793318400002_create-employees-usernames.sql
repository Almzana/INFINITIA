-- Up Migration

-- Login by username as well as email. Existing accounts get the local part of their email, cleaned to
-- the allowed characters (a-z 0-9 . _ -), padded to 2 and cut to 28 characters; duplicates get a short id hash
-- (all accounts have a valid, unique username before the constraints below are added).
ALTER TABLE users ADD COLUMN username text;
WITH base AS (
  SELECT id, rpad(left(regexp_replace(split_part(email, '@', 1), '[^a-z0-9._-]', '', 'g'), 28), 2, 'x') AS b, created_at
    FROM users
), numbered AS (
  SELECT id, b, row_number() OVER (PARTITION BY b ORDER BY created_at, id) AS n FROM base
)
-- Later duplicates get a short hash of their id (not -2, -3: that could equal another user's own name)
UPDATE users u SET username = CASE WHEN n.n = 1 THEN n.b ELSE left(n.b, 23) || '-' || substr(md5(n.id::text), 1, 8) END
  FROM numbered n WHERE n.id = u.id;
ALTER TABLE users
  ALTER COLUMN username SET NOT NULL,
  ADD CONSTRAINT users_username_format CHECK (username ~ '^[a-z0-9._-]{2,32}$'),
  ADD CONSTRAINT users_username_key UNIQUE (username);

CREATE TABLE employees (
  -- text, not uuid: imported records keep their legacy ids ("1".."64") that leaves/timesheets reference
  id              text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code            text        NOT NULL UNIQUE CHECK (char_length(code) BETWEEN 1 AND 20),
  first_name      text        NOT NULL CHECK (char_length(first_name) BETWEEN 1 AND 80),
  last_name       text        NOT NULL CHECK (char_length(last_name) BETWEEN 1 AND 80),
  nickname        text        NOT NULL DEFAULT '' CHECK (char_length(nickname) <= 40),
  email           text        NOT NULL UNIQUE CHECK (email = lower(email) AND char_length(email) <= 254),
  phone           text        NOT NULL DEFAULT '' CHECK (char_length(phone) <= 30),
  department      text        NOT NULL CHECK (char_length(department) BETWEEN 1 AND 120),
  position        text        NOT NULL CHECK (char_length(position) BETWEEN 1 AND 120),
  status          text        NOT NULL DEFAULT 'probation' CHECK (status IN ('active', 'probation', 'leave', 'resigned')),
  start_date      date        NOT NULL,
  salary          integer     NOT NULL DEFAULT 0 CHECK (salary >= 0),
  -- Personal details (visible to HR / executives only)
  birth_date      date,
  address         text        CHECK (char_length(address) <= 500),
  emergency_name  text        CHECK (char_length(emergency_name) <= 120),
  emergency_phone text        CHECK (char_length(emergency_phone) <= 30),
  -- Login account; deleting the employee deletes the account (handled in the API transaction)
  user_id         uuid        UNIQUE REFERENCES users (id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX employees_department_idx ON employees (department);
CREATE INDEX employees_status_idx ON employees (status);

-- Down Migration
DROP TABLE IF EXISTS employees;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_format;
ALTER TABLE users DROP COLUMN IF EXISTS username;
