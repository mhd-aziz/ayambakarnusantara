# Ayam Bakar Nusantara — Agent Guide

> **Purpose:** Single source of truth for any AI agent (or human) working in this repository. Follow this document before making changes, and keep it in sync when the codebase evolves.

## 1. Project Overview

**Ayam Bakar Nusantara (ABN)** is a multi-vendor marketplace for ayam bakar and related Nusantara cuisine.

- **Buyers** browse shops and products, manage a cart, place orders (`PAY_AT_STORE` or `ONLINE_PAYMENT` via Midtrans), track order status, chat with sellers, leave ratings after completion, and use an AI assistant (OmniRoute).
- **Sellers** open a single shop per account, manage products, view shop statistics, and fulfill orders through a strict state machine. One user has at most one shop; deleting the shop reverts the role to `customer`.
- **Platform** has no separate admin role — business rules are enforced in controllers and Supabase RPC/RLS.

**Production:** Frontend `https://ayambakarnusantara.zisaltech.site` · API `https://abn-api.zisaltech.site` (Cloudflare Tunnel) · Deployed via Docker Compose + GitHub Actions (self-hosted runners).

## 2. Tech Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | React 19, Vite 6, React Router v6, React Bootstrap 5 + Bootstrap 5, Axios, jsdom + Vitest 3 |
| Backend   | Node 22, Express 5, Supabase JS v2 (PostgreSQL + Auth + Storage + Realtime), Midtrans Snap, Multer 2, Resend, Vitest 4 + Supertest 7 |
| AI        | OmniRoute Gateway (`OMNIROUTE_API_URL` / `OMNIROUTE_API_KEY` / `OMNIROUTE_MODEL`) |
| Infra     | Docker & Docker Compose, Cloudflare Tunnel, GitHub Actions (self-hosted `abn-homelab` runners) |

Node 22 is required. CI pins `actions/setup-node@v4` with `node-version: "22"` (`.github/workflows/*`).

## 3. Repository Layout

```
.
├── backend/
│   ├── src/
│   │   ├── app.js                 # Express app (no listen) — testable via supertest
│   │   ├── index.js               # listen only (reads PORT)
│   │   ├── config/                # supabaseConfig, midtransConfig, env
│   │   ├── routes/                # 12 route modules (auth, profile, shop, product, cart, order, payment, rating, chat, notification, chatbot, feedback)
│   │   ├── controllers/           # business logic; one controller per domain
│   │   ├── middlewares/           # authMiddleware (cookie httpOnly), isSeller, rateLimiter, multerConfig, errorHandler
│   │   └── utils/                 # responseHandler, storageHelper, validators
│   ├── supabase/
│   │   ├── schema.sql
│   │   ├── order-functions.sql / rating-functions.sql
│   │   └── migrations/            # e.g. 20260811_rls_profiles_own_only, 20260823_payment_audit_refund, 20260823_cancel_order_race_fix
│   ├── scripts/
│   │   ├── e2e-comprehensive.js   # 146-check E2E suite (15 phases, buyer + seller POVs) — run against live backend on :5000
│   │   ├── seed-demo.js / sync-demo-passwords.js
│   │   └── ...
│   ├── tests/                     # 11 unit suites (187 tests); integration.test.js is remote-DB only
│   ├── docs/                      # MVP, ARCHITECTURE, DATA-MODEL, API-REFERENCE, BUSINESS-FLOW, ROADMAP
│   └── Dockerfile                 # node:22-alpine, HEALTHCHECK on GET /, USER node
├── frontend/
│   ├── src/
│   │   ├── pages/                 # Home, Shop, Product, Cart, Checkout, Orders, Chat, Profile, Seller/*
│   │   ├── pages/Seller/          # SellerPage (layout + outlet), SellerDashboardOverview, SellerShopInfo, SellerProductManagement, SellerOrderManagement
│   │   ├── components/Seller/     # SellerSidebar, SellerEmptyState (shared empty state), CreateSellerForm, ProductForm/ListItem, Order modals, etc.
│   │   ├── services/              # ShopService, MenuService, OrderService, CartService, AuthService, ChatService, etc. (Axios + cookie)
│   │   ├── context/AuthContext.js # session, role, profile; boot + polling-aware 401 handling
│   │   ├── css/                   # Seller.css, SellerSidebar.css, SellerShopInfo.css, etc.
│   │   └── setupTests.js          # jsdom polyfills; aliases globalThis.jest = vi
│   ├── vite.config.js             # esbuild loader: "jsx" for src/**/*.js; server 0.0.0.0:3000; build outDir build/; test jsdom
│   ├── serve.js                   # static server for build/ (production)
│   └── Dockerfile                 # multi-stage; ARG VITE_API_BASE_URL baked at build time
├── docker-compose.yml             # backend :5000, frontend :3000 (depends_on backend)
└── .github/workflows/             # backend-ci.yml, frontend-ci.yml, backend-deploy.yml, frontend-deploy.yml
```

