import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow 127.0.0.1 for Playwright testing in dev mode
  allowedDevOrigins: ['127.0.0.1'],
};

export default nextConfig;
