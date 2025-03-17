# Error Handling in Figma MCP Server

This document describes the error handling approach used in the Figma MCP Server, including best practices, error types, and how to interpret error messages.

## Error Handling Architecture

The Figma MCP Server implements a comprehensive error handling system that provides:

1. **Standardized Error Responses**: All errors follow a consistent format that includes an error message, error type, and additional context.
2. **Detailed Logging**: Errors are logged with appropriate severity levels and include stack traces when available.
3. **User-Friendly Messages**: Error messages are designed to be clear and actionable, helping users understand what went wrong and how to fix it.
4. **Error Categorization**: Errors are categorized by type to help with debugging and monitoring.

## Error Types

The server categorizes errors into the following types:

| Error Type | Description | Example |
|------------|-------------|---------|
| `VALIDATION` | Errors related to invalid input parameters | Invalid file key format, missing required parameters |
| `FIGMA_API` | Errors from the Figma API | Authentication failures, rate limiting, resource not found |
| `FILE_SYSTEM` | Errors related to file system operations | Permission denied, file not found, disk full |
| `NETWORK` | Errors related to network operations | Connection timeout, DNS resolution failure |
| `UNEXPECTED` | Unexpected errors that don't fit other categories | Runtime exceptions, unhandled edge cases |

## Error Response Format

All error responses follow this structure:

```typescript
interface ErrorResponse {
  isError: true;
  content: Array<{ type: 'text'; text: string }>;
  [key: string]: unknown; // Additional properties as needed
}
```

The `isError: true` flag allows clients to easily identify error responses, while the `content` array provides a human-readable error message.

## Common Error Messages and Solutions

### Validation Errors

- **"Invalid file key format"**: Ensure the file key follows the correct format (alphanumeric characters). Extract it from the Figma URL after `/file/`.
- **"Invalid node ID format"**: Node IDs should be in the format `123:456`, not `123-456` or any other format.
- **"Missing required parameter"**: Check that all required parameters are provided in your request.

### Figma API Errors

- **"Authentication failed"**: Verify your Figma API key is valid and has the necessary permissions.
- **"Rate limit exceeded"**: The Figma API has rate limits. Wait a few minutes and try again, or reduce the frequency of your requests.
- **"File not found"**: Confirm the file key is correct and that you have access to the file in Figma.
- **"Node not found"**: Verify the node ID exists in the specified file.

### Connection Errors

- **"SSE connection failed"**: This could be due to CORS issues if accessing from a different origin. Use the built-in test page at `http://localhost:3333/` to avoid CORS problems.
- **"Stream is not readable"**: The SSE connection might not be fully established. Wait for the connection to be ready before sending requests.

## Best Practices for Error Handling

### For Developers

1. **Always use the error-handler utilities**: Don't create ad-hoc error responses. Use the provided utility functions to ensure consistent error handling.
2. **Provide context in error messages**: Include information about what operation was being performed when the error occurred.
3. **Log appropriately**: Use the correct severity level for logging (warning for validation errors, error for more serious issues).
4. **Catch and handle exceptions**: Wrap operations in try/catch blocks and use the appropriate error handler for the type of error.

### For Users

1. **Check input parameters**: Ensure all parameters are correctly formatted and valid.
2. **Use the built-in test page**: The test page at `http://localhost:3333/` provides a user-friendly interface for testing and debugging.
3. **Enable debug mode**: When troubleshooting, enable debug mode to see detailed logs of requests and responses.
4. **Check server logs**: Server logs contain valuable information about errors and can help identify the root cause.

## Extending the Error Handling System

To add new error types or handlers:

1. Add the new error type to the `ErrorType` enum in `src/utils/error-handler.ts`.
2. Create a new handler function following the pattern of existing handlers.
3. Update this documentation to include information about the new error type.

## Example: Handling Errors in Tool Implementations

```typescript
import { handleFigmaApiError, handleValidationError } from '../utils/error-handler';

export async function get_figma_data(params: any) {
  // Validate parameters
  if (!params.fileKey || typeof params.fileKey !== 'string') {
    return handleValidationError('Missing or invalid fileKey parameter');
  }

  try {
    // Make API request
    const response = await figmaService.getFileData(params.fileKey, params.nodeId);
    return response;
  } catch (error) {
    return handleFigmaApiError(error, `fetching file ${params.fileKey}`);
  }
}
```

## Conclusion

The error handling system in the Figma MCP Server is designed to provide clear, actionable feedback when issues occur. By following the best practices outlined in this document, you can ensure a consistent and user-friendly experience when errors are encountered.
