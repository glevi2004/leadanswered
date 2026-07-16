import { config } from "dotenv";
import { expand } from "dotenv-expand";
import { defineConfig } from "prisma/config";

// Load .env and expand ${VAR} references (DATABASE_URL uses ${DB_PASSWORD}).
expand(config());

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Read process.env directly (not prisma's env(), which hard-throws when unset) so
    // `prisma generate` (packages/db postinstall) works in build contexts without a DB URL
    // — e.g. the web app's Vercel build. Migrate/db-push commands set DATABASE_URL themselves.
    url: process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
