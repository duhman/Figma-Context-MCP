import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FigmaService } from "./services/figma";
import express, { Request, Response } from "express";
import cors from "cors";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { IncomingMessage, ServerResponse } from "http";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { SimplifiedDesign } from "./services/simplify-node-response";
import { Logger } from "./utils/logger";
import { validateGetFigmaDataInput, validateDownloadFigmaImagesInput } from "./utils/validation";
import { handleFigmaApiError, handleValidationError, handleUnexpectedError } from "./utils/error-handler";

export class FigmaMcpServer {
  private readonly server: McpServer;
  private readonly figmaService: FigmaService;
  private sseTransport: SSEServerTransport | null = null;

  constructor(figmaApiKey: string) {
    this.figmaService = new FigmaService(figmaApiKey);
    this.server = new McpServer(
      {
        name: "Figma MCP Server",
        version: "0.1.8",
      },
      {
        capabilities: {
          // Enable logging support with INFO level by default
          logging: {
            defaultLevel: "info"
          },
          // Enable tools support with list changes notifications
          tools: {
            listChangesNotifications: true
          },
          // We don't currently support resources, but could add in the future
          // resources: {
          //   listChangesNotifications: true,
          //   contentChangesNotifications: true
          // },
        },
      },
    );

    // Initialize logger with the server instance
    Logger.initialize(this.server, false);
    
    this.registerTools();
  }

  private registerTools(): void {
    // Tool to get file information
    this.server.tool(
      "get_figma_data",
      "Retrieve design information from a Figma file. This tool can fetch either an entire file or a specific node within a file. Use this to analyze designs, extract layout information, styles, and component hierarchies. If you need specific node details, provide the nodeId parameter; otherwise, the entire file structure will be returned.",
      {
        fileKey: z
          .string()
          .describe(
            "The key of the Figma file to fetch. This is a required parameter and can be extracted from a Figma URL. Example: In 'https://www.figma.com/file/abcd1234/MyDesign', the fileKey is 'abcd1234'.",
          ),
        nodeId: z
          .string()
          .optional()
          .describe(
            "The ID of a specific node to fetch within the file. This is optional and typically found as a URL parameter 'node-id=123:456'. If not provided, the entire file structure will be returned. Always use this parameter when available for more targeted results.",
          ),
        depth: z
          .number()
          .optional()
          .describe(
            "Controls how many levels of child nodes to include in the response. Default is to include all levels. Use smaller values (1-3) for large files to improve performance. Only specify this parameter when explicitly requested or when dealing with very large files.",
          ),
      },
      async ({ fileKey, nodeId, depth }) => {
        try {
          // Validate input parameters
          const validation = validateGetFigmaDataInput(fileKey, nodeId, depth);
          if (!validation.isValid) {
            return handleValidationError(validation.errorMessage || 'Invalid input parameters for get_figma_data');
          }
          
          Logger.info(
            `Fetching ${
              depth ? `${depth} layers deep` : "all layers"
            } of ${nodeId ? `node ${nodeId} from file` : `full file`} ${fileKey} at depth: ${
              depth ?? "all layers"
            }`,
          );

          let file: SimplifiedDesign;
          if (nodeId) {
            file = await this.figmaService.getNode(fileKey, nodeId, depth);
          } else {
            file = await this.figmaService.getFile(fileKey, depth);
          }

          Logger.info(`Successfully fetched file: ${file.name}`);
          const { nodes, globalVars, ...metadata } = file;

          // Stringify each node individually to try to avoid max string length error with big files
          const nodesJson = `[${nodes.map((node) => JSON.stringify(node, null, 2)).join(",")}]`;
          const metadataJson = JSON.stringify(metadata, null, 2);
          const globalVarsJson = JSON.stringify(globalVars, null, 2);
          const resultJson = `{ "metadata": ${metadataJson}, "nodes": ${nodesJson}, "globalVars": ${globalVarsJson} }`;

          return {
            content: [{ type: "text", text: resultJson }],
          };
        } catch (error) {
          return handleFigmaApiError(error, `fetching file ${fileKey}`);
        }
      },
    );

    // TODO: Clean up all image download related code, particularly getImages in Figma service
    // Tool to download images
    this.server.tool(
      "download_figma_images",
      "Download SVG and PNG images from a Figma file to a local directory. This tool can retrieve both vector graphics (as SVG) and raster images (as PNG) used in designs. Use this to extract icons, illustrations, or any visual assets from a Figma file for implementation in a project. The tool handles both direct image nodes and image fills within other elements.",
      {
        fileKey: z.string().describe("The key of the Figma file containing the images. This is a required parameter extracted from the Figma URL (e.g., 'abcd1234' from 'https://www.figma.com/file/abcd1234/MyDesign')."),
        nodes: z
          .object({
            nodeId: z
              .string()
              .describe("The ID of the Figma node to fetch as an image, formatted as '1234:5678'. This is the unique identifier for the element in the Figma file."),
            imageRef: z
              .string()
              .optional()
              .describe(
                "For nodes with image fills (like rectangles with background images), provide the imageRef value from the node data. Required only for image fills. Leave blank for vector nodes (SVGs) or direct image nodes.",
              ),
            fileName: z.string().describe("The filename to use when saving the image locally. Include the appropriate extension (.svg or .png) based on the desired output format."),
          })
          .array()
          .describe("An array of image nodes to download. Each object must specify nodeId and fileName, with imageRef required only for image fills."),
        localPath: z
          .string()
          .describe(
            "The absolute path to the directory where images will be saved (e.g., '/path/to/project/assets/images'). The tool will automatically create this directory and any parent directories if they don't exist.",
          ),
      },
      async ({ fileKey, nodes, localPath }) => {
        try {
          // Validate input parameters
          const validation = validateDownloadFigmaImagesInput(fileKey, nodes, localPath);
          if (!validation.isValid) {
            return handleValidationError(validation.errorMessage || 'Invalid input parameters for download_figma_images');
          }
          const imageFills = nodes.filter(({ imageRef }) => !!imageRef) as {
            nodeId: string;
            imageRef: string;
            fileName: string;
          }[];
          const fillDownloads = this.figmaService.getImageFills(fileKey, imageFills, localPath);
          const renderRequests = nodes
            .filter(({ imageRef }) => !imageRef)
            .map(({ nodeId, fileName }) => ({
              nodeId,
              fileName,
              fileType: fileName.endsWith(".svg") ? ("svg" as const) : ("png" as const),
            }));

          const renderDownloads = this.figmaService.getImages(fileKey, renderRequests, localPath);

          const downloads = await Promise.all([fillDownloads, renderDownloads]).then(([f, r]) => [
            ...f,
            ...r,
          ]);

          // If any download fails, return false
          const saveSuccess = !downloads.find((success) => !success);
          return {
            content: [
              {
                type: "text",
                text: saveSuccess
                  ? `Success, ${downloads.length} images downloaded: ${downloads.join(", ")}`
                  : "Failed",
              },
            ],
          };
        } catch (error) {
          return handleFigmaApiError(error, `downloading images from file ${fileKey}`);
        }
      },
    );
  }

