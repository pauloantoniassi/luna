import P from "pino";

export class LoggerConfig {
  static silent() {
    return P({
      level: "silent",
      timestamp: () => `,"time":"${new Date().toJSON()}"`,
    });
  }

  static production() {
    return P({
      level: "error",
      timestamp: () => `,"time":"${new Date().toJSON()}"`,
    });
  }

  static development() {
    return P({
      level: "warn",
      timestamp: () => `,"time":"${new Date().toJSON()}"`,
    });
  }

  static debug() {
    return P({
      level: "debug",
      timestamp: () => `,"time":"${new Date().toJSON()}"`,
    });
  }

  static auto() {
    const env = process.env.NODE_ENV?.toLowerCase();

    switch (env) {
      case "production":
        return this.production();
      case "development":
        return this.development();
      case "test":
        return this.silent();
      default:
        return this.development();
    }
  }

  static forBaileys() {
    const level = process.env.NODE_ENV === "production" ? "error" : "warn"
    return P({
      level,
      timestamp: () => `,"time":"${new Date().toJSON()}"`,
    }).child({
      component: "baileys",
    });
  }
}

export const appLogger = LoggerConfig.auto();
export const whatsappLogger = LoggerConfig.forBaileys();
