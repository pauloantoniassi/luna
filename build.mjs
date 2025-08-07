import { build } from "esbuild";

build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/bundle.js",
  bundle: true,
  platform: "node",
  target: "node18",
  minify: true,
  sourcemap: false,
  external: ["link-preview-js", "jimp", "sharp", "@xmpp/xml", "@whiskeysockets/baileys"],
}).catch(() => process.exit(1));
