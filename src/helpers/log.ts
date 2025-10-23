import type { Logger } from 'vite'
import { blue, bold } from 'kolorist'

export function logMessage(message: string): string {
  return `${bold(blue('[vite-plugin-svg-spritemap]'))} ${message}`
}

/**
 * Logs a message to the console with a standardized prefix.
 * @param obj - The log object containing level, message, and logger.
 * @param obj.level - The log level ('info', 'warn', 'error').
 * @param obj.message - The message to log.
 * @param obj.logger - The Vite logger instance.
 */
export function log(obj: { level: 'info' | 'warn' | 'error', message: string, logger: Logger }): void {
  obj.logger[obj.level](logMessage(obj.message))
}