Additional top-level `review/` is gitignored and holds local audit reports.

## 4. Environment

### 4.1 Three-file pattern

Both backend and frontend use the same convention (`backend/src/app.js:8-19`, `frontend/vite.config.js:4-5`):

- `.env` — base/fallback (committed only as `.env.example`)
- `.env.dev` — development (`NODE_ENV !== "production"` or `vite --mode dev`)
- `.env.prod` — production (`NODE_ENV === "production"` or `vite build --mode prod`)

Never commit `.env` / `.env.dev` / `.env.prod`. Copy from `.env.example`:

```bash
cd backend  && cp .env.example .env.dev   # fill Supabase / Midtrans / OmniRoute / Resend
cd frontend && cp .env.example .env.dev   # set VITE_API_BASE_URL=http://localhost:5000
```

### 4.2 Required variables

**Backend** (`backend/.env.example`):

| Variable | Notes |
|----------|-------|
| `PORT` | default 5000 |
| `NODE_ENV` | `production` loads `.env.prod`, otherwise `.env.dev` |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase project (pooled Postgres `aws-0-ap-southeast-2.pooler.supabase.com` when applicable) |
| `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION` | Midtrans Snap (`false` = sandbox) |
| `OMNIROUTE_API_URL`, `OMNIROUTE_API_KEY`, `OMNIROUTE_MODEL` | Chatbot gateway |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Transactional email |
| `CORS_ALLOWED_ORIGINS` | comma-separated origins (e.g. `http://localhost:3000,https://ayambakarnusantara.zisaltech.site`) |
| `DEMO_CUSTOMER_EMAIL/PASSWORD`, `DEMO_SELLER1_EMAIL/PASSWORD`, `DEMO_SELLER2_EMAIL/PASSWORD` | demo accounts used by E2E |

**Frontend** (`frontend/.env.example`):

| Variable | Notes |
|----------|-------|
| `VITE_API_BASE_URL` | Backend base URL **without** trailing `/api` (e.g. `http://localhost:5000`); baked into the Docker image via `ARG` — changing it requires rebuilding |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Public anon key for client-side Supabase (Realtime/storage) |
| `VITE_MAPS_API_KEY` | Google Maps (chat location) |

## 5. Development

### 5.1 Prerequisites

- Node 22 (`nvm use 22` or `actions/setup-node@v4`)
- Supabase project credentials, Midtrans sandbox keys (for full flows)
- Docker (for parity checks)

### 5.2 Backend

```bash
cd backend
npm ci
npm run dev        # nodemon src/index.js — http://localhost:5000
npm start          # node src/index.js (production)
npm test           # vitest run — all tests (30s timeout)
npx vitest run --exclude tests/integration.test.js   # unit only (CI check job)
npx vitest run tests/integration.test.js             # integration — requires real Supabase DEV
node --check src/app.js   # syntax check (CI runs for every src/**/*.js)
```

