// build.mjs

import * as fs from "fs";
import * as esbuild from "esbuild";

// Lê o package.json para obter a lista de dependências
const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf8"));
// Marca todas as dependências como "externas" para o esbuild não tentar agrupá-las
const external = Object.keys(packageJson.dependencies || {});

console.log("Iniciando processo de build...");
console.log(`Marcando ${external.length} dependências como externas.`);

// Limpa o diretório de distribuição anterior
fs.rmSync("./dist", { recursive: true, force: true });
console.log("Diretório 'dist' limpo.");

esbuild
    .build({
      entryPoints: ["./src/index.ts"],
      bundle: true,
      platform: "node",
      target: "node20",
      format: "cjs",
      outdir: "dist",
      sourcemap: true,
      // INSTRUÇÃO CRÍTICA: Diz ao esbuild para não incluir os node_modules no bundle
      external: external,
    })
    .then(() => {
      console.log("✅ Build concluído com sucesso!");
    })
    .catch((err) => {
      console.error("❌ Falha no processo de build:", err);
      process.exit(1);
    });
