import fs from "fs";
import path from "path";
import { z } from "zod";

const DataSchema = z.object({
  summary: z.string(),
  opinions: z.array(
    z.object({
      name: z.string(),
      jid: z.string(),
      opinion: z.number(),
      traits: z.array(z.string()),
    })
  ),
});

export type Data = z.infer<typeof DataSchema>;

export default function database() {
  const file = path.join(__dirname, "..", "..", "database", "data.json");
  const directory = path.dirname(file);

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify({ summary: "", opinions: [] }, null, 2));
  }

  try {
    const rawData = fs.readFileSync(file, "utf-8");
    const data = JSON.parse(rawData);
    const parsedData = DataSchema.parse(data);

    const mapData = new Map<string, Data[keyof Data]>(Object.entries(parsedData));

    function set(key: keyof Data, value: Data[typeof key]) {
      mapData.set(key, value);
    }

    function get(key: keyof Data): Data[typeof key] | undefined {
      return mapData.get(key);
    }

    function has(key: keyof Data): boolean {
      return mapData.has(key);
    }

    function getAll(): Data {
      return Object.fromEntries(mapData) as Data;
    }

    function save() {
      const dataToSave = Object.fromEntries(mapData);
      const isValid = DataSchema.safeParse(dataToSave);

      if (!isValid.success) {
        throw new Error("Data validation failed: " + JSON.stringify(isValid.error.errors));
      }

      mapData.set("summary", dataToSave.summary || "");
      mapData.set("opinions", dataToSave.opinions || []);
      parsedData.summary = typeof dataToSave.summary === "string" ? dataToSave.summary : "";
      parsedData.opinions = Array.isArray(dataToSave.opinions) ? dataToSave.opinions : [];
      fs.writeFileSync(file, JSON.stringify(dataToSave, null, 2));
    }

    return {
      set,
      get,
      has,
      getAll,
      save,
    };
  } catch (error) {
    const validData = {
      summary: "",
      opinions: [],
    };

    fs.writeFileSync(file, JSON.stringify(validData, null, 2));
    return database();
  }
}
