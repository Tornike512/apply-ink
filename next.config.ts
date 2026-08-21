import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.APPLY_INK_NEXT_DIST_DIR?.trim() || ".next",
  serverExternalPackages: [
    "@napi-rs/canvas",
    "better-sqlite3",
    "officeparser",
    "pdfjs-dist",
    "pdfkit",
    "playwright-core",
    "word-extractor",
  ],
  outputFileTracingIncludes: {
    "/api/auth/register": [
      "./node_modules/@napi-rs/canvas/**/*",
      "./node_modules/@napi-rs/canvas-linux-x64-gnu/**/*",
    ],
    "/api/auth/resume-prefill": [
      "./node_modules/@napi-rs/canvas/**/*",
      "./node_modules/@napi-rs/canvas-linux-x64-gnu/**/*",
    ],
    "/api/profile": [
      "./node_modules/@napi-rs/canvas/**/*",
      "./node_modules/@napi-rs/canvas-linux-x64-gnu/**/*",
    ],
  },
};

export default nextConfig;
