# Crave - Production Hardening & Deployment Playbook

This playbook documents the production security hardening, automated test suites, cloud deployment guides (Vercel, Netlify, Render, Railway, AWS), and launch checklist for the **Crave Food & Grocery Delivery** platform.

---

## 1. Security Architecture & Hardening

### A. Tiered Rate Limiting
- **Global Rate Limiter:** Applied across all `/api` endpoints (max 100 requests per 15 minutes).
- **Authentication Limiter (`authRateLimiter`):** Applied to `/api/auth/login`, `/register`, `/admin-login`, `/forgot-password`, `/reset-password` (max 15 requests per 15 minutes to block brute-force credential stuffing).
- **Checkout & Payment Limiter (`orderRateLimiter`):** Applied to `/api/orders` and `/api/payments` (max 30 requests per 15 minutes to prevent card testing attacks).

### B. NoSQL Injection Sanitization
- Configured `express-mongo-sanitize` in `server/src/app.js`.
- Recursively strips keys starting with `$` (e.g. `{ "email": { "$gt": "" } }`) and containing `.` from `req.body`, `req.query`, and `req.params`.

### C. XSS Protection & Security Headers
- Configured `helmet` with `crossOriginResourcePolicy: { policy: 'cross-origin' }`.
- Configured Content Security Policy (CSP), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, and Strict-Transport-Security (HSTS).

### D. CORS Whitelist
- Dynamic whitelist checking `ENV.ALLOWED_ORIGINS` (comma-separated origins).
- Automatically allows Vercel and Netlify preview URLs (`*.vercel.app`, `*.netlify.app`) and blocks all unauthorized domains.

### E. Secure Cookie Management
- Refresh tokens stored in `httpOnly: true` cookies.
- In production (`NODE_ENV === 'production'`), enforces `secure: true` and `sameSite: 'none'` (or `'lax'`).

### F. Route Role-Based Access Control (RBAC) Audit
- `protect`: Verifies cryptographic JWT access token and active user account.
- `authorize(...roles)`: Enforces role permissions on every sensitive route:
  - `/api/admin/*` &rarr; `authorize('admin')`
  - `/api/delivery/*` &rarr; `authorize('delivery', 'admin')`
  - `/api/products` (POST/PUT/DELETE) &rarr; `authorize('admin', 'vendor')`
  - `/api/payments/refund/*` &rarr; `authorize('admin')`

### G. Secrets Audit & Validation
- `server/src/config/env.js` validates cryptographic secrets at startup:
  - Fails boot if `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, or `COOKIE_SECRET` are shorter than 32 characters or match default placeholders in production.

---

## 2. Automated Test Verification

### Backend Unit & Integration Tests (Jest + Supertest)
Run the test suite:
```bash
npm --prefix server test
```

**Verified Test Suites (17 Passed, 0 Failed):**
- `tests/auth.test.js`:
  - `POST /api/auth/register` (user creation, secure cookie, token generation)
  - Duplicate email collision rejection (409)
  - Invalid email validation rejection (400)
  - `POST /api/auth/login` (authentication success)
  - Invalid password rejection (401)
  - Admin login rejection for customer role (403)
  - `GET /api/auth/me` with Bearer token (200) and unauthenticated rejection (401)
- `tests/orders.test.js`:
  - `GET /api/orders/my-orders` authentication enforcement
  - `GET /api/orders` admin-only barrier (customer receives 403)
  - Status mutation role barrier (customer cannot mutate order status directly)
- `tests/payments.test.js`:
  - `POST /api/payments/create-intent` unauthenticated rejection (401)
  - `POST /api/payments/create-cod-order` payload validation (400)
  - `POST /api/payments/refund/:orderId` customer blocked from refunding (403)
  - NoSQL injection `$gt` operator payload safely neutralized.

### End-to-End Checkout Test (Playwright)
Run the E2E test suite:
```bash
npm --prefix client run test:e2e
```
Located in [client/e2e/checkout.spec.js](file:///d:/food-delivery/Crave/client/e2e/checkout.spec.js), testing:
- Catalog discovery &rarr; Add to Cart &rarr; Cart quantity & price calculation &rarr; Address step &rarr; Payment method &rarr; Order confirmation.

---

## 3. Frontend Deployment (Vercel & Netlify)

### Option A: Deploy to Vercel
1. Install Vercel CLI: `npm install -g vercel`
2. Run deployment inside `client/`:
   ```bash
   cd client
   vercel
   ```
3. Set Environment Variables in Vercel Project Settings:
   - `VITE_APP_NAME`: `Crave`
   - `VITE_API_BASE_URL`: `https://api.crave-delivery.com/api`
   - `VITE_SOCKET_URL`: `https://api.crave-delivery.com`
   - `VITE_STRIPE_PUBLIC_KEY`: `pk_live_your_live_key`
