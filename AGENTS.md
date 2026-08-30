# Ayam Bakar Nusantara — Agent Instructions

Multi-vendor marketplace for ayam bakar (React 19 + Vite 6 frontend, Node + Express 5 + Supabase backend, Midtrans payments, OmniRoute AI chatbot, Cloudflare Tunnel deploy).

## Dev environment

- Node 22 required (CI uses `actions/setup-node@v4` with node 22).
- Env pattern: `.env` (base/fallback) + `.env.dev` (dev) + `.env.prod` (prod). `NODE_ENV=production` loads `.env.prod`, else `.env.dev` (`backend/src/app.js:8-19`, `frontend/vite.config.js:4-5`). Never commit `.env` files; copy from `.env.example`:
  ```
  cd backend && cp .env.example .env.dev   # fill Supabase/Midtrans/OmniRoute/Resend
  cd frontend && cp .env.example .env.dev  # set VITE_API_BASE_URL=http://localhost:5000
  ```
- Backend port 5000, frontend port 3000. CORS origins comma-separated in `CORS_ALLOWED_ORIGINS`.

## Build & test

Backend (`backend/`):
```
npm ci
npm run dev              # nodemon src/index.js — port 5000
npm start                # node src/index.js (production)
npm test                 # vitest run — all tests
npx vitest run --exclude tests/integration.test.js  # unit only (CI check job)
npx vitest run tests/integration.test.js            # integration — needs real Supabase DEV
node --check src/app.js  # syntax check (CI runs for every src/**/*.js)
```

Frontend (`frontend/`):
```
npm ci
npm run dev    # vite --mode dev (reads .env.dev) — port 3000
npm run build  # vite build --mode prod (reads .env.prod) -> build/
npm run preview
npm test       # vitest run (jsdom, global `jest` aliased to `vi` via setupTests.js)
```

Docker / CI:
```
docker build -t abn-backend:ci ./backend   # validates backend image
docker build -t abn-frontend:ci ./frontend # frontend image bakes VITE_API_BASE_URL as ARG
```
CI workflows in `.github/workflows/`: `backend-ci.yml`, `frontend-ci.yml`, `backend-deploy.yml`, `frontend-deploy.yml` — all trigger on push/PR to `main` with path filters.

## Conventions

- Layout: `backend/src/{app.js,index.js,routes/,controllers/,middlewares/,config/,utils/}` + `backend/supabase/{schema.sql,migrations/}` + `backend/docs/`; `frontend/src/{components/,pages/,services/,context/,utils/,tests/}` with `vite.config.js` at frontend root.
- Backend app split: `src/app.js` (Express app, no listen) and `src/index.js` (listen only) to allow `supertest` against `app` without binding a port.
- Routes mount without `/api` prefix: `/auth`, `/profile`, `/shop`, `/product`, `/cart`, `/order`, `/payment`, `/rating`, `/chatbot`, `/chat`, `/notification`, `/feedback` (`backend/src/app.js:77-88`).
- Responses via `utils/responseHandler.js`: `handleSuccess(res, status, message, data)` / `handleError(res, error, defaultMsg)`. Errors with `error.code`/`statusCode` map to localized messages.
- Auth: Supabase; cookies `authToken` (24h) + `authRefreshToken` (7d), `httpOnly`, `secure` in production (`middlewares/authMiddleware.js`).
- Frontend JSX lives in `.js` files; Vite/esbuild configured `loader: "jsx"` for `src/**/*.js` (`vite.config.js:10-13`). Build output is `build/` not `dist/`. Production served by `frontend/serve.js` (static file server, not nginx).
- Tests: `backend/vitest.config.mjs` sets 30s timeout (Supabase cross-region). `frontend/src/setupTests.js` aliases `globalThis.jest = vi` and polyfills `localStorage`.
- Commits: conventional prefix `fix(backend):`, `feat:`, `chore(deps):`, `ci(backend):`, `docs:`, `test:`.

## Pitfalls

- Missing env vars cause silent failures — backend needs `SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY`, `MIDTRANS_*`, `OMNIROUTE_*`, `RESEND_*`, `CORS_ALLOWED_ORIGINS`; frontend needs `VITE_API_BASE_URL` (without trailing `/api`) + `VITE_SUPABASE_*` baked at build time via `--build-arg`.
- Integration tests (`backend/tests/integration.test.js`) hit remote Supabase `ap-southeast-2`; CI skips them unless `vars.RUN_INTEGRATION_TESTS == 'true'` and secrets configured. Local run without real credentials hangs/timeouts — use the unit-only command above.
- `npm run dev` vs `npm run build` load different env files — mixing them points the frontend at the wrong API URL.
- Frontend `jsdom 26` blocks form submit when required inputs are empty (unlike older jsdom); affected Login/RegisterForm tests use `fireEvent.submit(form)` directly — don't "fix" by switching to `fireEvent.click`.
- `VITE_API_BASE_URL` is an `ARG` baked into the Docker image — changing it requires rebuilding, not just restarting the container.
