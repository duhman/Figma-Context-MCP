# Figma MCP Server

Give [Cursor](https://cursor.sh/), [Windsurf](https://codeium.com/windsurf), [Cline](https://cline.bot/), and other AI-powered coding tools access to your Figma files with this [Model Context Protocol](https://modelcontextprotocol.io/introduction) server.

When Cursor has access to Figma design data, it's **way** better at one-shotting designs accurately than alternative approaches like pasting screenshots.

Get started quickly, see [Configuration](#configuration) for more details:

```bash
npx figma-developer-mcp --figma-api-key=<your-figma-api-key>
```

## Demo Video

[Watch a demo of building a UI in Cursor with Figma design data](https://youtu.be/6G9yb-LrEqg)
[![Watch the video](https://img.youtube.com/vi/6G9yb-LrEqg/maxresdefault.jpg)](https://youtu.be/6G9yb-LrEqg)

[![Figma Server MCP server](https://glama.ai/mcp/servers/kcftotr525/badge)](https://glama.ai/mcp/servers/kcftotr525)

## How it works

1. Open Cursor's composer in agent mode.
1. Paste a link to a Figma file, frame, or group.
1. Ask Cursor to do something with the Figma file—e.g. implement a design.
1. Cursor will fetch the relevant metadata from Figma and use it to write your code.

This MCP server is specifically designed for use with Cursor. Before responding with context from the [Figma API](https://www.figma.com/developers/api), it simplifies and translates the response so only the most relevant layout and styling information is provided to the model.

Reducing the amount of context provided to the model helps make the AI more accurate and the responses more relevant.

## Installation

### Running the server quickly with NPM

You can run the server quickly without installing or building the repo using NPM:

```bash
npx figma-developer-mcp --figma-api-key=<your-figma-api-key>

# or
pnpx figma-developer-mcp --figma-api-key=<your-figma-api-key>

# or
yarn dlx figma-developer-mcp --figma-api-key=<your-figma-api-key>

# or
bunx figma-developer-mcp --figma-api-key=<your-figma-api-key>
```

Instructions on how to create a Figma API access token can be found [here](https://help.figma.com/hc/en-us/articles/8085703771159-Manage-personal-access-tokens).

### JSON config for tools that use configuration files

Many tools like Windsurf, Cline, and [Claude Desktop](https://claude.ai/download) use a configuration file to start the server.

The `figma-developer-mcp` server can be configured by adding the following to your configuration file:

```json
{
  "mcpServers": {
    "figma-developer-mcp": {
      "command": "npx",
      "args": ["-y", "figma-developer-mcp", "--stdio"],
      "env": {
        "FIGMA_API_KEY": "<your-figma-api-key>"
      }
    }
  }
}
```

### Running the server from local source

1. Clone the [repository](https://github.com/GLips/Figma-Context-MCP)
2. Install dependencies with `pnpm install`
3. Copy `.env.example` to `.env` and fill in your [Figma API access token](https://help.figma.com/hc/en-us/articles/8085703771159-Manage-personal-access-tokens). Only read access is required.
4. Run the server with `pnpm run dev`, along with any of the flags from the [Command-line Arguments](#command-line-arguments) section.

## Configuration

The server can be configured using either environment variables (via `.env` file) or command-line arguments. Command-line arguments take precedence over environment variables.

### Environment Variables

- `FIGMA_API_KEY`: Your [Figma API access token](https://help.figma.com/hc/en-us/articles/8085703771159-Manage-personal-access-tokens) (required)
- `PORT`: The port to run the server on (default: 3333)

### Command-line Arguments

- `--version`: Show version number
- `--figma-api-key`: Your Figma API access token
- `--port`: The port to run the server on
- `--stdio`: Run the server in command mode, instead of default HTTP/SSE
- `--help`: Show help menu

## Connecting to Cursor

### Start the server

```bash
> npx figma-developer-mcp --figma-api-key=<your-figma-api-key>
# Initializing Figma MCP Server in HTTP mode on port 3333...
# HTTP server listening on port 3333
# SSE endpoint available at http://localhost:3333/sse
# Message endpoint available at http://localhost:3333/messages
```

### Connect Cursor to the MCP server

Once the server is running, [connect Cursor to the MCP server](https://docs.cursor.com/context/model-context-protocol) in Cursor's settings, under the features tab.

![Connecting to MCP server in Cursor](./docs/cursor-MCP-settings.png)

After the server has been connected, you can confirm Cursor's has a valid connection before getting started. If you get a green dot and the tools show up, you're good to go!

![Confirming connection in Cursor](./docs/verify-connection.png)

### Start using Composer with your Figma designs

Once the MCP server is connected, **you can start using the tools in Cursor's composer, as long as the composer is in agent mode.**

Dropping a link to a Figma file in the composer and asking Cursor to do something with it should automatically trigger the `get_file` tool.

Most Figma files end up being huge, so you'll probably want to link to a specific frame or group within the file. With a single element selected, you can hit `CMD + L` to copy the link to the element. You can also find it in the context menu:

![Copy link to Figma selection by right clicking](./docs/figma-copy-link.png)

Once you have a link to a specific element, you can drop it in the composer and ask Cursor to do something with it.

## Inspect Responses

To inspect responses from the MCP server more easily, you can run the `inspect` command, which launches the `@modelcontextprotocol/inspector` web UI for triggering tool calls and reviewing responses:

```bash
pnpm inspect
# > figma-mcp@0.1.8 inspect
# > pnpx @modelcontextprotocol/inspector
#
# Starting MCP inspector...
# Proxy server listening on port 3333
#
# 🔍 MCP Inspector is up and running at http://localhost:5173 🚀
```

## Available Tools

The server provides the following MCP tools:

### get_figma_data

Retrieve design information from a Figma file. This tool can fetch either an entire file or a specific node within a file. Use this to analyze designs, extract layout information, styles, and component hierarchies.

Parameters:

- `fileKey` (string, required): The key of the Figma file to fetch. This is a required parameter and can be extracted from a Figma URL. Example: In `https://www.figma.com/file/abcd1234/MyDesign`, the fileKey is `abcd1234`.
- `nodeId` (string, optional, **highly recommended**): The ID of a specific node to fetch within the file. This is optional and typically found as a URL parameter 'node-id=123:456'. If not provided, the entire file structure will be returned. Always use this parameter when available for more targeted results.
- `depth` (number, optional): Controls how many levels of child nodes to include in the response. Default is to include all levels. Use smaller values (1-3) for large files to improve performance. Only specify this parameter when explicitly requested or when dealing with very large files.

### download_figma_images

Download SVG and PNG images from a Figma file to a local directory. This tool can retrieve both vector graphics (as SVG) and raster images (as PNG) used in designs. Use this to extract icons, illustrations, or any visual assets from a Figma file for implementation in a project.

Parameters:

- `fileKey` (string, required): The key of the Figma file containing the images. This is a required parameter extracted from the Figma URL (e.g., `abcd1234` from `https://www.figma.com/file/abcd1234/MyDesign`).
- `nodes` (array, required): An array of image nodes to download. Each object must specify nodeId and fileName, with imageRef required only for image fills.
  - `nodeId` (string, required): The ID of the Figma node to fetch as an image, formatted as '1234:5678'. This is the unique identifier for the element in the Figma file.
  - `imageRef` (string, optional): For nodes with image fills (like rectangles with background images), provide the imageRef value from the node data. Required only for image fills. Leave blank for vector nodes (SVGs) or direct image nodes.
  - `fileName` (string, required): The filename to use when saving the image locally. Include the appropriate extension (.svg or .png) based on the desired output format.
- `localPath` (string, required): The absolute path to the directory where images will be saved (e.g., '/path/to/project/assets/images'). The tool will automatically create this directory and any parent directories if they don't exist.

## Recent Improvements

### Version 0.1.8 Updates

- **Enhanced Error Handling**: Improved error handling with structured error responses that provide clear guidance on what went wrong and how to fix it.
- **Input Validation**: Added robust input validation to ensure all parameters are correctly formatted before processing, preventing common errors.
- **Improved Logging**: Implemented a comprehensive logging system with different severity levels for better debugging and monitoring.
- **Updated MCP SDK**: Updated to the latest MCP SDK (version 1.7.0) to leverage the newest features and improvements.
- **Better Documentation**: Enhanced tool descriptions and parameter documentation to provide clearer guidance for AI assistants on proper usage.
- **Integrated Test Page**: Added a built-in test page accessible directly from the server for easier debugging and testing.
- **Connection Management**: Implemented proper connection readiness checks and timing to ensure stable SSE connections.
- **Same-Origin Architecture**: Eliminated cross-origin issues by serving the test interface from the same server.

## Testing and Debugging

### Built-in Test Interface

The server now includes a built-in test interface that allows you to interact with the Figma MCP server directly from your browser. This makes it easier to test and debug your setup without needing external tools.

To access the test interface:

1. Start the server as described in the [Configuration](#configuration) section
2. Open your browser and navigate to `http://localhost:3333/` (or whatever port you've configured)
3. Use the interface to connect to the SSE endpoint and send requests to the Figma API

### Connection Management

The server implements several features to ensure stable and reliable SSE connections:

1. **Connection Readiness**: The server waits for the SSE connection to be fully established before allowing requests to be sent. This prevents "stream is not readable" errors that can occur when requests are sent too early.

2. **Same-Origin Architecture**: The test interface is served directly from the Express server, eliminating cross-origin issues that can occur with EventSource connections.

3. **Detailed Error Reporting**: When connection issues occur, the server provides detailed error messages that help identify the root cause, such as CORS issues or invalid parameters.

4. **Heartbeat Messages**: The server sends regular heartbeat messages to keep the SSE connection alive and detect disconnections early.

### Test Interface Features

- **SSE Connection Management**: Connect to and disconnect from the SSE endpoint with a single click
- **Request Builder**: Easily construct requests to the Figma API with proper parameter validation
- **Debug Mode**: Toggle detailed logging to see exactly what's happening with your requests
- **Response Viewer**: View formatted responses from the Figma API
- **Error Handling**: Clear error messages help you understand and fix issues quickly

### Error Handling

The server implements robust error handling to provide clear guidance when issues occur:

1. **Structured Error Responses**: All errors are returned in a consistent format with a message, error type, and additional details when available.

2. **Input Validation**: Parameters are validated before processing to catch common errors like invalid file keys or node IDs.

3. **API Error Translation**: Errors from the Figma API are translated into more user-friendly messages that provide clear guidance on how to resolve the issue.

4. **Logging**: Detailed logs are generated at different severity levels to help diagnose issues during development and production.

### Troubleshooting

If you encounter issues with the Figma MCP server, here are some common troubleshooting steps:

1. **Check your Figma API key**: Ensure your API key is valid and has the necessary permissions.
2. **Verify server logs**: Check the console output for any error messages or warnings.
3. **Test with the built-in interface**: Use the test interface at `http://localhost:3333/` to verify the server is working correctly.
4. **Validate node IDs**: Ensure node IDs are in the correct format (e.g., `0:1` not `0-1`).
5. **Check network connectivity**: Ensure your firewall isn't blocking connections to the Figma API.
6. **Restart the server**: Sometimes simply restarting the server can resolve connection issues.
7. **Enable debug mode**: In the test interface, enable debug mode to see detailed logs of the requests and responses.
8. **Check for CORS issues**: If you're accessing the server from a different origin, ensure CORS is properly configured.
