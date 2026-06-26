# Shared image for the api + worker Railway services. Build context = platform/.
# The two services use this same image with different start commands.
FROM node:22-slim

# Prisma needs openssl; ca-certificates for TLS to Supabase / Twilio / Anthropic / Postmark.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# pnpm via corepack (version pinned by the repo's packageManager field).
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate

WORKDIR /app
COPY . .

# Install ALL deps — tsx (a devDependency) runs the services in prod, so do NOT set
# NODE_ENV=production before this. packages/db's postinstall runs `prisma generate`.
RUN pnpm install --frozen-lockfile

# Default command = api. The worker service overrides this in Railway with:
#   pnpm --filter @leadanswered/worker exec tsx src/index.ts
EXPOSE 3000
CMD ["pnpm", "--filter", "@leadanswered/api", "exec", "tsx", "src/server.ts"]
