import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: ['bcryptjs', 'parse'],
  env: {
    PARSE_APP_ID: process.env.PARSE_APP_ID,
    PARSE_JAVASCRIPT_KEY: process.env.PARSE_JAVASCRIPT_KEY,
    PARSE_SERVER_URL: process.env.PARSE_SERVER_URL,
  },
};

export default nextConfig;
