/**
 * In-memory stand-in for the Prisma client, covering every query shape the app uses
 * (findUnique/findFirst/findMany/count/create/update/updateMany/upsert/deleteMany,
 * $transaction in both forms, advisory-lock $queryRaw). Lets end-to-end tests run the
 * real route handlers without a Postgres server.
 */
import { randomUUID } from "node:crypto";

type Row = Record<string, unknown>;
type Where = Record<string, unknown>;

const DEFAULTS: Record<string, () => Row> = {
  shipment: () => ({
    quoteGroupId: "",
    currency: "USD",
    markupPercentUsed: null,
    finalCustomerTotalCents: null,
    estimatedMinDays: null,
    estimatedMaxDays: null,
    referenceNumber: null,
    pickupRequired: false,
    easyshipOriginAddressId: null,
    pickupSlotId: null,
    pickupDate: null,
    pickupFromTime: null,
    pickupToTime: null,
    pickupTimezone: null,
    pickupPriceCents: null,
    pickupBaseCostCents: null,
    pickupCustomerCents: 0,
    pickupCurrency: null,
    easyshipPickupId: null,
    pickupStatus: "NONE",
    pickupErrorCode: null,
    pickupErrorMessage: null,
    labelGeneratedAt: null,
    businessDate: null,
    createdBy: null,
    stripePaymentIntentId: null,
    status: "QUOTED",
    easyshipShipmentId: null,
    labelUrl: null,
    trackingNumber: null,
    fulfillmentAttempts: 0,
    lastError: null,
    labelEmailSentAt: null,
    cancelRequestedAt: null,
    cancelledAt: null,
    cancelledBy: null,
    cancelReason: null,
    refundStatus: "NONE",
    refundCents: null,
    stripeRefundId: null,
    refundedAt: null,
    refundError: null,
  }),
  shippingMarkupConfig: () => ({ enabled: true, percentage: 11, fixedMarkupCents: 0, updatedBy: null }),
  savedContact: () => ({}),
  markupAuditLog: () => ({}),
  markupPinAttempt: () => ({ failedAttempts: 0, lockedUntil: null }),
  easyshipRecharge: () => ({ transactionReference: null }),
  courierBrandMap: () => ({ sortOrder: 0, active: true }),
  markupRule: () => ({ active: true }),
};

/** Compound unique keys used in `where` (Prisma joins the field names with "_"). */
const COMPOUND_KEYS: Record<string, string[]> = {
  customerEmail_role_fingerprint: ["customerEmail", "role", "fingerprint"],
};

function asComparable(v: unknown) {
  return v instanceof Date ? v.getTime() : v;
}

function matchField(value: unknown, cond: unknown): boolean {
  if (cond === null) return value === null || value === undefined;
  if (cond instanceof Date || typeof cond !== "object") return asComparable(value) === asComparable(cond);
  const c = cond as Record<string, unknown>;
  const insensitive = c.mode === "insensitive";
  const norm = (x: unknown) => (insensitive && typeof x === "string" ? x.toLowerCase() : x);
  for (const [op, arg] of Object.entries(c)) {
    switch (op) {
      case "mode":
        break;
      case "equals":
        if (norm(asComparable(value)) !== norm(asComparable(arg))) return false;
        break;
      case "not":
        if (arg === null ? value === null || value === undefined : matchField(value, arg)) return false;
        break;
      case "in":
        if (!(arg as unknown[]).map(asComparable).includes(asComparable(value))) return false;
        break;
      case "contains":
        if (typeof value !== "string" || !String(norm(value)).includes(String(norm(arg)))) return false;
        break;
      case "gte":
        if (value == null || (asComparable(value) as number) < (asComparable(arg) as number)) return false;
        break;
      case "lte":
        if (value == null || (asComparable(value) as number) > (asComparable(arg) as number)) return false;
        break;
      case "gt":
        if (value == null || (asComparable(value) as number) <= (asComparable(arg) as number)) return false;
        break;
      case "lt":
        if (value == null || (asComparable(value) as number) >= (asComparable(arg) as number)) return false;
        break;
      default:
        throw new Error(`fake-prisma: unsupported operator "${op}"`);
    }
  }
  return true;
}

function matches(row: Row, where: Where | undefined): boolean {
  if (!where) return true;
  for (const [key, cond] of Object.entries(where)) {
    if (key === "OR") {
      if (!(cond as Where[]).some((w) => matches(row, w))) return false;
    } else if (key === "AND") {
      if (!(cond as Where[]).every((w) => matches(row, w))) return false;
    } else if (key === "NOT") {
      if (matches(row, cond as Where)) return false;
    } else if (COMPOUND_KEYS[key]) {
      const parts = cond as Row;
      if (!COMPOUND_KEYS[key].every((f) => row[f] === parts[f])) return false;
    } else if (!matchField(row[key], cond)) {
      return false;
    }
  }
  return true;
}

function applyData(row: Row, data: Row) {
  const next = { ...row };
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === "object" && !(v instanceof Date) && "increment" in (v as Row)) {
      next[k] = Number(next[k] ?? 0) + Number((v as Row).increment);
    } else if (v !== undefined) {
      next[k] = v;
    }
  }
  return next;
}

