-- Up Migration

-- Two-step approval: a pending request first waits for the requester's Leader (stage 'leader'),
-- then for HR (stage 'hr'). Requests without a Leader with an account start at 'hr'.
-- `approver_employee_id` is the Leader at the time of the request (a later team change does not move it).
ALTER TABLE leave_requests
  ADD COLUMN stage text CHECK (stage IN ('leader', 'hr')),
  ADD COLUMN approver_employee_id text REFERENCES employees (id) ON DELETE SET NULL,
  ADD COLUMN leader_decided_by_user_id uuid REFERENCES users (id) ON DELETE SET NULL,
  ADD COLUMN leader_decided_at timestamptz;

-- Requests already pending wait for HR, as before (must run before the constraint below)
UPDATE leave_requests SET stage = 'hr' WHERE status = 'pending';

ALTER TABLE leave_requests
  ADD CONSTRAINT leave_requests_stage_only_pending CHECK ((status = 'pending') = (stage IS NOT NULL));

-- A Leader's queue
CREATE INDEX leave_requests_approver_idx ON leave_requests (approver_employee_id) WHERE status = 'pending';

-- Down Migration

DROP INDEX IF EXISTS leave_requests_approver_idx;
ALTER TABLE leave_requests
  DROP CONSTRAINT IF EXISTS leave_requests_stage_only_pending,
  DROP COLUMN IF EXISTS leader_decided_at,
  DROP COLUMN IF EXISTS leader_decided_by_user_id,
  DROP COLUMN IF EXISTS approver_employee_id,
  DROP COLUMN IF EXISTS stage;
