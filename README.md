# E-commerce Product Excel Processor (Monorepo)

An **event-driven** system that ingests an Excel sheet of products, validates each
row, creates the valid ones, and emails the user a summary plus an Excel of the
failed rows — with a **React frontend** to drive it.

**Pipeline:** `Upload → S3/MinIO → RabbitMQ event → BullMQ job → validate + save to
PostgreSQL → build error sheet → email (Nodemailer)`

> 📘 Full concept guide (RabbitMQ vs BullMQ, event-driven architecture, query/
> delete cost, soft delete) + deployment & costs: [`docs/PROCESSOR_GUIDE.md`](docs/PROCESSOR_GUIDE.md) / `.pdf`.

---

## Repository layout

```
ecommerce-processor/
├── backend/            # NestJS API + background worker (the processor)
├── frontend/           # React + Vite UI (upload page, products page)
├── docker-compose.yml  # shared local infra: Postgres, Redis, RabbitMQ, MinIO
├── docs/               # learning guide (.md + .pdf)
└── README.md           # you are here
```

- **backend/** — the whole processing engine. See [backend/README.md](backend/README.md).
- **frontend/** — the browser UI that calls the backend API.

---

## Requirements
- **Node.js 20+**
- **Docker Desktop**

Everything runs **locally and free** — no cloud accounts needed.

---

## Run the whole thing (local)

Open **three terminals**.

**1) Infrastructure (from repo root):**
```bash
docker compose up -d
```

**2) Backend (from `backend/`):**
```bash
cd backend
npm install
cp .env.example .env          # Windows: copy .env.example .env
npx prisma migrate dev --name init
npm run seed:sample           # creates samples/valid.xlsx + samples/mixed.xlsx
npm run start:dev             # API on http://localhost:3000
```

**3) Frontend (from `frontend/`):**
```bash
cd frontend
npm install
npm run dev                   # UI on http://localhost:5173
```

Then open **http://localhost:5173** and upload `backend/samples/mixed.xlsx`.

---

## What you can do in the UI
- **Upload tab** — pick a `.xlsx` + email, upload, watch the live status, see the
  success/fail counts, and download the error sheet.
- **Products tab** — view created products, **soft delete**, and **restore**.

## Local dashboards
| Tool | URL | Login |
|---|---|---|
| Frontend UI | http://localhost:5173 | — |
| Backend API | http://localhost:3000 | — |
| RabbitMQ | http://localhost:15672 | guest / guest |
| MinIO | http://localhost:9001 | minioadmin / minioadmin |
| Email previews | backend terminal logs (Ethereal) | — |

---

## Ports (remapped to avoid clashes with other local projects)
Postgres **5433**, Redis **6380**, RabbitMQ **5672/15672**, MinIO **9000/9001**,
Backend **3000**, Frontend **5173**.

## Going to production
Switch MinIO → real AWS S3 and Ethereal → real SMTP by editing `backend/.env`
only (no code changes). See **Part I — Deployment & Costs** in the guide.
