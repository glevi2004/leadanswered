# One image for the api + worker Railway services (role chosen by $SERVICE_ROLE).
# Build context = the REPO ROOT; referenced via railway.json `dockerfilePath`.
FROM node:22-slim

# Prisma needs openssl; ca-certificates for TLS to Supabase / Twilio / Anthropic / Postmark.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# pnpm via corepack (version pinned by the repo's packageManager field).
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate

WORKDIR /app
# Copy only the pnpm workspace (the build context is the whole repo).
COPY platform/ ./platform/
WORKDIR /app/platform

# Install ALL deps — tsx (a devDependency) runs the services in prod, so do NOT set
# NODE_ENV=production before this. packages/db's postinstall runs `prisma generate`.
RUN pnpm install --frozen-lockfile

EXPOSE 3000
# api by default (also runs migrations on boot); the worker service sets SERVICE_ROLE=worker.
CMD ["sh","-c","if [ \"$SERVICE_ROLE\" = worker ]; then exec pnpm --filter @leadanswered/worker exec tsx src/index.ts; else pnpm --filter @leadanswered/db exec prisma migrate deploy && exec pnpm --filter @leadanswered/api exec tsx src/server.ts; fi"]
