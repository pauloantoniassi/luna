import path from "path";

export default function getHomeDir() {
  return path.resolve(__dirname, "../");
}
