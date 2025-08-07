import path from "path";

export default function getHomeDir() {
  const baseDir = path.resolve(__dirname, "../");

  if (
    baseDir.endsWith("/src/") ||
    baseDir.endsWith("\\src\\") ||
    baseDir.endsWith("/src") ||
    baseDir.endsWith("\\src")
  ) {
    return path.resolve(baseDir, "../");
  }

  return baseDir;
}
