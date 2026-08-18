/** @type {import('next').NextConfig} */

function resolveBuildAppUrl() {
  const isProd = process.env.NODE_ENV === "production" || process.env.CONTEXT === "production";
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    process.env.DEPLOY_URL,
  ];
  for (const raw of candidates) {
    const value = raw?.trim().replace(/\/$/, "");
    if (!value) continue;
    if (isProd && /localhost|127\.0\.0\.1/i.test(value)) continue;
    if (isProd && value.startsWith("http://")) return value.replace(/^http:\/\//, "https://");
    return value;
  }
  return "http://localhost:3000";
}

const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_URL: resolveBuildAppUrl(),
  },
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
    outputFileTracingIncludes: {
      "/*": ["./node_modules/.prisma/client/**", "./node_modules/@prisma/client/**"],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    const cacheForever = [
      {
        key: "Cache-Control",
        value: "public, max-age=31536000, immutable",
      },
    ];
    return [
      { source: "/logo.png", headers: cacheForever },
      { source: "/favicon.ico", headers: cacheForever },
      { source: "/apple-touch-icon.png", headers: cacheForever },
      { source: "/site.webmanifest", headers: cacheForever },
    ];
  },
};

export default nextConfig;
