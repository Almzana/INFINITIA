-- Up Migration
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE rooms (
  id         text        PRIMARY KEY CHECK (id ~ '^[A-Za-z0-9-]{1,32}$'),
  name       text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  capacity   integer     NOT NULL CHECK (capacity > 0),
  floor      integer     NOT NULL,
  facilities text[]      NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE meetings (
  id                text        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  room_id           text        NOT NULL REFERENCES rooms (id) ON DELETE RESTRICT,
  title             text        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  agenda            text        CHECK (char_length(agenda) <= 4000),
  minutes           text        CHECK (char_length(minutes) <= 20000),
  date              date        NOT NULL,
  start_time        time        NOT NULL,
  end_time          time        NOT NULL,
  -- Who booked it; null for imported/legacy bookings (then organizer_name is shown)
  organizer_user_id uuid        REFERENCES users (id) ON DELETE SET NULL,
  organizer_name    text        NOT NULL CHECK (char_length(organizer_name) BETWEEN 1 AND 120),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time),
  -- The database itself refuses double bookings of a room, even under concurrent requests
  CONSTRAINT meetings_no_overlap EXCLUDE USING gist (
    room_id WITH =,
    tsrange(date + start_time, date + end_time) WITH &&
  )
);

CREATE INDEX meetings_date_idx ON meetings (date);
CREATE INDEX meetings_organizer_idx ON meetings (organizer_user_id);

CREATE TABLE meeting_attendees (
  meeting_id  text NOT NULL REFERENCES meetings (id) ON DELETE CASCADE,
  employee_id text NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  PRIMARY KEY (meeting_id, employee_id)
);

-- "Meetings I attend" lookups go employee -> meetings
CREATE INDEX meeting_attendees_employee_idx ON meeting_attendees (employee_id);

-- Down Migration
DROP TABLE IF EXISTS meeting_attendees;
DROP TABLE IF EXISTS meetings;
DROP TABLE IF EXISTS rooms;
