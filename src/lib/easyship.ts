import { companyNameOrDefault } from "./parcel-contents";

export type AddressInput = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  countryAlpha2: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  companyName?: string;
};

export type ParcelInput = {
  length: number;
  width: number;
  height: number;
  dimensionUnit: "cm" | "in";
  weight: number;
  weightUnit: "kg" | "lb" | "g" | "oz";
  description: string;
  declaredValueCents: number;
  declaredCurrency: string;
  hsCode?: string;
  category?: string;
};

export type EasyshipRate = {
  courierServiceId: string;
  courierName: string;
  umbrellaName: string;
  serviceName: string;
  totalCharge: number;
  currency: string;
  minDeliveryTime: number | null;
  maxDeliveryTime: number | null;
};

export type PurchasedLabel = {
  easyshipShipmentId: string;
  labelUrl: string | null;
  trackingNumber: string | null;
};

export type WalletBalance = {
  balanceCents: number;
  availableBalanceCents: number;
  currency: string;
};

export type AddWalletCreditResult =
  | { status: 201; transactionReference: string | null }
  | { status: 202 }
  | { status: Exclude<number, 201 | 202>; error: string };

export type EasyshipClient = {
  requestRates: (input: {
    origin: AddressInput;
    destination: AddressInput;
    parcel: ParcelInput;
  }) => Promise<EasyshipRate[]>;
  getWalletBalance: () => Promise<WalletBalance>;
  addWalletCredit: (input: {
    amountDollars: number;
    paymentSourceId: string;
  }) => Promise<AddWalletCreditResult>;
  createShipmentAndBuyLabel: (input: {
    origin: AddressInput;
    destination: AddressInput;
    parcel: ParcelInput;
    courierServiceId: string;
    customerEmail: string;
    platformOrderNumber: string;
  }) => Promise<PurchasedLabel>;
};

function toEasyshipAddress(address: AddressInput) {
  return {
    line_1: address.line1,
    line_2: address.line2 || undefined,
    city: address.city,
    state: address.state,
    postal_code: address.postalCode,
    country_alpha2: address.countryAlpha2,
    company_name: companyNameOrDefault(address.companyName),
    contact_name: address.contactName,
    contact_phone: address.contactPhone,
    contact_email: address.contactEmail,
  };
}

function toEasyshipParcels(parcel: ParcelInput, originCountry?: string) {
  const item: Record<string, unknown> = {
    description: parcel.description,
    quantity: 1,
    actual_weight: parcel.weight,
    declared_currency: parcel.declaredCurrency,
    declared_customs_value: parcel.declaredValueCents / 100,
    dimensions: {
      length: parcel.length,
      width: parcel.width,
      height: parcel.height,
    },
  };
  if (parcel.hsCode) item.hs_code = parcel.hsCode;
  else {
    const category = parcel.category && parcel.category !== "merchandise" ? parcel.category : "fashion";
    item.category = category;
  }
  if (originCountry) item.origin_country_alpha2 = originCountry;

  return [
    {
      box: {
        length: parcel.length,
        width: parcel.width,
        height: parcel.height,
      },
      items: [item],
      total_actual_weight: parcel.weight,
    },
  ];
}

function rateShippingSettings(parcel: ParcelInput) {
  return {
    units: {
      weight: parcel.weightUnit,
      dimensions: parcel.dimensionUnit,
    },
    output_currency: "USD",
  };
}

function labelShippingSettings(parcel: ParcelInput) {
  return {
    units: {
      weight: parcel.weightUnit,
      dimensions: parcel.dimensionUnit,
    },
    buy_label: true,
    buy_label_synchronous: true,
    printing_options: {
      format: "pdf",
      label: "4x6",
      commercial_invoice: "A4",
      packing_slip: "4x6",
    },
  };
}

type EasyshipRateRaw = {
  total_charge?: number;
  currency?: string;
  min_delivery_time?: number | null;
  max_delivery_time?: number | null;
  courier_service?: {
    id?: string;
    name?: string;
    umbrella_name?: string;
    service_name?: string;
    official_name?: string;
  };
};

function mapRate(raw: EasyshipRateRaw): EasyshipRate | null {
  const courierServiceId = raw.courier_service?.id;
  if (!courierServiceId || typeof raw.total_charge !== "number") return null;
  return {
    courierServiceId,
    courierName:
      raw.courier_service?.name ??
      raw.courier_service?.official_name ??
      "Courier",
    umbrellaName: raw.courier_service?.umbrella_name ?? "",
    serviceName: raw.courier_service?.service_name ?? "",
    totalCharge: raw.total_charge,
    currency: raw.currency ?? "USD",
    minDeliveryTime: raw.min_delivery_time ?? null,
    maxDeliveryTime: raw.max_delivery_time ?? null,
  };
}

function extractLabel(shipment: Record<string, unknown>): PurchasedLabel {
  const easyshipShipmentId = String(
    shipment.easyship_shipment_id ?? shipment.id ?? "",
  );
  const tracking =
    (shipment.trackings as { tracking_number?: string }[] | undefined)?.[0]
      ?.tracking_number ??
    (typeof shipment.tracking_number === "string"
      ? shipment.tracking_number
      : null);

  const documents = (shipment.shipping_documents as
    | { category?: string; url?: string }[]
    | undefined) ?? [];
  const labelDoc =
    documents.find((doc) => doc.category === "label") ?? documents[0];

  return {
    easyshipShipmentId,
    labelUrl: labelDoc?.url ?? null,
    trackingNumber: tracking ?? null,
  };
}

