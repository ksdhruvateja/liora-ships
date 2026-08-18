import { getConfig } from "./lib/config";

export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  getConfig();
}
