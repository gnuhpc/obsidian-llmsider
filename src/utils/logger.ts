/**
 * Logger utility for LLMSider plugin
 * Provides a centralized logging system with debug mode control
 */

export class Logger {
  private static debugEnabled = false;

  /**
   * Set whether debug logging is enabled
   */
  static setDebugEnabled(enabled: boolean): void {
    Logger.debugEnabled = enabled;
  }

  /**
   * Check if debug logging is enabled
   */
  static isDebugEnabled(): boolean {
    return Logger.debugEnabled;
  }

  /**
   * Log debug message (only shown when debug mode is enabled)
   */
  static debug(message: string, ...args: unknown[]): void {
    if (Logger.debugEnabled) {
      console.log(`[LLMSider DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Log info message (only shown when debug mode is enabled)
   */
  static info(message: string, ...args: unknown[]): void {
    if (Logger.debugEnabled) {
      console.log(`[LLMSider INFO] ${message}`, ...args);
    }
  }

  /**
   * Log warning message
   */
  static warn(message: string, ...args: unknown[]): void {
    if (Logger.debugEnabled) {
      console.warn(`[LLMSider WARN] ${message}`, ...args);
    }
  }

  /**
   * Log error message (always shown)
   */
  static error(message: string, ...args: unknown[]): void {
    console.error(`[LLMSider ERROR] ${message}`, ...args);
  }

  /**
   * Log a message with custom prefix (only shown when debug mode is enabled)
   */
  static log(prefix: string, message: string, ...args: unknown[]): void {
    if (Logger.debugEnabled) {
      console.log(`[${prefix}] ${message}`, ...args);
    }
  }
}
