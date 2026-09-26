# Deployment Guide — Free, No Credit Card

This guide deploys the **whole app** (backend + frontend + all infrastructure) to
the internet using **only free tiers that do not require a credit card**. Anyone —
including your instructor — can follow it end to end.

> **Result:** a public frontend URL where you upload an Excel sheet, products are
> created, and a **real email** (with the error sheet attached) is delivered.

---

## 1. Architecture in the cloud

```
   Browser
      │
      ▼
 ┌───────────────┐        ┌──────────────────────────────┐
 │  Vercel       │  API   │  Render (one Node service):   │
 │  (frontend)   │ ─────► │  NestJS API + RabbitMQ        │
 └───────────────┘        │  consumer + BullMQ worker     │
                          └───┬───────┬───────┬───────┬───┘
                              │       │       │       │
              ┌───────────────┘       │       │       └───────────────┐
              ▼                       ▼       ▼                       ▼
        ┌──────────┐          ┌──────────┐ ┌────────────┐     ┌──────────────┐
        │  Neon    │          │ Upstash  │ │ CloudAMQP  │     │  Supabase    │
        │ Postgres │          │  Redis   │ │  RabbitMQ  │     │  Storage(S3) │
        └──────────┘          └──────────┘ └────────────┘     └──────────────┘
                                                                      │
                                                                 Brevo / Gmail
                                                                   (email)
```

| Layer | Free tool | Credit card? |
|---|---|---|
| Code hosting | **GitHub** | No |
| Frontend (static) | **Vercel** | No |
| Backend (API + worker + consumer) | **Render** (free Web Service) | No |
| PostgreSQL | **Neon** | No |
| Redis (BullMQ) | **Upstash** | No |
| RabbitMQ | **CloudAMQP** (Little Lemur) | No |
| Object storage (S3) | **AWS S3** (original design) *or* **Supabase Storage** | AWS S3: **yes** · Supabase: no |
| Email (SMTP) | **Brevo** (300/day) or **Gmail** | No |

> **Storage note:** the app is built for **AWS S3** (`@aws-sdk/client-s3`) — that's
> the intended, original choice. AWS S3 has a free tier (5 GB, 12 months) but
> **requires a credit card at signup**. If you (or your instructor) want to avoid
> a card entirely, **Supabase Storage** is S3-compatible and works with the exact
> same code — pick whichever you prefer in step 3.4.

> The backend runs the API, the RabbitMQ consumer, and the BullMQ worker **in one
> process**, so you only host **one** backend service. 🎉

---

## 2. Prerequisites

1. A **GitHub** account.
2. **Push this project to a GitHub repo** (the whole monorepo — `backend/`,
   `frontend/`, `docker-compose.yml`, `docs/`).

```bash
cd ecommerce-processor
git init
git add .
git commit -m "Initial commit: e-commerce product processor"
# create an empty repo on github.com first, then:
git remote add origin https://github.com/<you>/ecommerce-processor.git
git branch -M main
git push -u origin main
```