function sortRows(rows: Row[], orderBy: unknown) {
  if (!orderBy) return rows;
  const orders = (Array.isArray(orderBy) ? orderBy : [orderBy]) as Record<string, "asc" | "desc">[];
  return [...rows].sort((a, b) => {
    for (const o of orders) {
      const [field, dir] = Object.entries(o)[0];
      const av = asComparable(a[field]) as number;
      const bv = asComparable(b[field]) as number;
      if (av === bv) continue;
      const cmp = av == null ? -1 : bv == null ? 1 : av < bv ? -1 : 1;
      return dir === "desc" ? -cmp : cmp;
    }
    return 0;
  });
}

function pick(row: Row | null, select?: Record<string, boolean>) {
  if (!row || !select) return row ? { ...row } : row;
  return Object.fromEntries(Object.keys(select).filter((k) => select[k]).map((k) => [k, row[k]]));
}

function model(name: string, rows: Row[]) {
  const make = (data: Row): Row => {
    const now = new Date();
    return { id: randomUUID(), ...DEFAULTS[name]?.(), createdAt: now, updatedAt: now, ...data };
  };
  const findIndex = (where: Where) => rows.findIndex((r) => matches(r, where));
  return {
    rows,
    async findUnique({ where, select }: { where: Where; select?: Record<string, boolean> }) {
      return pick(rows.find((r) => matches(r, where)) ?? null, select);
    },
    async findFirst({ where, orderBy, select }: { where?: Where; orderBy?: unknown; select?: Record<string, boolean> } = {}) {
      return pick(sortRows(rows.filter((r) => matches(r, where)), orderBy)[0] ?? null, select);
    },
    async findMany({
      where,
      orderBy,
      take,
      skip,
      select,
    }: { where?: Where; orderBy?: unknown; take?: number; skip?: number; select?: Record<string, boolean> } = {}) {
      let out = sortRows(rows.filter((r) => matches(r, where)), orderBy);
      if (skip) out = out.slice(skip);
      if (take != null) out = out.slice(0, take);
      return out.map((r) => pick(r, select));
    },
    async count({ where }: { where?: Where } = {}) {
      return rows.filter((r) => matches(r, where)).length;
    },
    async create({ data }: { data: Row }) {
      const row = make(data);
      rows.push(row);
      return { ...row };
    },
    async update({ where, data }: { where: Where; data: Row }) {
      const i = findIndex(where);
      if (i < 0) throw Object.assign(new Error(`fake-prisma: ${name} record not found`), { code: "P2025" });
      rows[i] = { ...applyData(rows[i], data), updatedAt: new Date() };
      return { ...rows[i] };
    },
    async updateMany({ where, data }: { where?: Where; data: Row }) {
      let count = 0;
      rows.forEach((r, i) => {
        if (matches(r, where)) {
          rows[i] = { ...applyData(r, data), updatedAt: new Date() };
          count += 1;
        }
      });
      return { count };
    },
    async upsert({ where, create, update }: { where: Where; create: Row; update: Row }) {
      const i = findIndex(where);
      if (i >= 0) {
        rows[i] = { ...applyData(rows[i], update), updatedAt: new Date() };
        return { ...rows[i] };
      }
      const row = make(create);
      rows.push(row);
      return { ...row };
    },
    async delete({ where }: { where: Where }) {
      const i = findIndex(where);
      if (i < 0) throw new Error(`fake-prisma: ${name} record not found`);
      return rows.splice(i, 1)[0];
    },
    async deleteMany({ where }: { where?: Where } = {}) {
      let count = 0;
      for (let i = rows.length - 1; i >= 0; i--) {
        if (matches(rows[i], where)) {
          rows.splice(i, 1);
          count += 1;
        }
      }
      return { count };
    },
  };
}

export function createFakePrisma() {
  const tables: Record<string, Row[]> = {};
  const models = Object.fromEntries(
    Object.keys(DEFAULTS).map((name) => {
      tables[name] = [];
      return [name, model(name, tables[name])];
    }),
  );
  const locks = new Set<string>();

  const client: Record<string, unknown> = {
    ...models,
    tables,
    /** Tagged template: emulates SELECT 1 and pg advisory locks. */
    async $queryRaw(strings: TemplateStringsArray, ...values: unknown[]) {
      const sql = strings.join("?");
      if (sql.includes("pg_try_advisory_lock")) {
        const key = String(values[0]);
        if (locks.has(key)) return [{ locked: false }];
        locks.add(key);
        return [{ locked: true }];
      }
      if (sql.includes("pg_advisory_unlock")) {
        locks.delete(String(values[0]));
        return [{ pg_advisory_unlock: true }];
      }
      return [{ "?column?": 1 }];
    },
    async $executeRawUnsafe() {
      return 0;
    },
    async $transaction(arg: unknown) {
      if (typeof arg === "function") return (arg as (tx: unknown) => Promise<unknown>)(client);
      return Promise.all(arg as Promise<unknown>[]);
    },
    reset() {
      for (const rows of Object.values(tables)) rows.length = 0;
      locks.clear();
    },
  };
  return client as Record<string, ReturnType<typeof model>> & {
    tables: Record<string, Row[]>;
    reset: () => void;
    $queryRaw: (s: TemplateStringsArray, ...v: unknown[]) => Promise<unknown[]>;
  };
}
