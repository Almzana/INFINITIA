-- Up Migration
CREATE TABLE leave_requests (
  id                 text        PRIMARY KEY DEFAULT 'LV' || upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  employee_id        text        NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  type               text        NOT NULL CHECK (type IN ('sick', 'vacation', 'personal', 'maternity')),
  from_date          date        NOT NULL,
  to_date            date        NOT NULL CHECK (to_date >= from_date),
  -- Working days (weekends excluded), computed by the API
  days               integer     NOT NULL CHECK (days BETWEEN 1 AND 366),
  reason             text        NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 1000),
  status             text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at         date        NOT NULL DEFAULT current_date,
  decided_by_user_id uuid        REFERENCES users (id) ON DELETE SET NULL,
  decided_at         timestamptz
);
CREATE INDEX leave_requests_employee_idx ON leave_requests (employee_id, from_date);
CREATE INDEX leave_requests_status_idx ON leave_requests (status);

CREATE TABLE time_entries (
  id          text         PRIMARY KEY DEFAULT gen_random_uuid()::text,
  employee_id text         NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  project_id  text         NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  phase       text         NOT NULL CHECK (phase IN ('concept', 'schematic', 'design-dev', 'construction-docs', 'permit', 'construction', 'handover')),
  date        date         NOT NULL,
  hours       numeric(4,1) NOT NULL CHECK (hours > 0 AND hours <= 24),
  note        text         CHECK (char_length(note) <= 500)
);
-- Week editor reads one person's week; project costing sums by project
CREATE INDEX time_entries_employee_date_idx ON time_entries (employee_id, date);
CREATE INDEX time_entries_project_idx ON time_entries (project_id);

-- Down Migration
DROP TABLE IF EXISTS time_entries;
DROP TABLE IF EXISTS leave_requests;
