export default async function reconcile() {
  const base =
    process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.NEXT_PUBLIC_APP_URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) {
    console.error("Reconcile skipped: URL or CRON_SECRET is missing.");
    return;
  }

  const response = await fetch(
    `${base.replace(/\/$/, "")}/api/cron/reconcile?secret=${encodeURIComponent(secret)}`,
  );
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Reconcile failed (${response.status}): ${body}`);
  }
  console.log(body);
}
