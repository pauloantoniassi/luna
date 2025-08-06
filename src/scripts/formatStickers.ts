import sharp from "sharp";
import fs from "fs";
import path from "path";

const inputDir: string = "./real-stickers";
const outputDir: string = "./stickers";

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

const resizeImage = async (file: string): Promise<void> => {
  const inputPath = path.join(inputDir, file);
  const outputPath = path.join(outputDir, file);

  try {
    await sharp(inputPath)
      .resize(512, 512, {
        fit: "contain", // Mantém proporção
        position: "center",
        background: { r: 0, g: 0, b: 0, alpha: 0 }, // Fundo transparente
      })
      .toFormat("webp")
      .toFile(outputPath);

    console.log(`✓ Redimensionado: ${file}`);
  } catch (error) {
    console.error(`Erro ao processar ${file}:`, error);
  }
};

// Processa todos os arquivos .webp da pasta
const processAllImages = async (): Promise<void> => {
  const files: string[] = fs.readdirSync(inputDir);

  for (const file of files) {
    if (file.endsWith(".webp")) {
      await resizeImage(file);
    }
  }
};

processAllImages();