4. Deploy to production: `vercel --prod`
*The repository contains [client/vercel.json](file:///d:/food-delivery/Crave/client/vercel.json) configured with SPA rewrites, cache headers, and asset links handling.*

### Option B: Deploy to Netlify
1. Connect repository in Netlify Dashboard.
2. Build settings are auto-detected from [client/netlify.toml](file:///d:/food-delivery/Crave/client/netlify.toml):
   - **Base directory:** `client`
   - **Build command:** `npm run build`
   - **Publish directory:** `client/dist`
3. Add environment variables under **Site configuration** &rarr; **Environment variables**.

---

## 4. Backend Deployment (Render, Railway, AWS)

### Option A: Render
The root [render.yaml](file:///d:/food-delivery/Crave/render.yaml) blueprint deploys both backend web service and static frontend automatically:
1. Go to [Render Dashboard](https://dashboard.render.com) &rarr; **Blueprints** &rarr; **New Blueprint Instance**.
2. Select your repository.
3. Supply required secrets (`MONGO_URI`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`).
4. Click **Apply**.

### Option B: Railway
1. Install Railway CLI: `npm install -g @railway/cli`
2. Deploy backend:
   ```bash
   cd server
   railway up
   ```
*Configured with [server/Dockerfile](file:///d:/food-delivery/Crave/server/Dockerfile), [server/railway.json](file:///d:/food-delivery/Crave/server/railway.json), and [server/Procfile](file:///d:/food-delivery/Crave/server/Procfile).*

### Option C: AWS (EC2 / ECS / Lightsail) with Docker
1. Build the production Docker image:
   ```bash
   docker build -t crave-backend:latest -f server/Dockerfile server
   ```
2. Run with environment variables:
   ```bash
   docker run -d \
     --name crave-backend \
     -p 5000:5000 \
     --env-file server/.env.production \
     --restart always \
     crave-backend:latest
   ```

---

## 5. MongoDB Atlas Setup

1. **Create Cluster:** Create an M0 (Free Tier) or M10+ (Dedicated for production) in MongoDB Atlas.
2. **Network Access (IP Whitelist):**
   - If hosting on PaaS (Render / Railway / Vercel): Add `0.0.0.0/0` (Allow Access from Anywhere) with strong database user credentials.
   - If hosting on AWS: Use VPC Peering or static elastic IPs.
3. **Database User:** Create a dedicated user with `readWrite` role on `crave_production_db`.
4. **Connection String:**
   Use the SRV format in `MONGO_URI`:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/crave_production_db?retryWrites=true&w=majority&appName=CraveCluster
   ```
5. **Database Indexes:**
   Ensure geospatial 2dsphere indexes are built:
   - `DeliveryPartnerProfile`: `{ currentLocation: "2dsphere" }`
   - `Order`: `{ orderNumber: 1, customer: 1, orderStatus: 1 }`
   - `Product`: `{ slug: 1, category: 1, type: 1 }`

---

## 6. Pre-Launch Checklist

- [ ] **SSL / TLS:** Frontend and Backend running exclusively over HTTPS.
- [ ] **Stripe Live Mode:**
  - Switched from `pk_test_...` / `sk_test_...` to `pk_live_...` / `sk_live_...`.
  - Registered production webhook endpoint in Stripe Dashboard:
    `https://api.crave-delivery.com/api/payments/webhook`
  - Listening to events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`.
  - Set production `STRIPE_WEBHOOK_SECRET` in server environment.
- [ ] **Cryptographic Secrets:** Generated 32-byte hex strings for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET`.
- [ ] **CORS Configuration:** `ALLOWED_ORIGINS` includes exact live domain and subdomains.
- [ ] **Digital Asset Links:** Verified `https://crave-delivery.com/.well-known/assetlinks.json` returns HTTP 200 with valid JSON.
- [ ] **PWA Offline Mode:** Verified `offline.html` displays when connectivity drops.
- [ ] **Google Play Console:** Uploaded signed `app-release-bundle.aab` to Internal Testing track.
- [ ] **Monitoring & Health:** Configured uptime monitoring on `https://api.crave-delivery.com/api/health`.
- [ ] **Database Backup:** Enabled automated daily snapshots in MongoDB Atlas.

