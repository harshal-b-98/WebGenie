// Structured logging utility

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  userId?: string;
  workspaceId?: string;
  siteId?: string;
  conversationId?: string;
  [key: string]: unknown;
}

class Logger {
  private log(level: LogLevel, message: string, context?: LogContext) {
    const logData = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
    };

    // In development, pretty print
    if (process.env.NODE_ENV === "development") {
      const emoji = {
        debug: "🔍",
        info: "ℹ️",
        warn: "⚠️",
        error: "❌",
      }[level];

      console.log(`${emoji} [${level.toUpperCase()}] ${message}`);
      if (context && Object.keys(context).length > 0) {
        console.log("  Context:", context);
      }
    } else {
      // In production, JSON format for log aggregation
      console.log(JSON.stringify(logData));
    }
  }

  debug(message: string, context?: LogContext) {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext) {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log("warn", message, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorContext = {
      ...context,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : error,
    };
    this.log("error", message, errorContext);
  }
}

export const logger = new Logger();
