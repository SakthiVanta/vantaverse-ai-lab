import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // jsdom (pulled in by isomorphic-dompurify for server-side HTML
  // sanitization) relies on dynamic requires that don't survive Next's
  // production bundling — without this it works in `next dev` but 500s
  // once deployed. Keeping it external makes the serverless function
  // require() it at runtime instead of bundling it.
  serverExternalPackages: ["jsdom", "isomorphic-dompurify"],
};

export default nextConfig;
