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

export type EasyshipClient = {
  requestRates: (input: {
    origin: AddressInput;
    destination: AddressInput;
    parcel: ParcelInput;
  }) => Promise<EasyshipRate[]>;
  createShipmentAndBuyLabel: (input: {
    origin: AddressInput;
    destination: AddressInput;
    parcel: ParcelInput;
    courierServiceId: string;
    customerEmail: string;
    platformOrderNumber: string;
  }) => Promise<PurchasedLabel>;
  refreshPurchasedLabel: (easyshipShipmentId: string) => Promise<PurchasedLabel>;
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
      format: "url",
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

function trackingFromShipment(shipment: Record<string, unknown>): string | null {
  const trackings = shipment.trackings as Array<{ tracking_number?: string }> | undefined;
  const fromList = trackings?.find((row) => row.tracking_number)?.tracking_number;
  if (fromList) return fromList;
  if (typeof shipment.tracking_number === "string" && shipment.tracking_number) {
    return shipment.tracking_number;
  }
  const courier = shipment.courier as { tracking_number?: string } | undefined;
  return courier?.tracking_number || null;
}

function documentHref(doc: Record<string, unknown>): string | null {
  if (typeof doc.url === "string" && doc.url.trim()) return doc.url.trim();
  if (typeof doc.label_url === "string" && doc.label_url.trim()) return doc.label_url.trim();
  const encoded = doc.base64_encoded_strings;
  if (Array.isArray(encoded) && typeof encoded[0] === "string" && encoded[0]) {
    const mime = typeof doc.mime_type === "string" && doc.mime_type ? doc.mime_type : "application/pdf";
    return `data:${mime};base64,${encoded[0]}`;
  }
  return null;
}

export function extractLabel(shipment: Record<string, unknown>): PurchasedLabel {
  const easyshipShipmentId = String(
    shipment.easyship_shipment_id ?? shipment.id ?? "",
  );
  const documents = (
    (shipment.shipping_documents as Record<string, unknown>[] | undefined) ??
    (shipment.documents as Record<string, unknown>[] | undefined) ??
    []
  );
  const labelDoc =
    documents.find((doc) => doc.category === "label" || doc.type === "label") ??
    documents.find((doc) => documentHref(doc)) ??
    documents[0];
  const directUrl =
    (typeof shipment.label_url === "string" && shipment.label_url) ||
    (typeof shipment.label_state === "string" && shipment.label_state.startsWith("http")
      ? shipment.label_state
      : "") ||
    null;

  return {
    easyshipShipmentId,
    labelUrl: (labelDoc ? documentHref(labelDoc) : null) || directUrl,
    trackingNumber: trackingFromShipment(shipment),
  };
}

export function createEasyshipClient(options: {
  apiKey: string;
  baseUrl: string;
  fetchImpl?: typeof fetch;
}): EasyshipClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl.replace(/\/$/, "");

  async function easyshipFetch<T>(path: string, init: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          Accept: "application/json",
          ...(init.method && init.method !== "GET" ? { "Content-Type": "application/json" } : {}),
          ...(init.headers ?? {}),
        },
      });
      const text = await response.text();
      const body = text ? JSON.parse(text) : {};
      if (!response.ok) {
        const details = Array.isArray(body?.error?.details)
          ? body.error.details.filter(Boolean).join("; ")
          : "";
        const message = [body?.error?.message, details].filter(Boolean).join(" — ")
          || `Shipping request failed (${response.status})`;
        throw new Error(message);
      }
      return body as T;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Carrier request timed out");
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  async function readShipment(easyshipShipmentId: string) {
    const body = await easyshipFetch<{ shipment?: Record<string, unknown> }>(
      `/shipments/${encodeURIComponent(easyshipShipmentId)}?format=url&label=4x6`,
      { method: "GET" },
    );
    const shipment = body.shipment ?? (body as Record<string, unknown>);
    const label = extractLabel(shipment);
    if (!label.easyshipShipmentId) label.easyshipShipmentId = easyshipShipmentId;
    return label;
  }

  async function requestLabel(easyshipShipmentId: string, courierServiceId?: string) {
    const labeled = await easyshipFetch<{ shipment?: Record<string, unknown> }>(
      `/shipments/${encodeURIComponent(easyshipShipmentId)}/labels`,
      {
        method: "POST",
        body: JSON.stringify({
          ...(courierServiceId ? { courier_service_id: courierServiceId } : {}),
          printing_options: {
            format: "url",
            label: "4x6",
          },
        }),
      },
    );
    const label = extractLabel(labeled.shipment ?? (labeled as Record<string, unknown>));
    if (!label.easyshipShipmentId) label.easyshipShipmentId = easyshipShipmentId;
    return label;
  }

  async function waitForPurchasedLabel(
    easyshipShipmentId: string,
    courierServiceId?: string,
  ) {
    let latest = await readShipment(easyshipShipmentId);
    if (latest.labelUrl) return latest;
    try {
      latest = await requestLabel(easyshipShipmentId, courierServiceId);
      if (latest.labelUrl) return latest;
    } catch {
      // Label may already have been purchased; keep polling the shipment.
    }
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      latest = await readShipment(easyshipShipmentId);
      if (latest.labelUrl) return latest;
    }
    return latest;
  }

  return {
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
      if (!label.easyshipShipmentId) {
        throw new Error("Label purchase did not return a shipment id");
      }
      if (!label.labelUrl) {
        label = await waitForPurchasedLabel(label.easyshipShipmentId, courierServiceId);
      }
      return label;
    },

    async refreshPurchasedLabel(easyshipShipmentId) {
      return waitForPurchasedLabel(easyshipShipmentId);
    },
  };
}
