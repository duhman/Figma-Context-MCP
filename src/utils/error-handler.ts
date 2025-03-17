/**
 * Error handling utilities for the Figma MCP Server
 * Provides standardized error handling and response formatting
 */

import { Logger } from './logger';

/**
 * Standard error response structure for MCP tools
 */
export interface ErrorResponse {
  isError: true;
  content: Array<{ type: 'text'; text: string }>;
  // Add index signature to satisfy MCP server type requirements
  [key: string]: unknown;
}

/**
 * Error types that can occur in the Figma MCP Server
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  FIGMA_API = 'FIGMA_API',
  FILE_SYSTEM = 'FILE_SYSTEM',
  NETWORK = 'NETWORK',
  UNEXPECTED = 'UNEXPECTED'
}

/**
 * Creates a standardized error response for MCP tools
 * @param message - The error message to include in the response
 * @param errorType - The type of error that occurred
 * @param originalError - The original error object (for logging)
 * @returns A standardized error response object
 */
export function createErrorResponse(
  message: string,
  errorType: ErrorType,
  originalError?: unknown
): ErrorResponse {
  // Log the error with appropriate level based on type
  if (originalError) {
    switch (errorType) {
      case ErrorType.VALIDATION:
        Logger.warning(`${errorType} Error: ${message}`, originalError);
        break;
      default:
        Logger.error(`${errorType} Error: ${message}`, originalError);
    }
  } else {
    switch (errorType) {
      case ErrorType.VALIDATION:
        Logger.warning(`${errorType} Error: ${message}`);
        break;
      default:
        Logger.error(`${errorType} Error: ${message}`);
    }
  }

  return {
    isError: true,
    content: [{ type: 'text', text: message }]
  };
}

/**
 * Handles errors from the Figma API
 * @param error - The error object from the Figma API
 * @param context - Additional context about the operation that failed
 * @returns A standardized error response
 */
export function handleFigmaApiError(error: unknown, context: string): ErrorResponse {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return createErrorResponse(
    `Error in Figma API (${context}): ${errorMessage}. Please check your inputs and try again.`,
    ErrorType.FIGMA_API,
    error
  );
}

/**
 * Handles validation errors
 * @param errorMessage - The validation error message
 * @returns A standardized error response
 */
export function handleValidationError(errorMessage: string): ErrorResponse {
  return createErrorResponse(
    errorMessage,
    ErrorType.VALIDATION
  );
}

/**
 * Handles file system errors
 * @param error - The file system error
 * @param context - Additional context about the operation that failed
 * @returns A standardized error response
 */
export function handleFileSystemError(error: unknown, context: string): ErrorResponse {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return createErrorResponse(
    `File system error (${context}): ${errorMessage}`,
    ErrorType.FILE_SYSTEM,
    error
  );
}

/**
 * Handles unexpected errors
 * @param error - The unexpected error
 * @param context - Additional context about where the error occurred
 * @returns A standardized error response
 */
export function handleUnexpectedError(error: unknown, context: string): ErrorResponse {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return createErrorResponse(
    `Unexpected error in ${context}: ${errorMessage}`,
    ErrorType.UNEXPECTED,
    error
  );
}
