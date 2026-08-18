import { spawnSync } from "node:child_process";

function sanitizeDatabaseUrl(raw) {
  let url = raw.trim();
  const wrapped = url.match(/^psql\s+['"]([^'"]+)['"]\s*$/i);
  if (wrapped) url = wrapped[1];
  if (
    (url.startsWith("'") && url.endsWith("'")) ||
    (url.startsWith('"') && url.endsWith('"'))
  ) {
    url = url.slice(1, -1);
  }
  return url;
}

function deriveDirectUrl(databaseUrl) {
  return databaseUrl.replace("-pooler.", ".");
}

if (!process.env.DATABASE_URL?.trim()) {
  console.error(`
DATABASE_URL is missing at build time.

In Netlify go to:
  Site configuration → Environment variables → Add a variable

Add:
  DATABASE_URL = your Neon pooled URL (the one with -pooler in the host)

Scopes (must include Builds, or Prisma cannot migrate):
  ✓ Production
  ✓ Builds
  ✓ Functions

Same screen, also add (same scopes):
  EASYSHIP_API_KEY
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  GMAIL_APP_PASSWORD
  CRON_SECRET

DIRECT_URL is optional — this script fills it from DATABASE_URL.
Do not put these values in git or netlify.toml.
Then trigger a new deploy.
`);
  process.exit(1);
}

process.env.DATABASE_URL = sanitizeDatabaseUrl(process.env.DATABASE_URL);
if (!process.env.DIRECT_URL?.trim()) {
  process.env.DIRECT_URL = deriveDirectUrl(process.env.DATABASE_URL);
  console.log("DIRECT_URL was empty — derived it from DATABASE_URL for Prisma migrations.");
}

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("npx", ["prisma", "generate"]);
run("npx", ["prisma", "migrate", "deploy"]);
run("npx", ["next", "build"]);
