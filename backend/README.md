# Backend — Product Excel Processor (NestJS)

The event-driven processing engine: HTTP API + RabbitMQ event consumer + BullMQ
worker, all in one NestJS process.

**Pipeline:** `Upload → S3/MinIO → RabbitMQ event → BullMQ job → validate + save to
PostgreSQL → build error sheet → email (Nodemailer)`

## Tech stack
NestJS · TypeScript · AWS S3 (MinIO locally) · RabbitMQ · BullMQ (Redis) ·
PostgreSQL + Prisma · ExcelJS · Nodemailer

## Folder structure
```
src/
├── main.ts                      # bootstrap: HTTP + RabbitMQ microservice
├── app.module.ts                # root module
├── app.controller.ts            # serves a fallback HTML test console at /
├── config/                      # env-based configuration
├── common/                      # cross-cutting: constants, event types, utils
│   ├── constants.ts
│   ├── events/product-events.ts
│   └── utils/emit-event.util.ts
├── infrastructure/              # shared technical services
│   ├── prisma/                  # DB client + module
│   ├── storage/                 # S3 / MinIO service
│   └── messaging/               # RabbitMQ event-bus (emit side)
└── modules/                     # business features
    ├── upload/                  # POST /uploads → S3 → emit event
    ├── processing/              # RabbitMQ consumer + BullMQ worker + Excel
    ├── product/                 # products API + soft delete
    ├── notification/            # email consumer + templates
    └── health/                  # health check
```

## Run (local)
```bash
npm install
cp .env.example .env             # Windows: copy .env.example .env
# ensure infra is up (from repo root): docker compose up -d
npx prisma migrate dev --name init
npm run seed:sample              # generate sample .xlsx files
npm run start:dev                # http://localhost:3000
```

## API
| Method | Path | Description |
|---|---|---|
| POST | `/uploads` | Upload `.xlsx` (`file`) + `email`; returns `202` + `batchId` |
| GET | `/uploads/:id` | Batch status + counts |
| GET | `/uploads/:id/errors` | Download the generated "unsuccessful rows" Excel |
| GET | `/products` | List active products (`?skip&take&category`) |
| GET | `/products/:id` | One product |
| DELETE | `/products/:id` | **Soft** delete |
| POST | `/products/:id/restore` | Undo soft delete |
| GET | `/health` | Liveness + DB check |
| GET | `/` | Fallback HTML test console |

## Required Excel columns
`sku` (unique), `name`, `description`, `price` (> 0), `category`, `color`,
`stock` (integer ≥ 0). One product per row; a header row is required.

## Notes
- Local storage uses **MinIO** (S3-compatible). Set real `AWS_*` keys and blank
  `S3_ENDPOINT` in `.env` to use real AWS S3 — no code changes.
- Email uses a free **Ethereal** inbox in dev (preview URL logged per email).
