import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "better-sqlite3",
    "officeparser",
    "pdfjs-dist",
    "pdfkit",
    "playwright-core",
    "word-extractor",
  ],
};

export default nextConfig;
