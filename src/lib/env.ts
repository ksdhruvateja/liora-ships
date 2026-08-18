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

function looksLikeUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function resolvePublicAppUrl(env: Record<string, string | undefined> = process.env) {
  const isProd = env.NODE_ENV === "production" || env.CONTEXT === "production";
  const candidates = [
    env.NEXT_PUBLIC_APP_URL,
    env.URL,
    env.DEPLOY_PRIME_URL,
    env.DEPLOY_URL,
  ];

  for (const raw of candidates) {
    const value = raw?.trim().replace(/\/$/, "");
    if (!value || !looksLikeUrl(value)) continue;
    if (isProd && /localhost|127\.0\.0\.1/i.test(value)) continue;
    if (isProd && value.startsWith("http://")) {
      return value.replace(/^http:\/\//, "https://");
    }
    return value;
  }

  return "http://localhost:3000";
}

export function stripeWebhookUrl(appUrl = resolvePublicAppUrl()) {
  return `${appUrl.replace(/\/$/, "")}/api/webhooks/stripe`;
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
