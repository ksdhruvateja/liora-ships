export const REFERENCE_NUMBER_MAX_LENGTH = 64;

const REFERENCE_ALLOWED = /^[\w\s.,#/&()\-]+$/;

export function sanitizeReferenceNumber(value: string) {
  const trimmed = value
    .replace(/<[^>]*>/g, "")
    .replace(/[^\w\s.,#/&()\-]/g, "")
    .trim()
    .slice(0, REFERENCE_NUMBER_MAX_LENGTH);
  return trimmed;
}

export function parseReferenceNumber(value: unknown) {
  if (value == null || value === "") return "";
  const raw = String(value);
  const sanitized = sanitizeReferenceNumber(raw);
  if (!sanitized) return "";
  if (!REFERENCE_ALLOWED.test(sanitized)) {
    throw new Error("Reference number contains unsupported characters.");
  }
  return sanitized;
}
