# Stage 1: Dependencies
FROM oven/bun:1-alpine AS deps
WORKDIR /app

# Copy package files
COPY package*.json bun.lock ./

# 依存関係インストール
RUN bun install --frozen-lockfile

# Stage 2: Builder
FROM oven/bun:1-alpine AS builder
WORKDIR /app

# node_modules を deps から引き継ぎ
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Next.js ビルド（npm run build 相当）
RUN bun run build

# Stage 3: Runner
FROM oven/bun:1-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 実行ユーザー作成（元の Dockerfile と同じ UID/GID）
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# public を別に使うならこれもコピーしてOK
# COPY --from=builder /app/public ./public

# standalone 出力 & static をコピー
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 8080
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Next.js standalone のエントリを Bun で実行
CMD ["bun", "server.js"]