> Make sure `.env` files are **not** committed (they're git-ignored). You'll set
> secrets in each provider's dashboard instead.

---

## 3. Provision the free services (copy each value into a notepad)

Do these first; you'll paste the values into Render/Vercel in steps 4–5.

### 3.1 Neon — PostgreSQL → `DATABASE_URL`
1. Sign up at **neon.tech** (GitHub login, no card).
2. Create a project (any name, nearest region).
3. On the dashboard, open **Connection string** → choose the **Pooled connection**.
4. Copy it. It looks like:
   `postgresql://user:pass@ep-xxxx-pooler.REGION.aws.neon.tech/dbname?sslmode=require`
   → this is your **`DATABASE_URL`**.

### 3.2 Upstash — Redis → `REDIS_URL`
1. Sign up at **upstash.com** (no card).
2. **Create Database** → Redis → pick a region → Free plan.
3. In the database page, find the **`rediss://`** URL (the TLS one), e.g.
   `rediss://default:PASSWORD@your-db.upstash.io:6379`
   → this is your **`REDIS_URL`**.
4. In **Configuration**, make sure eviction is **`noeviction`** (BullMQ requirement).

### 3.3 CloudAMQP — RabbitMQ → `RABBITMQ_URL`
1. Sign up at **cloudamqp.com** (no card).
2. **Create New Instance** → plan **"Little Lemur" (Free)** → region → create.
3. Open the instance → **AMQP details** → copy the **URL**, e.g.
   `amqps://user:pass@xxx.rmq.cloudamqp.com/vhost`
   → this is your **`RABBITMQ_URL`**.

### 3.4 Object storage → S3 vars

> ✅ **This project uses Supabase Storage (Option B)** — instructor-approved, no credit
> card, and it speaks the same S3 API so the code is unchanged. Follow **Option B**.
> (Option A / real AWS S3 is kept for reference; switching is an env-only change.)

The app uses the AWS S3 SDK. **Option A (AWS S3)** is the original design.
**Option B (Supabase)** is a drop-in, no-credit-card option — same code.

#### Option A — AWS S3 (the original design; needs a credit card to sign up)
1. Create an **AWS account** at **aws.amazon.com** (requires a card; the free tier
   gives 5 GB for 12 months and typical usage here stays $0).
2. **S3 → Create bucket** → name it (e.g. `product-uploads-<yourname>`), pick a
   **region** (e.g. `us-east-1`). Leave "Block all public access" ON.
3. **IAM → Users → Create user** (e.g. `processor-app`) → attach a policy limited to
   your bucket (or `AmazonS3FullAccess` for a quick demo).
4. That user → **Security credentials → Create access key** → copy the
   **Access key ID** and **Secret access key**.
5. Your env values:
   - `S3_ENDPOINT` → **leave blank/unset** (uses real AWS)
   - `S3_FORCE_PATH_STYLE` → `false`
   - `AWS_REGION` → your bucket region
   - `S3_BUCKET` → your bucket name
   - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` → from step 4

#### Option B — Supabase Storage (no credit card, S3-compatible)
1. Sign up at **supabase.com** (no card) → **New project** → wait for provisioning.
2. **Storage** → **New bucket** → name it exactly **`product-uploads`**.
3. **Project Settings → Storage → S3 Connection** → copy the **Endpoint**
   (`https://<ref>.supabase.co/storage/v1/s3`) and **Region**.
4. Same page → **S3 access keys** → **New access key** → copy the keys.
5. Your env values:
   - `S3_ENDPOINT` → the Supabase endpoint
   - `S3_FORCE_PATH_STYLE` → `true`
   - `AWS_REGION` → the shown region · `S3_BUCKET` → `product-uploads`
   - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` → from step 4

> ✅ **No code change either way** — only these env vars differ. To move from
> Supabase to real AWS S3 later, blank `S3_ENDPOINT`, set `S3_FORCE_PATH_STYLE=false`,
> and use your AWS keys/region.

### 3.5 Email → Brevo HTTP API key
> ⚠️ **Render blocks outbound SMTP**, so SMTP email fails in production. Use Brevo's
> **HTTP API** instead (the app auto-uses it when `BREVO_API_KEY` is set).

1. Sign up at **brevo.com** (no card).
2. **Senders, Domains & Dedicated IPs → Senders** → add & **verify** your sender email
   (click the confirmation link). This becomes `MAIL_FROM`.
3. **SMTP & API → API Keys** → **Generate a new API key** → copy it → this is
   **`BREVO_API_KEY`**.
4. Save:
   ```
   BREVO_API_KEY=<the API key>
   MAIL_FROM=Product Processor <your-verified-sender-email>
   ```

*(SMTP still works for local dev where ports aren't blocked, but in the cloud always
use `BREVO_API_KEY`.)*

---

## 4. Deploy the backend on Render

1. Sign up at **render.com** with GitHub (no card for free Web Services).
2. **New → Web Service** → connect your GitHub repo.
3. Configure:
   | Setting | Value |
   |---|---|
   | **Root Directory** | `backend` |
   | **Runtime** | **Docker** (it auto-detects `backend/Dockerfile`) |
   | **Instance type** | **Free** |
   | **Health Check Path** | `/health` |
4. **Environment → Add Environment Variables** — paste everything from
   `backend/.env.production.example`, using the values collected in step 3:

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | *(Neon, 3.1)* |
   | `REDIS_URL` | *(Upstash rediss URL, 3.2)* |
   | `RABBITMQ_URL` | *(CloudAMQP amqps URL, 3.3)* |
   | `RABBITMQ_EVENTS_QUEUE` | `ecommerce_events` |
   | `S3_ENDPOINT` | *(Supabase, 3.4)* |
   | `S3_FORCE_PATH_STYLE` | `true` |
   | `AWS_REGION` | *(Supabase region, 3.4)* |
   | `S3_BUCKET` | `product-uploads` |
   | `AWS_ACCESS_KEY_ID` | *(Supabase, 3.4)* |
   | `AWS_SECRET_ACCESS_KEY` | *(Supabase, 3.4)* |
   | `BREVO_API_KEY` | *(Brevo → SMTP & API → API Keys, 3.5)* |
   | `MAIL_FROM` | `Product Processor <your-verified-sender>` |
   | `FRONTEND_URL` | *(fill after step 5 — leave blank for now)* |

   > Do **not** set `PORT` — Render provides it automatically.
5. **Create Web Service**. Render builds the Docker image and, on start, runs
   `prisma migrate deploy` (creates tables) then launches the app.
6. When live, copy your backend URL, e.g. `https://ecommerce-processor.onrender.com`.
7. Test it: open `https://<your-backend>/health` → should return
   `{"status":"ok","db":"up",...}`.

---

## 5. Deploy the frontend on Vercel

1. Sign up at **vercel.com** with GitHub (no card).
2. **Add New → Project** → import the same repo.
3. Configure:
   | Setting | Value |
   |---|---|
   | **Root Directory** | `frontend` |
   | **Framework Preset** | **Vite** (auto-detected) |
   | **Build Command** | `npm run build` (default) |
   | **Output Directory** | `dist` (default) |
4. **Environment Variables** → add:
   | Key | Value |
   |---|---|
   | `VITE_API_BASE` | your Render backend URL (from step 4.6) |
5. **Deploy**. Copy your frontend URL, e.g. `https://ecommerce-processor.vercel.app`.

---

## 6. Connect the two (CORS)

1. Back in **Render → your service → Environment**, set:
   | Key | Value |
   |---|---|
   | `FRONTEND_URL` | your Vercel URL (from step 5) |
2. Save → Render redeploys. Now the backend only accepts requests from your UI.

---

## 7. Verify in production

1. Open your **Vercel URL**.
2. **Upload tab** → choose `backend/samples/mixed.xlsx` → enter your email →
   **Upload & Process**.
3. Watch it reach **COMPLETED** with **2 successful / 5 unsuccessful**.
4. Click **Download error sheet** → the `.xlsx` of failed rows downloads.
5. **Check your email inbox** → the summary email with the attached error sheet
   arrives (real delivery via Brevo/Gmail). 🎉
6. **Products tab** → the 2 created products appear; test **Soft delete** / **Restore**.

---

## 8. Environment variable reference

### Backend (Render)
| Key | Where to get it |
|---|---|
| `DATABASE_URL` | Neon → pooled connection string |
| `REDIS_URL` | Upstash → `rediss://` URL |
| `RABBITMQ_URL` | CloudAMQP → AMQP details URL |
| `RABBITMQ_EVENTS_QUEUE` | fixed: `ecommerce_events` |
| `S3_ENDPOINT` | **AWS S3: leave blank** · Supabase: the S3 endpoint |
| `AWS_REGION` | your bucket region (AWS or Supabase) |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | AWS IAM access key · or Supabase S3 access key |
| `S3_BUCKET` | your bucket name (`product-uploads`) |
| `S3_FORCE_PATH_STYLE` | **AWS S3: `false`** · Supabase: `true` |
| `MAIL_HOST/PORT/SECURE/USER/PASSWORD/FROM` | Brevo (or Gmail) SMTP |
| `FRONTEND_URL` | your Vercel URL |

### Frontend (Vercel)
| Key | Where to get it |
|---|---|
| `VITE_API_BASE` | your Render backend URL |

---

## 9. Free-tier gotchas (read this)

- **Render free spins down** after ~15 min idle; the first request after a nap
  takes ~50 seconds (cold start), then it's fast again. **Optional fix:** create a
  free monitor at **cron-job.org** (or UptimeRobot) that GETs
  `https://<your-backend>/health` every ~10 minutes to keep it warm. Or upgrade to
  Render's paid always-on plan later. For a demo/instructor review, the cold start
  is usually fine.
- **Upstash + BullMQ:** eviction must be **`noeviction`** (set in 3.2). The app
  already sends `maxRetriesPerRequest: null` and uses TLS for `rediss://`.
- **CloudAMQP free** allows only a few connections. Fine for one backend instance;
  don't run many copies at once.
- **Supabase S3:** the `region` string must match what the dashboard shows. Keep
  `S3_FORCE_PATH_STYLE=true`.
- **Email:** Brevo free = 300/day; Gmail has limits and may throttle automated
  mail. Verify your sender address or messages may be rejected.
- **Neon** may auto-suspend an idle database; the first query wakes it (brief delay).

---

## 10. Cost

**$0.** Every service above runs on a free tier that does not require a credit
card. Watch these limits if usage grows: Neon storage/compute hours, Upstash
daily command count, CloudAMQP connections/messages, Supabase storage GB, Brevo
daily emails, Render monthly hours.

---

## 11. Instructor quick-start

1. **Fork** (or clone) the GitHub repo.
2. Create the six free accounts in **section 3** and copy the values.
3. Deploy backend on **Render** (section 4) and frontend on **Vercel** (section 5).
4. Set `FRONTEND_URL` on Render (section 6).
5. Open the Vercel URL and run the test in **section 7**.

That's the entire deployment — no payment, no servers to manage.

---

## 12. Switching providers later (optional)

Because everything is configured by environment variables, you can swap any piece
without code changes:
- **Real AWS S3:** blank `S3_ENDPOINT`, set real `AWS_*` keys + `S3_BUCKET` + `AWS_REGION`.
- **AWS SES / SendGrid:** change the `MAIL_*` values.
- **Any managed Postgres/Redis/RabbitMQ:** change `DATABASE_URL` / `REDIS_URL` / `RABBITMQ_URL`.
