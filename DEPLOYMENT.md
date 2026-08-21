# Deployment (TrueNAS, behind nginx-proxy-manager)

This covers the **production** stack only (`Dockerfile` +
`docker-compose.prod.yml`). Local dev is unrelated and unaffected —
that's still just `docker-compose.yml` (Postgres only) + `npm run dev`.

## 1. Required environment variables

Create a `.env` file next to `docker-compose.prod.yml` on the NAS —
copy `.env.production.example` and fill in real values. **Never commit
this file** (already gitignored). Names only, no values, here:

| Variable | Used by | Notes |
|---|---|---|
| `POSTGRES_USER` | `db` | dedicated to this app, not shared |
| `POSTGRES_PASSWORD` | `db` | pick a real one |
| `POSTGRES_DB` | `db` | |
| `DATABASE_URL` | `app` | host **must** be `db` (the compose service name), user/password/db **must** match the three values above |
| `POCKETID_ISSUER` | `app` | your PocketID instance URL |
| `POCKETID_CLIENT_ID` | `app` | from a client registered in PocketID |
| `POCKETID_CLIENT_SECRET` | `app` | |
| `AUTH_SECRET` | `app` | generate with `openssl rand -base64 32` |
| `AUTH_URL` | `app` | the real public URL nginx-proxy-manager serves this on |
| `AUTH_TRUST_HOST` | `app` | `true` — required behind a reverse proxy |
| `APP_PORT` | compose only | host port (127.0.0.1) to point nginx-proxy-manager at; defaults to 3000 if omitted |

In PocketID, register the client's redirect URI as
`https://<your-real-domain>/api/auth/callback/pocketid`.

## 2. Bringing it up (first deploy or after a code change)

From the project directory on the NAS:

```sh
docker compose -f docker-compose.prod.yml up -d --build
```

This builds the app image, starts the dedicated Postgres container,
waits for it to report healthy, then starts the app — which runs
pending migrations automatically before serving traffic (see §4). No
manual step should be needed for a normal deploy.

To redeploy after pulling new code:

```sh
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Point nginx-proxy-manager's proxy host at `127.0.0.1:<APP_PORT>` (or
whatever `APP_PORT` is set to — 3000 by default).

## 3. Checking logs

```sh
# App (includes the migration step's output, at the very start)
docker compose -f docker-compose.prod.yml logs -f app

# Database
docker compose -f docker-compose.prod.yml logs -f db

# Both
docker compose -f docker-compose.prod.yml logs -f
```

Container status:

```sh
docker compose -f docker-compose.prod.yml ps
```

## 4. Running migrations manually

Migrations run automatically on every container start
(`docker-entrypoint.sh` → `scripts/migrate.mjs`, before the server
starts) — this is safe to happen every restart, since already-applied
migrations are skipped. You shouldn't normally need to do this by
hand. If the automatic step ever fails and you need to re-run it in
isolation:

```sh
docker compose -f docker-compose.prod.yml exec app node scripts/migrate.mjs
```

If the `app` container won't stay up long enough to `exec` into (e.g.
it crash-loops before the server starts), run it as a one-off instead:

```sh
docker compose -f docker-compose.prod.yml run --rm app node scripts/migrate.mjs
```

Both read `DATABASE_URL` from the same `.env` file the stack already
uses.

## 5. Troubleshooting

- **Build fails fetching fonts from `fonts.googleapis.com`** — the
  Docker build environment doesn't have outbound internet access.
  `next/font/google` fetches font files at build time; this needs
  the NAS's Docker build to reach the public internet at least once
  (subsequent builds may cache it). This is unrelated to the app's own
  runtime — the running container never needs external internet
  access itself.
- **App container exits immediately, log shows a Postgres connection
  error** — check `DATABASE_URL` in `.env` uses `db` as the host (not
  `localhost`), and that the user/password/db match `POSTGRES_USER`/
  `POSTGRES_PASSWORD`/`POSTGRES_DB` exactly.
- **Sign-in fails with a PocketID/OIDC error** — confirm the redirect
  URI registered in PocketID exactly matches
  `<AUTH_URL>/api/auth/callback/pocketid`, and that `AUTH_TRUST_HOST`
  is `true` (required behind nginx-proxy-manager).
- **Need a shell inside the running app container**:
  ```sh
  docker compose -f docker-compose.prod.yml exec app sh
  ```

## 6. What's NOT exposed

`db` publishes no port at all — only the `app` container can reach it,
over the internal Compose network, addressed as `db`. `app` publishes
its port bound to `127.0.0.1` only, never directly to the LAN/internet
— nginx-proxy-manager is the only thing that should reverse-proxy to
it.
