-- Up Migration

-- Days per year for each leave type. `enforce` = requests beyond the quota are refused
-- (sick leave is only flagged: people do get sick past their quota).
CREATE TABLE leave_policies (
  type          text    PRIMARY KEY CHECK (type IN ('sick', 'vacation', 'personal', 'maternity')),
  days_per_year integer NOT NULL CHECK (days_per_year BETWEEN 0 AND 366),
  enforce       boolean NOT NULL DEFAULT true
);
INSERT INTO leave_policies (type, days_per_year, enforce) VALUES
  ('vacation', 15, true),
  ('sick', 30, false),
  ('personal', 6, true),
  ('maternity', 98, true);

-- Per-person exceptions (e.g. more vacation with seniority); missing row = the policy default
CREATE TABLE leave_quotas (
  employee_id text    NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  year        integer NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  type        text    NOT NULL REFERENCES leave_policies (type),
  days        integer NOT NULL CHECK (days BETWEEN 0 AND 366),
  PRIMARY KEY (employee_id, year, type)
);

-- Company holidays: not counted as working days in leave requests
CREATE TABLE holidays (
  date date PRIMARY KEY,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120)
);
-- Fixed-date Thai public holidays. Lunar holidays (Makha / Visakha / Asarnha Bucha, Khao Phansa) and
-- substitution days change every year: HR adds them from the official announcement.
INSERT INTO holidays (date, name)
SELECT make_date(y, m, d), n
  FROM generate_series(2026, 2027) AS y,
       (VALUES (1, 1, 'วันขึ้นปีใหม่'), (4, 6, 'วันจักรี'), (4, 13, 'วันสงกรานต์'), (4, 14, 'วันสงกรานต์'), (4, 15, 'วันสงกรานต์'),
               (5, 1, 'วันแรงงานแห่งชาติ'), (5, 4, 'วันฉัตรมงคล'), (6, 3, 'วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี'),
               (7, 28, 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว'), (8, 12, 'วันแม่แห่งชาติ'),
               (10, 13, 'วันนวมินทรมหาราช'), (10, 23, 'วันปิยมหาราช'), (12, 5, 'วันพ่อแห่งชาติ'),
               (12, 10, 'วันรัฐธรรมนูญ'), (12, 31, 'วันสิ้นปี')) AS h(m, d, n)
ON CONFLICT DO NOTHING;

-- Balance = approved + pending days per person, type and year
CREATE INDEX leave_requests_balance_idx ON leave_requests (employee_id, type, from_date) WHERE status <> 'rejected';

-- Down Migration

DROP INDEX IF EXISTS leave_requests_balance_idx;
DROP TABLE IF EXISTS holidays;
DROP TABLE IF EXISTS leave_quotas;
DROP TABLE IF EXISTS leave_policies;