  async connect(transport: Transport): Promise<void> {
    // Logger.log("Connecting to transport...");
    await this.server.connect(transport);

    // Initialize the Logger with the server instance
    Logger.initialize(this.server, false);

    Logger.info("Server connected and ready to process requests");
  }

  async startHttpServer(port: number): Promise<void> {
    const app = express();
    
    // Enable CORS for all routes
    app.use(cors({
      origin: '*', // Allow all origins
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type']
    }));
    
    app.use(express.json());

    app.get("/sse", async (req: Request, res: Response) => {
      // Set SSE headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      // Add CORS headers for SSE
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET");
      
      // Log connection details
      console.log("New SSE connection established:", {
        clientId: req.query.client,
        headers: req.headers,
        url: req.url
      });
      
      this.sseTransport = new SSEServerTransport(
        "/messages",
        res as unknown as ServerResponse<IncomingMessage>,
      );
      
      try {
        await this.server.connect(this.sseTransport);
        console.log("SSE transport connected successfully");
      } catch (error) {
        console.error("Error connecting SSE transport:", error);
        res.status(500).end();
      }
    });

    app.post("/messages", async (req: Request, res: Response) => {
      console.log('Received POST request to /messages:', {
        body: req.body,
        headers: req.headers,
        hasSSETransport: !!this.sseTransport
      });
      
      if (!this.sseTransport) {
        console.log('Rejecting request: No active SSE connection');
        res.status(400).send('No active SSE connection. Connect to /sse endpoint first.');
        return;
      }
      
      try {
        await this.sseTransport.handlePostMessage(
          req as unknown as IncomingMessage,
          res as unknown as ServerResponse<IncomingMessage>,
        );
        console.log('Successfully handled message');
      } catch (error) {
        console.error('Error handling message:', error);
        res.status(500).send('Error handling message');
      }
    });

    // Initialize the Logger for HTTP mode after server is connected
    Logger.initialize(this.server, true);

    app.listen(port, () => {
      // Use console.log instead of Logger to avoid 'Not connected' errors
      console.log(`HTTP server listening on port ${port}`);
      console.log(`SSE endpoint available at http://localhost:${port}/sse`);
      console.log(`Message endpoint available at http://localhost:${port}/messages`);
    });
  }
}