`src/app.js` exports the Express app without binding a port; `src/index.js` calls `app.listen`. This split allows `supertest` against `app` without a network port.

### 5.3 Frontend

```bash
cd frontend
npm ci
npm run dev      # vite --mode dev (reads .env.dev) — http://localhost:3000
npm run build    # vite build --mode prod (reads .env.prod) → build/
npm run preview  # serve production build locally
npm test         # vitest run (jsdom, global jest aliased to vi via setupTests.js)
```

- JSX lives in `.js` files. Vite is configured with `esbuild.loader: "jsx"` for `src/**/*.js` (`vite.config.js:10-13`).
- Production output is `build/` (not `dist/`) and is served by `frontend/serve.js` (static file server, not nginx).

### 5.4 Docker

```bash
docker build -t abn-backend:ci ./backend
docker build -t abn-frontend:ci ./frontend   # bakes VITE_API_BASE_URL as ARG
docker compose up -d --build                  # backend :5000, frontend :3000
curl -fs http://localhost:5000/               # "Selamat datang di API Ayam Bakar Nusantara!"
```

`compose` uses `backend/.env.prod` for the backend service and `VITE_API_BASE_URL` build-arg for the frontend.

## 6. Architecture

- **API style:** REST, JSON envelope `{ success, message, data }` via `utils/responseHandler.js` (`handleSuccess` / `handleError`). Errors carrying `error.code` or `statusCode` map to localized messages.
- **Auth:** Supabase Auth. Cookies `authToken` (24h) + `authRefreshToken` (7d), `httpOnly`, `secure` in production, `sameSite Lax/None` (`middlewares/authMiddleware.js`). Frontend sends cookies via `withCredentials`; `AuthContext` guards routes and handles 401 (hard redirect for non-polling flows, see `review/` notes).
- **Authorization:** `authenticateToken` required for protected routes; `isSeller` guard for seller-only routes (`/shop/my-shop`, `/product` write, `/order/seller/*`).
- **Routes:** Mounted without `/api` prefix at `backend/src/app.js:77-88`:

  ```
  /auth, /profile, /shop, /product, /cart, /order, /payment, /rating, /chatbot, /chat, /notification, /feedback
  ```

- **Storage:** Supabase Storage buckets `product-images`, `shop-banners`, `profile-images`, `chat-images`, `orders` (private proofs). Helpers in `utils/storageHelper.js` (`uploadImage`, `uploadPrivateImage`, `getSignedUrl`, `mapPaymentProofUrls`, `extractPathFromPublicUrl`, `validateImageMagicBytes`).
- **Rate limiting:** In-memory per-instance buckets (`middlewares/rateLimiter.js` — `createRateLimiter({ windowMs, max, message })`). Buckets are **per-route** (not global) to prevent `/auth` from consuming `/feedback` quota. Notable limits: login 15/15m, sensitive auth actions 30/15m, feedback 10/10m.
- **Payment:** Midtrans Snap. `ONLINE_PAYMENT` orders go `AWAITING_PAYMENT → (gateway) → PROCESSING` via `POST /payment/notification` (SHA-512 signature, idempotent) or `GET /payment/status/:id` polling. `PAY_AT_STORE` requires seller `confirm-payment` with proof before `COMPLETED`.
- **Chat:** Conversation `id = sorted([uidA, uidB]).join("_")`, text/image/location messages, polling (no WebSocket), `PATCH /chat/:id/read` resets unread.
- **Notifications:** Types `NEW_ORDER` (sellers in order), `ORDER_CANCELLED` (seller), `ORDER_STATUS_UPDATE` / `PAYMENT_CONFIRMED` (buyer), `NEW_MESSAGE`. Badge polls every 60s.

## 7. Data Model (summary)

Full schema: `backend/supabase/schema.sql` and `backend/docs/DATA-MODEL.md`.

