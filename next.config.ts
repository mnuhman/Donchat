import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: ['bcryptjs', '@prisma/client', 'prisma'],
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
};

export default nextConfig;
