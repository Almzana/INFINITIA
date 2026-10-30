-- Up Migration

-- Hourly per-route request counters for the Developer Console history (pruned after 90 days)
CREATE TABLE api_route_stats (
  bucket        timestamptz      NOT NULL,
  route         text             NOT NULL CHECK (char_length(route) <= 300),
  count         integer          NOT NULL DEFAULT 0,
  server_errors integer          NOT NULL DEFAULT 0,
  client_errors integer          NOT NULL DEFAULT 0,
  total_ms      double precision NOT NULL DEFAULT 0,
  max_ms        double precision NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, route)
);

-- Requests that failed with 5xx, kept 30 days. Only client-safe fields: no bodies, no query strings.
CREATE TABLE api_failures (
  id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at      timestamptz      NOT NULL,
  route   text             NOT NULL CHECK (char_length(route) <= 300),
  path    text             NOT NULL CHECK (char_length(path) <= 500),
  status  integer          NOT NULL,
  code    text             CHECK (char_length(code) <= 64),
  message text             CHECK (char_length(message) <= 500),
  ms      double precision NOT NULL,
  req_id  text             NOT NULL CHECK (char_length(req_id) <= 64)
);
CREATE INDEX api_failures_at_idx ON api_failures (at DESC);

-- Down Migration

DROP TABLE IF EXISTS api_failures;
DROP TABLE IF EXISTS api_route_stats;