| Table | Key fields |
|-------|------------|
| `profiles` | `id uuid PK`, `email`, `display_name`, `role customer/seller`, `phone_number`, `address`, `photo_url`, `shop_id`, `fcm_tokens jsonb` |
| `shops` | `id uuid PK`, `user_id uuid`, `shop_name`, `description`, `shop_address`, `banner_image_url`, `average_rating`, `total_ratings` |
| `products` | `id uuid PK`, `shop_id`, `owner_uid`, `name`, `description`, `price numeric(12,2)`, `stock numeric`, `category Makanan/Minuman/Camilan`, `product_image_url` |
| `carts` | `user_id uuid PK`, `items jsonb [{productId, shopId, name, price, quantity, subtotal}]` |
| `orders` | `id uuid PK`, `user_id`, `items jsonb`, `total_price`, `payment_method ONLINE_PAYMENT/PAY_AT_STORE`, `order_status`, `payment_details jsonb`, `shop_ids uuid[] GIN`, `refunded_at`, `refund_reason`, `refund_amount` |
| `ratings` | unique `(user_id, product_id, order_id)`, value 1–5 |
| `conversations` | `id text PK` (sorted UIDs), `participant_uids uuid[]`, `participant_info jsonb`, `last_message jsonb`, `unread_counts jsonb` |
| `messages` | `conversation_id`, `sender_uid`, `type text/image/location`, `text`, `image_url`, `location jsonb`, `read bool` |
| `notifications` | `user_id`, `title`, `body`, `data jsonb`, `read bool` |
| `payment_status_history` | `order_id`, `old_status`, `new_status`, `source`, `details jsonb` (migration `20260823_payment_audit_refund`) |
| `feedback` | `name`, `email`, `subject`, `message`, `status new` |

RLS is enabled; seller order access is guarded by `shop_ids @> [sellerShopId]` plus item-level checks. Critical writes go through `supabaseAdmin.rpc` (e.g. `create_order`, `cancel_order`, `log_payment_status_change`).

## 8. Business Flows

### 8.1 Order state machine

```
PAY_AT_STORE:  PENDING_CONFIRMATION → CONFIRMED → PROCESSING → READY_FOR_PICKUP → COMPLETED
               ↘ CANCELLED (buyer only, from PENDING/CONFIRMED)
ONLINE_PAYMENT: AWAITING_PAYMENT → PROCESSING → READY_FOR_PICKUP → COMPLETED
                ↘ CANCELLED / PAYMENT_FAILED (gateway cancel/expire/deny)
```

- Only buyers can cancel, only from initial states; stock is restored atomically via `cancel_order` (`FOR UPDATE` + idempotency guard).
- `COMPLETED` and `CANCELLED` are terminal.
- `PROCESSING → READY_FOR_PICKUP → COMPLETED` are seller-driven.
- Rating is allowed only after `COMPLETED` for `(userId, productId, orderId)` — one per triple.

### 8.2 Seller empty state

`/toko-saya/*` (Dashboard `index`, `info`, `produk`, `pesanan`) share a single empty state for users without a shop:

- Component: `frontend/src/components/Seller/SellerEmptyState.js`
- Consistent layout (`seller-page-content`, centered form), header `Belum Memiliki Toko`, role-aware alert (`info` for `customer`, `warning` for `seller` without shop), and `CreateSellerForm` with `onShopCreated → handleShopCreated + loadInitialData`.
- Pages `SellerDashboardOverview`, `SellerShopInfo`, `SellerProductManagement`, `SellerOrderManagement` delegate their `!hasShop` branch to this component. Business flow and other UI are untouched.

## 9. API Reference (condensed)

