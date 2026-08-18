import { createHash } from "node:crypto";
import { prisma } from "./db";
import type { AddressInput } from "./validations";

export type SavedContactRole = "ORIGIN" | "DESTINATION";

export type SavedContactPublic = {
  id: string;
  role: SavedContactRole;
  label: string;
  address: AddressInput;
};

function normalizePart(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function contactFingerprint(address: AddressInput) {
  const key = [
    address.contactName,
    address.contactPhone,
    address.contactEmail,
    address.companyName,
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.postalCode,
    address.countryAlpha2,
  ]
    .map(normalizePart)
    .join("|");
  return createHash("sha256").update(key).digest("hex").slice(0, 32);
}

export function contactLabel(address: AddressInput) {
  const name = address.contactName?.trim() || address.companyName?.trim() || "Saved address";
  const place = [address.city, address.state, address.postalCode].filter(Boolean).join(", ");
  return place ? `${name} — ${place}` : name;
}

function asAddress(value: unknown): AddressInput | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (!row.line1 || !row.city || !row.contactName) return null;
  return {
    line1: String(row.line1),
    line2: String(row.line2 ?? ""),
    city: String(row.city),
    state: String(row.state ?? ""),
    postalCode: String(row.postalCode ?? ""),
    countryAlpha2: String(row.countryAlpha2 ?? "US").slice(0, 2).toUpperCase(),
    contactName: String(row.contactName),
    contactPhone: String(row.contactPhone ?? ""),
    contactEmail: String(row.contactEmail ?? ""),
    companyName: String(row.companyName ?? ""),
  };
}

async function upsertContact(
  customerEmail: string,
  role: SavedContactRole,
  address: AddressInput,
) {
  const email = customerEmail.trim().toLowerCase();
  const fingerprint = contactFingerprint(address);
  await prisma.savedContact.upsert({
    where: {
      customerEmail_role_fingerprint: {
        customerEmail: email,
        role,
        fingerprint,
      },
    },
    create: {
      customerEmail: email,
      role,
      fingerprint,
      label: contactLabel(address),
      address,
      lastUsedAt: new Date(),
    },
    update: {
      label: contactLabel(address),
      address,
      lastUsedAt: new Date(),
    },
  });
}

export async function rememberShippedContacts(input: {
  customerEmail: string;
  originAddress: unknown;
  destAddress: unknown;
}) {
  const origin = asAddress(input.originAddress);
  const destination = asAddress(input.destAddress);
  if (origin) await upsertContact(input.customerEmail, "ORIGIN", origin);
  if (destination) await upsertContact(input.customerEmail, "DESTINATION", destination);
}

export async function listSavedContacts(customerEmail: string): Promise<SavedContactPublic[]> {
  const email = customerEmail.trim().toLowerCase();
  if (!email.includes("@")) return [];

  const [saved, shipped] = await Promise.all([
    prisma.savedContact.findMany({
      where: { customerEmail: { equals: email, mode: "insensitive" } },
      orderBy: { lastUsedAt: "desc" },
    }),
    prisma.shipment.findMany({
      where: { customerEmail: { equals: email, mode: "insensitive" }, status: "LABEL_CREATED" },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: { originAddress: true, destAddress: true, updatedAt: true },
    }),
  ]);

  const byKey = new Map<string, SavedContactPublic>();

  for (const row of saved) {
    const address = asAddress(row.address);
    if (!address) continue;
    byKey.set(`${row.role}:${row.fingerprint}`, {
      id: row.id,
      role: row.role as SavedContactRole,
      label: row.label,
      address,
    });
  }

  for (const shipment of shipped) {
    const origin = asAddress(shipment.originAddress);
    const dest = asAddress(shipment.destAddress);
    if (origin) {
      const fingerprint = contactFingerprint(origin);
      const key = `ORIGIN:${fingerprint}`;
      if (!byKey.has(key)) {
        byKey.set(key, {
          id: `history-origin-${fingerprint}`,
          role: "ORIGIN",
          label: contactLabel(origin),
          address: origin,
        });
      }
    }
    if (dest) {
      const fingerprint = contactFingerprint(dest);
      const key = `DESTINATION:${fingerprint}`;
      if (!byKey.has(key)) {
        byKey.set(key, {
          id: `history-dest-${fingerprint}`,
          role: "DESTINATION",
          label: contactLabel(dest),
          address: dest,
        });
      }
    }
  }

  return Array.from(byKey.values());
}
