# ---- Build stage ----
# node:20-slim (Debian) instead of alpine: Prisma needs OpenSSL, which is
# reliably available here. Alpine/musl causes "failed to detect libssl" errors.
FROM node:20-slim AS builder
WORKDIR /app

# OpenSSL is required by Prisma's engines
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install all deps (incl. dev) for building
COPY package*.json ./
RUN npm ci

# Generate Prisma client, then build
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ---- Runtime stage ----
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# OpenSSL needed at runtime too (for `prisma migrate deploy` + query engine)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Bring built output + deps (includes generated Prisma client and Prisma CLI
# needed for `prisma migrate deploy` at startup)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

# Render provides $PORT; the app reads process.env.PORT
EXPOSE 3000

# Apply pending DB migrations, then start the API + worker + consumer
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
