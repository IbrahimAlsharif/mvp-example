import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // No remote image domains: all media flows through the authz-gated /api/media
  // serve path (US-3.3). We never expose a public/CDN image origin (G1, no-leak).
  output: "standalone",
  // argon2 is a native module; keep it (and the AWS SDK) server-only.
  serverExternalPackages: ["argon2", "@aws-sdk/client-s3"],
};

export default withNextIntl(nextConfig);
