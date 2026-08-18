/** @type {import('next').NextConfig} */
const nextConfig = {
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
