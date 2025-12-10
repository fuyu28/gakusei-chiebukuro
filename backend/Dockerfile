# Build stage
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json bun.lock ./

# Install deps (Bun が自動で高速解決)
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Build TypeScript
RUN bun run build

# Production stage
FROM oven/bun:1-alpine

WORKDIR /app

# Copy package files
COPY package*.json bun.lock ./
RUN bun install --production --frozen-lockfile

# Copy built output
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["bun", "run", "start"]