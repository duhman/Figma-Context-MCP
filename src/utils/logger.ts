/**
 * Enhanced logging utility for the Figma MCP Server
 * Provides structured logging with different severity levels and context
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Logging levels in order of increasing severity
export type LogLevel = "debug" | "info" | "notice" | "warning" | "error" | "critical" | "alert" | "emergency";

export class Logger {
  private static server: McpServer | null = null;
  private static isHttpMode = false;

  /**
   * Initialize the logger with an MCP server instance
   * @param server - The MCP server instance to send logs to, or null to use console only
   * @param isHttpMode - Whether the server is running in HTTP mode
   */
  public static initialize(server: McpServer | null, isHttpMode: boolean): void {
    this.server = server;
    this.isHttpMode = isHttpMode;
  }

  /**
   * Log a debug message (level 0)
   * @param message - The message to log
   * @param context - Additional context data
   */
  public static debug(message: string, ...context: any[]): void {
    this.log("debug", message, ...context);
  }

  /**
   * Log an info message (level 1)
   * @param message - The message to log
   * @param context - Additional context data
   */
  public static info(message: string, ...context: any[]): void {
    this.log("info", message, ...context);
  }

  /**
   * Log a notice message (level 2)
   * @param message - The message to log
   * @param context - Additional context data
   */
  public static notice(message: string, ...context: any[]): void {
    this.log("notice", message, ...context);
  }

  /**
   * Log a warning message (level 3)
   * @param message - The message to log
   * @param context - Additional context data
   */
  public static warning(message: string, ...context: any[]): void {
    this.log("warning", message, ...context);
  }

  /**
   * Log an error message (level 4)
   * @param message - The message to log
   * @param context - Additional context data
   */
  public static error(message: string, ...context: any[]): void {
    this.log("error", message, ...context);
  }

  /**
   * Log a critical message (level 5)
   * @param message - The message to log
   * @param context - Additional context data
   */
  public static critical(message: string, ...context: any[]): void {
    this.log("critical", message, ...context);
  }

  /**
   * Log an alert message (level 6)
   * @param message - The message to log
   * @param context - Additional context data
   */
  public static alert(message: string, ...context: any[]): void {
    this.log("alert", message, ...context);
  }

  /**
   * Log an emergency message (level 7)
   * @param message - The message to log
   * @param context - Additional context data
   */
  public static emergency(message: string, ...context: any[]): void {
    this.log("emergency", message, ...context);
  }

  /**
   * Internal method to handle logging with different levels
   * @param level - The log level
   * @param message - The message to log
   * @param context - Additional context data
   */
  private static log(level: LogLevel, message: string, ...context: any[]): void {
    // If server is available and connected, send the log through MCP
    if (this.server && this.server.server) {
      try {
        this.server.server.sendLoggingMessage({
          level,
          data: [message, ...context],
        });
      } catch (error) {
        // Fallback to console if sending to MCP fails
        this.logToConsole(level, message, ...context);
      }
    } else {
      // If no server or in HTTP mode, use console directly
      this.logToConsole(level, message, ...context);
    }
  }
  
  /**
   * Maps MCP log levels to console methods
   * @param level - The log level
   * @param message - The message to log
   * @param context - Additional context data
   */
  private static logToConsole(level: LogLevel, message: string, ...context: any[]): void {
    // Map MCP log levels to console methods
    const consoleMethodMap: Record<LogLevel, 'log' | 'info' | 'warn' | 'error' | 'debug'> = {
      debug: "debug",
      info: "info",
      notice: "info",      // Map notice to info
      warning: "warn",     // Map warning to warn
      error: "error",
      critical: "error",   // Map critical to error
      alert: "error",      // Map alert to error
      emergency: "error"   // Map emergency to error
    };
    
    const method = consoleMethodMap[level];
    switch (method) {
      case 'debug':
        console.debug(message, ...context);
        break;
      case 'info':
        console.info(message, ...context);
        break;
      case 'warn':
        console.warn(message, ...context);
        break;
      case 'error':
        console.error(message, ...context);
        break;
      default:
        console.log(message, ...context);
        break;
    }
  }
}