export function createEasyshipClient(options: {
  apiKey: string;
  baseUrl: string;
  fetchImpl?: typeof fetch;
}): EasyshipClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl.replace(/\/$/, "");

  async function easyshipFetchRaw(path: string, init: RequestInit) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(init.headers ?? {}),
        },
      });
      const text = await response.text();
      const body = text ? JSON.parse(text) : {};
      return { response, body };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Carrier request timed out");
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async function easyshipFetch<T>(path: string, init: RequestInit): Promise<T> {
    const { response, body } = await easyshipFetchRaw(path, init);
    if (!response.ok) {
      const details = Array.isArray(body?.error?.details)
        ? body.error.details.filter(Boolean).join("; ")
        : "";
      const message = [body?.error?.message, details].filter(Boolean).join(" — ")
        || `Shipping request failed (${response.status})`;
      throw new Error(message);
    }
    return body as T;
  }

  return {
    async getWalletBalance() {
      const body = await easyshipFetch<{
        account?: {
          balance?: number;
          available_balance?: number;
          currency?: string;
        };
      }>("/account", { method: "GET" });
      const account = body.account ?? {};
      const currency = account.currency ?? "USD";
      return {
        balanceCents: Math.round((account.balance ?? 0) * 100),
        availableBalanceCents: Math.round((account.available_balance ?? account.balance ?? 0) * 100),
        currency,
      };
    },

    async addWalletCredit({ amountDollars, paymentSourceId }) {
      const { response, body } = await easyshipFetchRaw("/account/credit", {
        method: "POST",
        body: JSON.stringify({
          payment_source_id: paymentSourceId,
          amount: amountDollars,
        }),
      });
      if (response.status === 201) {
        const record = body.credit ?? body.transaction ?? body;
        const transactionReference =
          (typeof record?.id === "string" && record.id) ||
          (typeof record?.transaction_id === "string" && record.transaction_id) ||
          (typeof body.id === "string" && body.id) ||
          (typeof body.transaction_id === "string" && body.transaction_id) ||
          null;
        return { status: 201 as const, transactionReference };
      }
      if (response.status === 202) {
        return { status: 202 as const };
      }
      const details = Array.isArray(body?.error?.details)
        ? body.error.details.filter(Boolean).join("; ")
        : "";
      const message = [body?.error?.message, details].filter(Boolean).join(" — ")
        || `Wallet recharge failed (${response.status})`;
      return { status: response.status, error: message };
    },

    async requestRates({ origin, destination, parcel }) {
      const parcels = toEasyshipParcels(parcel, origin.countryAlpha2);
      const body = await easyshipFetch<{ rates?: EasyshipRateRaw[] }>(
        "/rates",
        {
          method: "POST",
          body: JSON.stringify({
            origin_address: toEasyshipAddress(origin),
            destination_address: toEasyshipAddress(destination),
            parcels,
            incoterms: "DDU",
            shipping_settings: rateShippingSettings(parcel),
          }),
        },
      );
      return (body.rates ?? []).map(mapRate).filter((rate): rate is EasyshipRate => Boolean(rate));
    },

    async createShipmentAndBuyLabel({
      origin,
      destination,
      parcel,
      courierServiceId,
      customerEmail,
      platformOrderNumber,
    }) {
      const parcels = toEasyshipParcels(parcel, origin.countryAlpha2);

      const created = await easyshipFetch<{ shipment: Record<string, unknown> }>(
        "/shipments",
        {
          method: "POST",
          body: JSON.stringify({
            origin_address: toEasyshipAddress(origin),
            destination_address: {
              ...toEasyshipAddress(destination),
              contact_email: customerEmail,
            },
            parcels,
            incoterms: "DDU",
            courier_settings: {
              courier_service_id: courierServiceId,
              allow_fallback: false,
              apply_shipping_rules: false,
            },
            shipping_settings: labelShippingSettings(parcel),
            order_data: {
              platform_name: "Liora Labs Shipping",
              platform_order_number: platformOrderNumber,
            },
          }),
        },
      );

      const shipment = created.shipment ?? {};
      let label = extractLabel(shipment);

      if (!label.labelUrl || !label.trackingNumber) {
        const shipmentId =
          label.easyshipShipmentId || String(shipment.easyship_shipment_id ?? "");
        if (shipmentId) {
          try {
            const labeled = await easyshipFetch<{
              shipment?: Record<string, unknown>;
            }>(`/shipments/${encodeURIComponent(shipmentId)}/labels`, {
              method: "POST",
              body: JSON.stringify({
                courier_service_id: courierServiceId,
                printing_options: {
                  format: "pdf",
                  label: "4x6",
                },
              }),
            });
            label = extractLabel(labeled.shipment ?? labeled as Record<string, unknown>);
            if (!label.easyshipShipmentId) label.easyshipShipmentId = shipmentId;
          } catch {
            // Synchronous label endpoint is beta; shipment create with buy_label may already suffice.
          }
        }
      }

      if (!label.easyshipShipmentId) {
        throw new Error("Label purchase did not return a shipment id");
      }
      return label;
    },
  };
}
