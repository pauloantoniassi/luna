import P from "pino";

/**
 * Configurações de logger para diferentes ambientes
 */
export class LoggerConfig {
  /**
   * Logger silencioso - suprime todos os logs
   * Útil para testes ou quando você quer desabilitar completamente os logs
   */
  static silent() {
    return P({
      level: "silent",
      timestamp: () => `,"time":"${new Date().toJSON()}"`,
    });
  }

  /**
   * Logger para produção - apenas erros críticos
   * Mostra apenas logs de error e fatal
   */
  static production() {
    return P({
      level: "error",
      timestamp: () => `,"time":"${new Date().toJSON()}"`,
    });
  }

  /**
   * Logger para desenvolvimento - logs essenciais
   * Mostra warn, error e fatal
   */
  static development() {
    return P({
      level: "warn",
      timestamp: () => `,"time":"${new Date().toJSON()}"`,
    });
  }

  /**
   * Logger para debug - todos os logs
   * Mostra trace, debug, info, warn, error e fatal
   */
  static debug() {
    return P({
      level: "debug",
      timestamp: () => `,"time":"${new Date().toJSON()}"`,
    });
  }

  /**
   * Logger automático baseado no NODE_ENV
   */
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

  /**
   * Logger específico para o Baileys com configurações otimizadas
   * @param level - Nível de log desejado ('silent', 'error', 'warn', 'info', 'debug', 'trace')
   */
  static forBaileys(level: "silent" | "error" | "warn" | "info" | "debug" | "trace" = "error") {
    return P({
      level,
      timestamp: () => `,"time":"${new Date().toJSON()}"`,
    }).child({
      component: "baileys",
    });
  }
}

/**
 * Logger padrão da aplicação
 */
export const appLogger = LoggerConfig.auto();

/**
 * Logger para o WhatsApp/Baileys
 * Por padrão, usa apenas logs de erro em produção e warn em desenvolvimento
 */
export const whatsappLogger = LoggerConfig.forBaileys(
  process.env.NODE_ENV === "production" ? "error" : "warn"
);
