-- Up Migration

-- Who works on which project: staff may only log timesheet hours to projects they belong to.
-- Executives and the Leader who created a project manage its members.
CREATE TABLE project_members (
  project_id  text        NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  employee_id text        NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  added_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, employee_id)
);
-- "My projects" (timesheet) looks up by employee
CREATE INDEX project_members_employee_idx ON project_members (employee_id);

-- Existing data stays valid: everyone who already logged hours on a project is a member of it,
-- and so is the creator of each project
INSERT INTO project_members (project_id, employee_id)
SELECT DISTINCT project_id, employee_id FROM time_entries
ON CONFLICT DO NOTHING;
INSERT INTO project_members (project_id, employee_id)
SELECT p.id, e.id FROM projects p JOIN employees e ON e.user_id = p.created_by_user_id
ON CONFLICT DO NOTHING;

-- Down Migration

DROP TABLE IF EXISTS project_members;
