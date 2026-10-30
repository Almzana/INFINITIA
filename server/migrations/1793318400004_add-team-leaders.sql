-- Up Migration

-- Team structure: an employee's direct leader. Anyone with at least one report is a Leader,
-- whatever their job title (e.g. a Developer who leads juniors).
ALTER TABLE employees
  ADD COLUMN manager_id text REFERENCES employees (id) ON DELETE SET NULL,
  ADD CONSTRAINT employees_not_own_manager CHECK (manager_id <> id);
CREATE INDEX employees_manager_idx ON employees (manager_id);

-- Who assigned a task (null = the assignee created it for themselves)
ALTER TABLE tasks
  ADD COLUMN assigned_by_user_id uuid REFERENCES users (id) ON DELETE SET NULL,
  ADD COLUMN assigned_by_name text CHECK (char_length(assigned_by_name) <= 120);
CREATE INDEX tasks_assigned_by_idx ON tasks (assigned_by_user_id);

-- Down Migration
DROP INDEX IF EXISTS tasks_assigned_by_idx;
ALTER TABLE tasks DROP COLUMN IF EXISTS assigned_by_name, DROP COLUMN IF EXISTS assigned_by_user_id;
DROP INDEX IF EXISTS employees_manager_idx;
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_not_own_manager, DROP COLUMN IF EXISTS manager_id;
