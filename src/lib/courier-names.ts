const GENERIC_COMPANY = /^(ground|air|ocean|express|standard|economy|saver|priority|overnight|shipping|courier|last mile|service)$/i;

const CARRIER_COMPANIES = [
  "UPS Mail Innovations",
  "DHL eCommerce",
  "DHL Express",
  "Canada Post",
  "Australia Post",
  "Royal Mail",
  "Amazon Shipping",
  "SF Express",
  "LaserShip",
  "Pitney Bowes",
  "Japan Post",
  "FedEx",
  "USPS",
  "DHL",
  "UPS",
  "OnTrac",
  "Purolator",
  "TForce",
  "UniUni",
  "Asendia",
  "YunExpress",
  "Landmark",
  "Spee-Dee",
  "GLS",
  "DPD",
  "Evri",
  "Hermes",
  "APC",
  "OSM",
  "Veho",
  "4PX",
];

function collapse(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function includesInsensitive(haystack: string, needle: string): boolean {
  return Boolean(needle) && haystack.toLowerCase().includes(needle.toLowerCase());
}

export function stripLioraPrefix(name: string): string {
  return collapse(name)
    .replace(/^Liora Choice\s*[·\-–:]\s*/i, "")
    .replace(/^Liora\s+(Saver|Ground|Express|Priority|Overnight|Economy|Shipping)\b\s*[·\-–:]?\s*/i, "")
    .trim();
}

export function detectCarrierCompany(...parts: Array<string | undefined>): string {
  const hay = parts.map((part) => collapse(part)).filter(Boolean).join(" ");
  for (const brand of CARRIER_COMPANIES) {
    if (includesInsensitive(hay, brand)) return brand;
  }
  return "";
}

function companyFromUmbrella(umbrella: string): string {
  if (!umbrella || GENERIC_COMPANY.test(umbrella)) return "";
  return detectCarrierCompany(umbrella) || umbrella;
}

export function formatCarrierServiceName(input: {
  courierName: string;
  umbrellaName?: string;
  serviceName?: string;
}): string {
  const courier = stripLioraPrefix(input.courierName);
  const umbrella = collapse(input.umbrellaName);
  const service = collapse(input.serviceName);
  const company = companyFromUmbrella(umbrella) || detectCarrierCompany(courier, umbrella, service);

  const hasCompany = company && includesInsensitive(courier, company);
  const hasService = Boolean(service) && includesInsensitive(courier, service);

  if (courier && hasCompany && (hasService || !service)) {
    return courier;
  }

  if (company && service) {
    if (hasCompany && !hasService) return `${courier} ${service}`.trim();
    if (courier && !hasCompany && courier.toLowerCase() !== service.toLowerCase()) {
      return `${company} ${courier}`;
    }
    return `${company} ${service}`;
  }

  if (company && courier) {
    return hasCompany ? courier : `${company} ${courier}`;
  }

  if (courier) return courier;
  if (company) return company;
  if (service) return service;
  return "Shipping";
}

export function brandCourierName(
  _maps: unknown,
  input: {
    courierServiceId: string;
    courierName: string;
    umbrellaName?: string;
    serviceName?: string;
  },
): string {
  return formatCarrierServiceName(input);
}

export function splitDisplayCourierName(name: string): { label: string; carrier: string } {
  const full = stripLioraPrefix(name) || "Shipping";
  const company = detectCarrierCompany(full);
  if (!company) {
    return { label: "", carrier: full };
  }
  const method = collapse(full.replace(new RegExp(company.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), ""));
  return {
    label: company,
    carrier: method || full,
  };
}

export function formatEstimatedDelivery(
  minDays: number | null | undefined,
  maxDays: number | null | undefined,
): string {
  if (minDays && maxDays && minDays !== maxDays) {
    return `${minDays}–${maxDays} business days`;
  }
  if (minDays || maxDays) {
    const days = minDays ?? maxDays;
    return `${days} business day${days === 1 ? "" : "s"}`;
  }
  return "Delivery window confirmed after purchase";
}