Full reference: `backend/docs/API-REFERENCE.md`. All responses use the `{ success, message, data }` envelope.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Register (email, password ≥6, displayName, phone E.164 `+`, address) → sets cookies |
| POST | `/auth/login` | — | Login → sets cookies |
| POST | `/auth/logout` | cookie | Clear cookies |
| POST | `/auth/forgot-password` | — | Request reset link (Resend/Supabase) |
| POST | `/auth/reset-password` | — | Reset with `accessToken + refreshToken + newPassword` |
| DELETE | `/auth/account/delete` | cookie | Delete account + cascade |
| GET | `/profile` | cookie | Own profile |
| PUT | `/profile/update` | cookie | Update displayName/phone/address + `profileImage` upload |
| DELETE | `/profile/photo` | cookie | Delete profile photo |
| POST | `/shop` | seller | Create shop (description + banner); one shop per user |
| GET | `/shop/my-shop` | seller | Own shop |
| GET | `/shop/my-shop/statistics` | seller | Stats (`period=all_time/weekly`) |
| PUT | `/shop/my-shop` | seller | Update shop |
| DELETE | `/shop/my-shop` | seller | Delete shop (role → customer) |
| GET | `/shop` | — | List shops (paginated) |
| GET | `/shop/:shopId/detail` | — | Shop detail + products |
| POST | `/product` | seller | Create product |
| GET | `/product/my-products` | seller | Own products |
| PUT | `/product/:id` | seller | Update own product |
| DELETE | `/product/:id` | seller | Delete own product |
| GET | `/product` | — | Catalog (filters: `shopId`, `category`, `searchByName`, `limit`, `page`) |
| GET | `/product/recommendations` | — | Recommendations |
| GET | `/product/:id` | — | Product detail |
| POST | `/cart/items` | cookie | Add to cart (`productId`, `quantity > 0`, stock-checked) |
| GET | `/cart` | cookie | Cart + `totalPrice` |
| PUT | `/cart/items/:id` | cookie | Update quantity (0 = remove) |
| DELETE | `/cart/items/:id` | cookie | Remove item |
| DELETE | `/cart` | cookie | Clear cart |
| POST | `/order` | cookie | Create order (`paymentMethod PAY_AT_STORE/ONLINE_PAYMENT`, `notes`) — uses `create_order` RPC |
| GET | `/order` | cookie | Buyer orders (`?status=&limit=`) |
| GET | `/order/all` | cookie | Buyer orders alias |
| GET | `/order/customer/:orderId` | cookie | Buyer order detail |
| GET | `/order/seller/all` | seller | Seller orders (filtered by `shop_ids`) |
| GET | `/order/seller/:orderId` | seller | Seller order detail (shop membership check) |
| PATCH | `/order/:orderId/cancel` | cookie | Buyer cancel (initial states only) |
| PATCH | `/order/:orderId/seller/status` | seller | Seller state transition |
| PATCH | `/order/:orderId/seller/confirm-payment` | seller | PAY_AT_STORE confirm (requires proof) |
| GET | `/order/:orderId/payment-proofs` | cookie | Signed URLs for payment proofs (buyer or owning seller) |
| POST | `/payment/charge/:orderId` | cookie | Create Midtrans Snap token (`ONLINE_PAYMENT` only) |
| POST | `/payment/retry/:orderId` | cookie | Retry gateway transaction |
| GET | `/payment/status/:orderId` | cookie | Poll gateway status |
| POST | `/payment/notification` | — | Midtrans webhook (SHA-512 `signature_key`, no auth) |
| POST | `/payment/refund` | seller | Refund `COMPLETED` order |
| GET | `/payment/audit/:orderId` | cookie | `payment_status_history` |
| POST | `/rating/:productId` | cookie | Create rating (requires `COMPLETED` order) |
| PUT | `/rating/:ratingId` | cookie | Update own rating |
| DELETE | `/rating/:ratingId` | cookie | Delete own rating |
| GET | `/rating/:productId` | — | Ratings for product |
| GET | `/rating` | — | Ratings list (paginated) |
| POST | `/chat/conversations` | cookie | Start/get conversation (`recipientUID`) |
| GET | `/chat/conversations` | cookie | List conversations |
| POST | `/chat/:conversationId/messages` | cookie | Send message (text / image ≤5MB / location) |
| GET | `/chat/:conversationId/messages` | cookie | List messages (`?limit=&beforeTimestamp=`) |
| PATCH | `/chat/:conversationId/read` | cookie | Mark read |
| GET | `/notification` | cookie | List notifications |
| PATCH | `/notification/:id/read` | cookie | Mark notification read |
| POST | `/chatbot/ask` | cookie | Ask AI (proxies OmniRoute) |
| GET | `/chatbot/history` | cookie | Last 20 chatbot messages |
| DELETE | `/chatbot/history/clear` | cookie | Clear chatbot history |
| POST | `/feedback` | — | Public feedback (rate limited) |
| GET | `/` | — | Health: `Selamat datang di API Ayam Bakar Nusantara!` |

