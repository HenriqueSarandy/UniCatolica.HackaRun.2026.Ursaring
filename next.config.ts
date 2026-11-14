import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  // Permite uma 2ª instância de teste (ex.: NEXT_DIST_DIR=.next-e2e) sem conflitar com `next dev` aberto.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
};

export default nextConfig;
