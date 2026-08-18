process.env.SKIP_ENV_VALIDATION = "0";
process.env.EASYSHIP_API_KEY = process.env.EASYSHIP_API_KEY || "easyship_test_key";
process.env.EASYSHIP_BASE_URL =
  process.env.EASYSHIP_BASE_URL || "https://public-api.easyship.com/2024-09";
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "sk_test_forezships";
process.env.STRIPE_WEBHOOK_SECRET =
  process.env.STRIPE_WEBHOOK_SECRET || "whsec_test_forezships";
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://forezships:forezships@localhost:5432/forezships";
process.env.DIRECT_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;
process.env.NEXT_PUBLIC_APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Liora Labs Shipping";
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
Object.assign(process.env, { NODE_ENV: "test" });
