import fs from "fs";
import path from "path";
import { z } from "zod";
import getProjectRootDir from "./getProjectRootDir";

const DataSchema = z.array(
  z.object({
    input: z.string(),
    output: z.string(),
  })
);

export type Data = z.infer<typeof DataSchema>;

function convertToLogFormat(data: Data[number]): string {
  return `\n-------------------------------------------------\nInput:\n${data.input}\n\nOutput:\n${data.output}`;
}

export default function log() {
  const file = path.join(getProjectRootDir(), "database", "logs.txt");
  const directory = path.dirname(file);

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "");
  }

  try {
    let rawData = fs.readFileSync(file, "utf-8");

    function add(value: Data[number]) {
      rawData = convertToLogFormat(value) + rawData;
    }

    function getAll(): string {
      return rawData;
    }

    function save() {
      fs.writeFileSync(file, rawData);
    }

    return {
      add,
      getAll,
      save,
    };
  } catch (error) {
    fs.writeFileSync(file, "");
    return log();
  }
}
