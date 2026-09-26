# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

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
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

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
