import path from "path";
import * as fs from "fs";
import getProjectRootDir from "./getProjectRootDir";

type Mood =
  | "feliz"
  | "triste"
  | "ansioso"
  | "calmo"
  | "irritado"
  | "excitado"
  | "neutro"
  | "indiferente"
  | "animado"
  | "desanimado"
  | "confuso"
  | "preocupado";

interface MoodEntry {
  date: string;
  mood: Mood;
}

const MOODS: readonly Mood[] = [
  "feliz",
  "triste",
  "ansioso",
  "calmo",
  "irritado",
  "excitado",
  "neutro",
  "indiferente",
  "animado",
  "desanimado",
  "confuso",
  "preocupado",
] as const;

function getCurrentDate(): string {
  return new Date().toISOString().split("T")[0];
}

function getRandomMood(): Mood {
  const randomIndex = Math.floor(Math.random() * MOODS.length);
  return MOODS[randomIndex];
}

function readMoodFile(filePath: string): MoodEntry | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath, "utf-8").trim();

    if (!content) {
      return null;
    }

    const lines = content.split("\n").filter((line) => line.trim());

    if (lines.length < 2) {
      return null;
    }

    const lastDate = lines[lines.length - 2]?.trim();
    const lastMood = lines[lines.length - 1]?.trim() as Mood;

    if (!lastDate || !lastMood || !MOODS.includes(lastMood)) {
      return null;
    }

    return {
      date: lastDate,
      mood: lastMood,
    };
  } catch (error) {
    console.error("Erro ao ler arquivo de humor:", error);
    return null;
  }
}

function writeMoodEntry(filePath: string, date: string, mood: Mood): boolean {
  try {
    const entry = `${date}\n${mood}\n`;
    fs.appendFileSync(filePath, entry, "utf-8");
    return true;
  } catch (error) {
    console.error("Erro ao escrever no arquivo de humor:", error);
    return false;
  }
}

function ensureMoodFileExists(filePath: string): boolean {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, "", "utf-8");
    }
    return true;
  } catch (error) {
    console.error("Erro ao criar arquivo de humor:", error);
    return false;
  }
}

export default function moodDiary(): Mood | null {
  try {
    const filePath = path.join(getProjectRootDir(), ".moodDiary.txt");
    const currentDate = getCurrentDate();

    if (!ensureMoodFileExists(filePath)) {
      return null;
    }

    const lastEntry = readMoodFile(filePath);

    if (lastEntry && lastEntry.date === currentDate) {
      return lastEntry.mood;
    }

    const newMood = getRandomMood();

    if (!writeMoodEntry(filePath, currentDate, newMood)) {
      return null;
    }

    return newMood;
  } catch (error) {
    console.error("Erro no moodDiary:", error);
    return null;
  }
}
