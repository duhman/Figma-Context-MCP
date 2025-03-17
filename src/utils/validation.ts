/**
 * Input validation utilities for Figma MCP Server
 * Provides functions to validate and sanitize input parameters
 */

import { Logger } from './logger';

/**
 * Validates a Figma file key format
 * @param fileKey - The file key to validate
 * @returns True if valid, false otherwise
 */
export function isValidFileKey(fileKey: string): boolean {
  // Figma file keys are typically alphanumeric strings
  // They should not contain special characters except possibly hyphens or underscores
  const fileKeyRegex = /^[a-zA-Z0-9_-]+$/;
  return fileKeyRegex.test(fileKey);
}

/**
 * Validates a Figma node ID format
 * @param nodeId - The node ID to validate
 * @returns True if valid, false otherwise
 */
export function isValidNodeId(nodeId: string): boolean {
  // Figma node IDs typically have a format like "123:456" (number:number)
  const nodeIdRegex = /^\d+:\d+$/;
  return nodeIdRegex.test(nodeId);
}

/**
 * Validates a local file path
 * @param path - The path to validate
 * @returns True if valid, false otherwise
 */
export function isValidLocalPath(path: string): boolean {
  // Basic path validation - should not contain certain dangerous characters
  // This is a simplified check and may need to be enhanced based on specific requirements
  const invalidChars = /[<>:"|?*]/;
  return !invalidChars.test(path);
}

/**
 * Validates a filename
 * @param filename - The filename to validate
 * @returns True if valid, false otherwise
 */
export function isValidFilename(filename: string): boolean {
  // Filenames should not contain certain special characters
  const invalidChars = /[<>:"|?*\/\\]/;
  return !invalidChars.test(filename);
}

/**
 * Validates input parameters for the get_figma_data tool
 * @param fileKey - The file key to validate
 * @param nodeId - Optional node ID to validate
 * @param depth - Optional depth parameter to validate
 * @returns An object with validation result and error message if invalid
 */
export function validateGetFigmaDataInput(
  fileKey: string, 
  nodeId?: string, 
  depth?: number
): { isValid: boolean; errorMessage?: string } {
  if (!fileKey || !isValidFileKey(fileKey)) {
    return { 
      isValid: false, 
      errorMessage: `Invalid file key format: ${fileKey}. File keys should be alphanumeric with possible hyphens or underscores.` 
    };
  }

  if (nodeId && !isValidNodeId(nodeId)) {
    return { 
      isValid: false, 
      errorMessage: `Invalid node ID format: ${nodeId}. Node IDs should be in the format "number:number".` 
    };
  }

  if (depth !== undefined && (typeof depth !== 'number' || depth < 0)) {
    return { 
      isValid: false, 
      errorMessage: `Invalid depth: ${depth}. Depth should be a non-negative number.` 
    };
  }

  return { isValid: true };
}

/**
 * Validates input parameters for the download_figma_images tool
 * @param fileKey - The file key to validate
 * @param nodes - The nodes array to validate
 * @param localPath - The local path to validate
 * @returns An object with validation result and error message if invalid
 */
export function validateDownloadFigmaImagesInput(
  fileKey: string,
  nodes: Array<{ nodeId: string; imageRef?: string; fileName: string }>,
  localPath: string
): { isValid: boolean; errorMessage?: string } {
  if (!fileKey || !isValidFileKey(fileKey)) {
    return { 
      isValid: false, 
      errorMessage: `Invalid file key format: ${fileKey}. File keys should be alphanumeric with possible hyphens or underscores.` 
    };
  }

  if (!Array.isArray(nodes) || nodes.length === 0) {
    return { 
      isValid: false, 
      errorMessage: 'Nodes array is empty or invalid. At least one node must be specified.' 
    };
  }

  for (const node of nodes) {
    if (!node.nodeId || !isValidNodeId(node.nodeId)) {
      return { 
        isValid: false, 
        errorMessage: `Invalid node ID format: ${node.nodeId}. Node IDs should be in the format "number:number".` 
      };
    }

    if (!node.fileName || !isValidFilename(node.fileName)) {
      return { 
        isValid: false, 
        errorMessage: `Invalid file name: ${node.fileName}. File names should not contain special characters.` 
      };
    }
  }

  if (!localPath || !isValidLocalPath(localPath)) {
    return { 
      isValid: false, 
      errorMessage: `Invalid local path: ${localPath}. Path should not contain invalid characters.` 
    };
  }

  return { isValid: true };
}
