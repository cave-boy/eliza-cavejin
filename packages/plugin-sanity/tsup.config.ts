import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["sanityClient.ts"],
  outDir: "dist",
  sourcemap: true,
  clean: true,
  format: ["esm"],
  external: [
    "@sanity/client",
    "@elizaos/core",
    "@elizaos-plugins/client-telegram",
    "@elizaos-plugins/plugin-solana",
    "dotenv"
  ],
});