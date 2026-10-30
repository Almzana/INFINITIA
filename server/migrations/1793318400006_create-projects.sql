-- Up Migration
CREATE TABLE projects (
  id                 text        PRIMARY KEY CHECK (id ~ '^[A-Z]{2}[0-9]{3,6}$'),
  name               text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  type               text        NOT NULL CHECK (type IN ('design-build', 'architecture', 'interior', 'construction')),
  location           text        NOT NULL DEFAULT '-' CHECK (char_length(location) <= 120),
  area_sqm           integer     NOT NULL DEFAULT 0 CHECK (area_sqm >= 0),
  -- THB, whole baht
  value              bigint      NOT NULL CHECK (value > 0),
  cost               bigint      NOT NULL CHECK (cost >= 0),
  start_date         date        NOT NULL,
  end_date           date        NOT NULL CHECK (end_date > start_date),
  manager            text        NOT NULL CHECK (char_length(manager) BETWEEN 1 AND 120),
  prior_hours        integer     NOT NULL DEFAULT 0 CHECK (prior_hours >= 0),
  created_by_user_id uuid        REFERENCES users (id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE project_phases (
  project_id text    NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  key        text    NOT NULL CHECK (key IN ('concept', 'schematic', 'design-dev', 'construction-docs', 'permit', 'construction', 'handover')),
  position   integer NOT NULL,
  start_date date    NOT NULL,
  end_date   date    NOT NULL,
  progress   integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  PRIMARY KEY (project_id, key)
);

CREATE TABLE project_change_orders (
  id           text   PRIMARY KEY,
  project_id   text   NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  title        text   NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description  text   NOT NULL DEFAULT '' CHECK (char_length(description) <= 2000),
  amount       bigint NOT NULL,
  cost_impact  bigint NOT NULL DEFAULT 0,
  days_impact  integer NOT NULL DEFAULT 0,
  status       text   NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by text   NOT NULL CHECK (requested_by IN ('ลูกค้า', 'บริษัท')),
  date         date   NOT NULL DEFAULT current_date,
  decided_date date
);
CREATE INDEX project_change_orders_project_idx ON project_change_orders (project_id);

CREATE TABLE project_installments (
  id              text    PRIMARY KEY,
  project_id      text    NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  position        integer NOT NULL,
  title           text    NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  amount          bigint  NOT NULL,
  -- Phase that triggers billing; null = warranty retention released after handover
  phase           text,
  at_progress     integer NOT NULL DEFAULT 0 CHECK (at_progress BETWEEN 0 AND 100),
  due_date        date    NOT NULL,
  status          text    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'invoiced', 'paid')),
  paid_date       date,
  change_order_id text    REFERENCES project_change_orders (id) ON DELETE SET NULL
);
CREATE INDEX project_installments_project_idx ON project_installments (project_id);

-- Down Migration
DROP TABLE IF EXISTS project_installments;
DROP TABLE IF EXISTS project_change_orders;
DROP TABLE IF EXISTS project_phases;
DROP TABLE IF EXISTS projects;
