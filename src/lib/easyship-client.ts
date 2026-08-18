import { createEasyshipClient } from "./easyship";
import { createMockEasyshipClient } from "./easyship-mock";
import { getConfig } from "./config";
import type { EasyshipClient } from "./easyship";

let cached: EasyshipClient | null = null;

export function getEasyship(): EasyshipClient {
  if (cached) return cached;
  const config = getConfig();
  cached = config.mockMode
    ? createMockEasyshipClient()
    : createEasyshipClient({
        apiKey: config.EASYSHIP_API_KEY,
        baseUrl: config.EASYSHIP_BASE_URL,
      });
  return cached;
}

export function resetEasyshipClient() {
  cached = null;
}
