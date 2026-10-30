-- Up Migration

-- Foreign keys that deletes of users / employees / change orders must look up (ON DELETE SET NULL
-- or CASCADE scans the referencing table without an index), and filters used by the repositories.
CREATE INDEX announcements_author_idx ON announcements (author_user_id);
CREATE INDEX projects_created_by_idx ON projects (created_by_user_id);
CREATE INDEX tasks_project_idx ON tasks (project_id);
CREATE INDEX project_installments_change_order_idx ON project_installments (change_order_id);
CREATE INDEX leave_requests_decided_by_idx ON leave_requests (decided_by_user_id);
CREATE INDEX leave_requests_leader_decided_by_idx ON leave_requests (leader_decided_by_user_id);
-- The partial (pending-only) approver index serves the Leader queue; employee deletes need all rows
CREATE INDEX leave_requests_approver_all_idx ON leave_requests (approver_employee_id);
-- Notification retention deletes by age
CREATE INDEX notifications_created_idx ON notifications (created_at);

-- One-off markers, e.g. that the demo seed already ran (so data deleted later is not re-created)
CREATE TABLE app_meta (
  key        text        PRIMARY KEY CHECK (char_length(key) <= 64),
  value      text        NOT NULL DEFAULT '' CHECK (char_length(value) <= 500),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Fixed-date Thai public holidays for the following years too (lunar ones are still added by HR)
INSERT INTO holidays (date, name)
SELECT make_date(y, m, d), n
  FROM generate_series(2028, 2030) AS y,
       (VALUES (1, 1, 'วันขึ้นปีใหม่'), (4, 6, 'วันจักรี'), (4, 13, 'วันสงกรานต์'), (4, 14, 'วันสงกรานต์'), (4, 15, 'วันสงกรานต์'),
               (5, 1, 'วันแรงงานแห่งชาติ'), (5, 4, 'วันฉัตรมงคล'), (6, 3, 'วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี'),
               (7, 28, 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว'), (8, 12, 'วันแม่แห่งชาติ'),
               (10, 13, 'วันนวมินทรมหาราช'), (10, 23, 'วันปิยมหาราช'), (12, 5, 'วันพ่อแห่งชาติ'),
               (12, 10, 'วันรัฐธรรมนูญ'), (12, 31, 'วันสิ้นปี')) AS h(m, d, n)
ON CONFLICT DO NOTHING;

-- Down Migration

DELETE FROM holidays WHERE date >= '2028-01-01' AND date < '2031-01-01';
DROP TABLE IF EXISTS app_meta;
DROP INDEX IF EXISTS notifications_created_idx;
DROP INDEX IF EXISTS leave_requests_approver_all_idx;
DROP INDEX IF EXISTS leave_requests_leader_decided_by_idx;
DROP INDEX IF EXISTS leave_requests_decided_by_idx;
DROP INDEX IF EXISTS project_installments_change_order_idx;
DROP INDEX IF EXISTS tasks_project_idx;
DROP INDEX IF EXISTS projects_created_by_idx;
DROP INDEX IF EXISTS announcements_author_idx;
