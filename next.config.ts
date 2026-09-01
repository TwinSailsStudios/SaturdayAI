import type { NextConfig } from "next";

/**
 * The Anthropic SDK is bundled for the *browser* here, on purpose: the BYOK
 * tutor calls Claude directly from the client so the student's key never
 * reaches an Apex server (docs/08-byok-tutor.md).
 *
 * The SDK ships Node-only conveniences — reading an `ant auth login` profile
 * from disk, filesystem uploads — behind dynamic `import('node:fs')` calls that
 * never execute in a browser. Webpack still has to resolve them at build time,
 * so we map the Node builtins to empty modules in the client bundle only. The
 * server bundle is untouched.
 */
const NODE_BUILTINS = [
  "buffer",
  "child_process",
  "crypto",
  "fs",
  "fs/promises",
  "path",
  "readline",
  "stream",
  "stream/promises",
  "util",
];

const nextConfig: NextConfig = {
  // The JSON Schemas in schemas/ are the runtime contract: the engine boundary
  // validates every generated item against them at ingest. They are read from
  // disk at runtime, so `pg` and `fs` must stay server-side.
  serverExternalPackages: ["pg"],

  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      // The `node:` scheme is intercepted before module resolution, so an
      // alias never fires. Strip the prefix first, then resolve the bare
      // builtin to an empty module.
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource: { request: string }) => {
          resource.request = resource.request.replace(/^node:/, "");
        })
      );
      config.resolve.fallback = {
        ...config.resolve.fallback,
        ...Object.fromEntries(NODE_BUILTINS.map((m) => [m, false])),
      };
    }
    return config;
  },
};

export default nextConfig;
