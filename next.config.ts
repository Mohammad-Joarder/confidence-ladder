import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Avoid bundling issues with JSDOM (used by isomorphic-dompurify on the server).
  serverExternalPackages: ["isomorphic-dompurify", "jsdom"],
};

export default nextConfig;
