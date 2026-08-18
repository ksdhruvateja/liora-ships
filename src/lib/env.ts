function emptyToUndefined(value: unknown) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export function sanitizeDatabaseUrl(raw: string) {
  let url = raw.trim();
  const wrapped = url.match(/^psql\s+['"]([^'"]+)['"]\s*$/i);
  if (wrapped) url = wrapped[1];
  if ((url.startsWith("'") && url.endsWith("'")) || (url.startsWith('"') && url.endsWith('"'))) {
    url = url.slice(1, -1);
  }
  return url;
}

export function deriveDirectUrl(databaseUrl: string) {
  return databaseUrl.replace("-pooler.", ".");
}

export function normalizeProcessEnv() {
  if (process.env.DATABASE_URL) {
    process.env.DATABASE_URL = sanitizeDatabaseUrl(process.env.DATABASE_URL);
  }
  if (!process.env.DIRECT_URL?.trim() && process.env.DATABASE_URL) {
    process.env.DIRECT_URL = deriveDirectUrl(process.env.DATABASE_URL);
  }
}

export { emptyToUndefined };