## 10. Conventions

- **Language:** UI and messages are Indonesian; code and commits are English.
- **Responses:** Always `handleSuccess(res, status, message, data)` / `handleError(res, error, defaultMsg)`. `handleError` maps `error.code` (Supabase/auth) and `error.statusCode` to user-facing messages.
- **Validation:** Phone must be E.164 (`+`); password ≥ 6; price/stock ≥ 0; rating 1–5; `category` in `Makanan/Minuman/Camilan`; image magic-byte validated on upload.
- **State guards:** Do not bypass the order state machine; the backend rejects illegal transitions (see `BUSINESS-FLOW.md:201`). Multi-shop orders have a **global** status (M2 per-shop sub-status is deferred).
- **Frontend routing:** `App.js` mounts public `/toko` and `/toko/:shopId`, and protected `/toko-saya/*` (guarded layout `SellerPage` with `SellerSidebar`). Seller child routes: `index` (Dashboard), `info`, `produk`, `pesanan`. `SellerPage` loads `profile + shop` in `loadInitialData` and passes `outletContext` (`currentUserProfile`, `userRole`, `shopData`, `hasShop`, `handleShopCreated`, `loadInitialData`) to children.
- **Styling:** `frontend/src/css/Seller*` + Bootstrap. Reuse `seller-page-content`, `seller-form`, `seller-page-title` for consistent seller pages.
- **Commits:** Conventional Commits with scope — `fix(backend):`, `fix(frontend):`, `feat:`, `chore(deps):`, `ci(backend):`, `docs:`, `test:`.

## 11. Testing

### 11.1 Unit

```bash
# Backend — 11 suites, ~187 tests
cd backend && npm test                                   # vitest run (testTimeout 30s)
npx vitest run --exclude tests/integration.test.js       # CI check job (dummy env)

# Frontend — 16 suites, ~73 tests
cd frontend && npm test
```

- `backend/vitest.config.mjs` sets `testTimeout: 30000` (Supabase cross-region).
- `frontend/src/setupTests.js` aliases `globalThis.jest = vi` and polyfills `localStorage`.

### 11.2 Integration (remote Supabase)

```bash
cd backend && npx vitest run tests/integration.test.js
```

Hits remote Supabase `ap-southeast-2`. **CI skips it** unless `vars.RUN_INTEGRATION_TESTS == 'true'` and secrets are configured. Running locally without real credentials will hang/timeout.

### 11.3 End-to-end (comprehensive)

```bash
# Backend must be running on :5000 with .env.dev populated (demo accounts, Supabase, Midtrans sandbox)
cd backend && node scripts/e2e-comprehensive.js
```

- Single-file, 15-phase suite (`BASE=http://localhost:5000`, unique `TS` per run): health/public, register/login, demo logins (Siti/Budi/Rina), seller shop/products/statistics, buyer cart (including multi-shop), order `PAY_AT_STORE` state machine + `confirm-payment` + `payment-proofs` + `refund`, `ONLINE_PAYMENT` `charge/retry/status/audit`, chat conversations/messages/read + isolation, shop/product public endpoints, notifications, feedback/chatbot/profile, seller `update shop`, edge guards, cleanup (delete rating/product/shop/account).
- Last verified: `146/146 PASS (100%)` on `2026-08-30` after fixing `getOrderRow` helper and per-instance rate limiter isolation.
- Stock assertions check `product detail` after order; cart `totalPrice` and multi-shop `shopIds` are validated.
- Demo credentials come from `backend/.env.dev` (`DEMO_*_PASSWORD`). Ephemeral accounts use `e2e-buyer-<TS>@example.com` etc. and are deleted at the end.

