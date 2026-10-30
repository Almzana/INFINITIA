-- Up Migration
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE tasks (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description    text        CHECK (char_length(description) <= 2000),
  assignee_email text        NOT NULL CHECK (char_length(assignee_email) <= 254),
  due_date       date,
  priority       text        NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status         text        NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'done')),
  project_id     text        CHECK (char_length(project_id) <= 64),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Dashboard lookup: one person's tasks, filtered by status, ordered by due date
CREATE INDEX tasks_assignee_status_due_idx ON tasks (assignee_email, status, due_date);

-- Down Migration
DROP TABLE IF EXISTS tasks;
