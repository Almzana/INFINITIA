# Testing

Two suites: frontend unit tests (Vitest) and API integration tests (Node's built-in `node:test`
against a real Postgres). CI runs both on every push and pull request (`.github/workflows/ci.yml`).

## Frontend unit tests

Pure logic in `src/` (i18n, form validation, meeting overlap rules, date/number formatting, role access).
Tests live next to the code as `src/**/*.test.ts`.

```sh
npm install
npm test            # vitest run
npx vitest          # watch mode
```

## API integration tests

Tests in `server/test/*.test.ts` build the Fastify app with `buildApp()` and call it with
`app.inject()` (no port is opened). They need Postgres and use a **separate database,
`hrportal_test`** — never the `hrportal` database. The helper refuses to run against any database
whose name does not end in `_test`.

One-time setup (with the Docker Postgres from `docker-compose.yml` running):

```sh
docker compose up -d db
docker compose exec -T db psql -U hrportal -c "CREATE DATABASE hrportal_test"   # "already exists" is fine
```

Run:

```sh
cd server
npm install
npm test            # node --test --test-concurrency=1 "test/**/*.test.ts"
npm run typecheck   # tsc -p . (src, scripts and test)
```

What the helper (`server/test/helpers.ts`) does on each test file:

- connects to `TEST_DATABASE_URL`, default
  `postgres://hrportal:<POSTGRES_PASSWORD>@127.0.0.1:5433/hrportal_test` (the password is read from
  the environment or the root `.env`);
- applies all migrations, runs `scripts/seed.ts` with a test-only `SEED_DEMO_PASSWORD`, and resets
  the demo accounts (`admin`, `hr`, `staff`) to that password;
- gives tests `login()`, cached per-user sessions (`as("hr")`), `inject()` and `createUser()`.

Tests create their own employees, projects, meetings and leave requests and delete them afterwards,
so they can run in any order and repeatedly. Files run one at a time (`--test-concurrency=1`)
because they share the database. Each login comes from a different `X-Forwarded-For` address, so the
per-IP login rate limit never trips; the lockout test uses a made-up login name.

Run a single file: `node --test test/auth.test.ts`.

## CI

`.github/workflows/ci.yml`:

- **frontend**: Node 24, `npm ci`, `npx oxlint src`, `npx tsc -b`, `npm test`, `npm run build`.
- **api**: Node 24 with a Postgres 17 service container (`hrportal_test`), `npm ci`, `npx tsc -p .`,
  `npm test` with `TEST_DATABASE_URL` pointing at the service.
