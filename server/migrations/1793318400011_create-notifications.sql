-- Up Migration

-- Per-user notifications. Text is NOT stored: the client renders `type` + `params` in the viewer's
-- language. `link` is an in-app path (e.g. /leave?view=LV1234) opened when the item is clicked.
CREATE TABLE notifications (
  id         bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type       text        NOT NULL CHECK (char_length(type) BETWEEN 1 AND 64),
  params     jsonb       NOT NULL DEFAULT '{}',
  link       text        CHECK (link ~ '^/[A-Za-z0-9/_?=&.%-]*$'),
  actor_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at    timestamptz
);

-- The bell reads a user's newest items and counts the unread ones
CREATE INDEX notifications_user_created_idx ON notifications (user_id, created_at DESC);
CREATE INDEX notifications_user_unread_idx ON notifications (user_id) WHERE read_at IS NULL;

-- Down Migration
DROP TABLE IF EXISTS notifications;
