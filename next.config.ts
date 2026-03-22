import path from "path";
import type { NextConfig } from "next";

// Read version from package.json at build time
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pkg = require("./package.json") as { version?: string };

const nextConfig: NextConfig = {
  // standalone mode is required for Docker/self-hosted deployments (generates .next/standalone)
  // For Vercel deployment, this can be removed or overridden via VERCEL env var
  output: "standalone",
  reactCompiler: true,
  // Exclude edge-tts-universal and its transitive native deps from webpack bundling.
  // When loaded natively by Node, ws catches the missing 'bufferutil' module and falls
  // back to its pure-JS mask/unmask path instead of receiving a broken empty stub.
  serverExternalPackages: ["bufferutil", "utf-8-validate", "edge-tts-universal"],
  async rewrites() {
    return [
      { source: "/zh", destination: "/" },
      { source: "/zh/", destination: "/" },
      { source: "/zh/:path*", destination: "/:path*" },
    ];
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version ?? "0.0.0",
  },
  webpack(config) {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      jotai: path.resolve(__dirname, "node_modules/jotai"),
      "jotai/vanilla": path.resolve(__dirname, "node_modules/jotai/vanilla"),
    };
    config.module.rules.push({
      test: /\.mp3$/,
      type: "asset/resource",
      generator: {
        filename: "static/media/[name].[hash][ext]",
      },
    });
    return config;
  },
};

export default nextConfig;
