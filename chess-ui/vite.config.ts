import { CommonServerOptions, defineConfig, ProxyOptions } from "vite";
import react from "@vitejs/plugin-react-swc";
import { prefix } from "./src/config";
import type { ServerOptions } from "node:https";
import fs from "node:fs";
import path from "node:path";

const listen: CommonServerOptions = {
  port: 3001,
  open: false,
  cors: true,
  strictPort: true,
};

// @ts-ignore
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "build",
    reportCompressedSize: false,
  },
  server: listen,
  preview: listen,
});