## 12. CI/CD

Workflows in `.github/workflows/` (all on `push`/`pull_request` to `main` with path filters):

| Workflow | Trigger | Jobs |
|----------|---------|------|
| `backend-ci.yml` | `backend/**` | `Syntax & Unit Tests` (`node --check` + `vitest run --exclude integration` with dummy env) · `Validate Docker Image` (`docker build`) · `Integration Tests` (conditional on `vars.RUN_INTEGRATION_TESTS`) |
| `frontend-ci.yml` | `frontend/**` | `Unit Tests` · `Production Build` (`vite build --mode prod`) · `Validate Docker Image` |
| `backend-deploy.yml` | `workflow_run` on `Backend CI` success (`main`) | `Deploy Backend to Homelab` — self-hosted `[self-hosted, abn]`: `git pull --ff-only` + `docker compose up -d --build backend` |
| `frontend-deploy.yml` | `workflow_run` on `Frontend CI` success | `Deploy Frontend to Homelab` — same runner, `docker compose up -d --build frontend` |

Concurrency groups cancel in-progress runs on the same ref. Runners: `abn-homelab` (persistent, self-hosted).

## 13. Pitfalls

- **Missing env vars fail silently.** Backend needs `SUPABASE_*`, `MIDTRANS_*`, `OMNIROUTE_*`, `RESEND_*`, `CORS_ALLOWED_ORIGINS`; frontend needs `VITE_API_BASE_URL` (without trailing `/api`) + `VITE_SUPABASE_*` baked at build time via `--build-arg`. Validate with `curl http://localhost:5000/` and `docker logs`.
- **Integration tests are gated.** `tests/integration.test.js` requires real Supabase DEV; CI only runs it when `RUN_INTEGRATION_TESTS=true`. Local runs without credentials hang — use the unit-only command.
- **Dev vs build load different env files.** `npm run dev` reads `.env.dev`, `npm run build` reads `.env.prod`. Mixing them points the frontend at the wrong API URL.
- **`jsdom` form-submit quirk.** `jsdom 26` blocks submit when required inputs are empty (unlike older jsdom). Affected `Login/RegisterForm` tests use `fireEvent.submit(form)` directly — do not "fix" by switching to `fireEvent.click`.
- **`VITE_API_BASE_URL` is baked.** Changing it requires rebuilding the frontend image, not just restarting the container.
- **One shop per user.** Creating a second shop returns 400; deleting the shop reverts role to `customer`.
- **Seller order access is shop-scoped.** `GET /order/seller/:id` returns 403 if the order does not contain the seller's `shopId`.
- **Rate limiters are per-route.** Adjust `createRateLimiter` limits per route rather than increasing a global bucket.

## 14. Agent Working Agreement

- **Read-only first.** Inspect logs, source, and `backend/docs/*` before changing behavior. Prefer evidence from `docker logs`, `curl`, and `git diff` over assumptions.
- **One thing at a time.** Discuss before executing, stop after each step, confirm before proceeding.
- **Minimal, scoped edits.** Do not rename, reformat, or refactor unrelated code. Match existing style and conventions.
- **Verify before claiming.** Run the relevant tests/linter/build and confirm they pass. For seller flows, exercise both buyer and seller POVs.
- **Keep this guide current.** When you add a route, table, env var, or workflow, update the corresponding section in this file.

## 15. Further Reading

- `README.md` — quick start and stack summary
- `backend/docs/MVP.md` → `ARCHITECTURE.md` → `DATA-MODEL.md` → `API-REFERENCE.md` → `BUSINESS-FLOW.md` → `ROADMAP.md` — deep technical docs
