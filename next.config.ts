import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', 'mammoth', 'natural', '@napi-rs/canvas'],
};

export default nextConfig;
