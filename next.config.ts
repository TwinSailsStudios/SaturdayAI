import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The JSON Schemas in schemas/ are the runtime contract: the engine boundary
  // validates every generated item against them at ingest. They are read from
  // disk at runtime, so `pg` and `fs` must stay server-side.
  serverExternalPackages: ["pg"],
};

export default nextConfig;
