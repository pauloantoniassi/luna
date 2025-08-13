import * as fs from "fs";
import * as path from "path";
import getHomeDir from "./getHomeDir";

type LogLevel = "INFO" | "WARN" | "ERROR" | "SUCCESS" | "DEBUG";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
}

class BeautifulLogger {
  private logFile: string;

  constructor() {
    this.logFile = path.join(getHomeDir(), "logs", "luna.log");
    this.ensureLogDirectory();
  }

  private ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  private formatTime(): string {
    return new Date().toLocaleTimeString("pt-BR", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  private getColorCode(level: LogLevel): string {
    const colors = {
      INFO: "\x1b[36m", // Cyan
      WARN: "\x1b[33m", // Yellow
      ERROR: "\x1b[31m", // Red
      SUCCESS: "\x1b[32m", // Green
      DEBUG: "\x1b[35m", // Magenta
    };
    return colors[level];
  }

  private getIcon(level: LogLevel): string {
    const icons = {
      INFO: "💬",
      WARN: "⚠️",
      ERROR: "❌",
      SUCCESS: "✅",
      DEBUG: "🔍",
    };
    return icons[level];
  }

  private formatMessage(level: LogLevel, category: string, message: string, data?: any): string {
    const color = this.getColorCode(level);
    const icon = this.getIcon(level);
    const time = this.formatTime();
    const reset = "\x1b[0m";

    let formatted = `${color}${icon} [${time}] ${level.padEnd(7)} ${category.padEnd(
      15
    )}${reset} ${message}`;

    if (data) {
      if (typeof data === "object") {
        formatted += `\n${color}   └─ Dados: ${JSON.stringify(data, null, 2)
          .split("\n")
          .join(`\n${color}      ${reset}`)}${reset}`;
      } else {
        formatted += `\n${color}   └─ Dados: ${data}${reset}`;
      }
    }

    return formatted;
  }

  private log(level: LogLevel, category: string, message: string, data?: any) {
    const formatted = this.formatMessage(level, category, message, data);
    console.log(formatted);

    // Save to file
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
    };

    try {
      fs.appendFileSync(this.logFile, JSON.stringify(entry) + "\n");
    } catch (error) {
      console.error("Erro ao salvar log:", error);
    }
  }

  info(category: string, message: string, data?: any) {
    this.log("INFO", category, message, data);
  }

  warn(category: string, message: string, data?: any) {
    this.log("WARN", category, message, data);
  }

  error(category: string, message: string, data?: any) {
    this.log("ERROR", category, message, data);
  }

  success(category: string, message: string, data?: any) {
    this.log("SUCCESS", category, message, data);
  }

  debug(category: string, message: string, data?: any) {
    this.log("DEBUG", category, message, data);
  }

  // Método especial para logs de geração de IA
  aiGeneration(step: string, details: any) {
    const stepIcons = {
      start: "🚀",
      processing: "⚙️",
      tokens: "🧮",
      cost: "💰",
      response: "🤖",
      actions: "📋",
      complete: "🎉",
      error: "💥",
    };

    const icon = stepIcons[step as keyof typeof stepIcons] || "📝";
    const reset = "\x1b[0m";
    const blue = "\x1b[44m\x1b[37m";
    const cyan = "\x1b[36m";

    console.log(`
${blue} 🤖 LUNA AI ${reset}`);
    console.log(
      `${cyan}${icon} ${step.toUpperCase()}${reset} ${typeof details === "string" ? details : ""}`
    );

    if (typeof details === "object" && details !== null) {
      Object.entries(details).forEach(([key, value]) => {
        if (key === "actions" && Array.isArray(value)) {
          console.log(
            `${cyan}   └─ ${key}:${reset} ${value
              .map(
                (action) =>
                  action.audio ||
                  action.message?.text ||
                  action.sticker ||
                  action.meme ||
                  action.poll?.question ||
                  "N/A"
              )
              .join(", ")}`
          );
        } else {
          console.log(`${cyan}   └─ ${key}:${reset} ${value}`);
        }
      });
    }
    console.log();
  }

  // Método especial para logs de atividade do grupo
  groupActivity(activity: string, details: any) {
    const activityColors = {
      very_active: "\x1b[41m\x1b[37m", // Red background
      active: "\x1b[43m\x1b[30m", // Yellow background
      normal: "\x1b[42m\x1b[37m", // Green background
    };

    const color = activityColors[activity as keyof typeof activityColors] || "\x1b[46m\x1b[37m";
    const reset = "\x1b[0m";
    const cyan = "\x1b[36m";

    console.log(`\n${color} 📊 ATIVIDADE DO GRUPO ${reset}`);
    console.log(`${cyan}🔥 Nível: ${activity.toUpperCase()}${reset}`);

    if (typeof details === "object") {
      Object.entries(details).forEach(([key, value]) => {
        console.log(`${cyan}   └─ ${key}:${reset} ${value}`);
      });
    }
    console.log();
  }

  // Método especial para logs de ações enviadas
  actionSent(actionType: string, details: any) {
    const actionIcons = {
      message: "💬",
      sticker: "😄",
      audio: "🔊",
      meme: "🖼️",
      poll: "📊",
      location: "📍",
      contact: "👤",
    };

    const icon = actionIcons[actionType as keyof typeof actionIcons] || "📤";
    const green = "\x1b[32m";
    const reset = "\x1b[0m";

    console.log(`${green}${icon} ${actionType.toUpperCase()} ENVIADO${reset}`);
    if (typeof details === "object") {
      Object.entries(details).forEach(([key, value]) => {
        console.log(`${green}   └─ ${key}:${reset} ${value}`);
      });
    }
  }

  // Método para separador visual
  separator(title?: string) {
    const line = "─".repeat(50);
    const gray = "\x1b[90m";
    const reset = "\x1b[0m";

    if (title) {
      const titlePadded = ` ${title} `;
      const totalLength = 50;
      const sideLength = Math.floor((totalLength - titlePadded.length) / 2);
      const leftSide = "─".repeat(sideLength);
      const rightSide = "─".repeat(totalLength - sideLength - titlePadded.length);
      console.log(`${gray}${leftSide}${titlePadded}${rightSide}${reset}`);
    } else {
      console.log(`${gray}${line}${reset}`);
    }
  }
}

const beautifulLogger = new BeautifulLogger();
export default beautifulLogger;
