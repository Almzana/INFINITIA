-- Up Migration
CREATE TABLE announcements (
  id             text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title          text        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  body           text        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 10000),
  category       text        NOT NULL DEFAULT 'ทั่วไป' CHECK (category IN ('ทั่วไป', 'HR', 'IT', 'กิจกรรม')),
  pinned         boolean     NOT NULL DEFAULT false,
  author_user_id uuid        REFERENCES users (id) ON DELETE SET NULL,
  -- Shown as the source (e.g. "ฝ่ายบุคคล"); kept even if the author's account is removed
  author_name    text        NOT NULL CHECK (char_length(author_name) BETWEEN 1 AND 120),
  date           date        NOT NULL DEFAULT current_date,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- The feed is always read pinned-first, newest-first
CREATE INDEX announcements_feed_idx ON announcements (pinned DESC, date DESC, created_at DESC);

-- Down Migration
DROP TABLE IF EXISTS announcements;
