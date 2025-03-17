import axios, { AxiosError } from "axios";
import fs from "fs";
import { parseFigmaResponse, SimplifiedDesign } from "./simplify-node-response";
import type {
  GetImagesResponse,
  GetFileResponse,
  GetFileNodesResponse,
  GetImageFillsResponse,
} from "@figma/rest-api-spec";
import { downloadFigmaImage } from "~/utils/common";
import { partition } from "remeda";
import { Logger } from "~/utils/logger";

export interface FigmaError {
  status: number;
  err: string;
}

type FetchImageParams = {
  /**
   * The Node in Figma that will either be rendered or have its background image downloaded
   */
  nodeId: string;
  /**
   * The local file name to save the image
   */
  fileName: string;
  /**
   * The file mimetype for the image
   */
  fileType: "png" | "svg";
};

type FetchImageFillParams = Omit<FetchImageParams, "fileType"> & {
  /**
   * Required to grab the background image when an image is used as a fill
   */
  imageRef: string;
};

export class FigmaService {
  private readonly apiKey: string;
  private readonly baseUrl = "https://api.figma.com/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(endpoint: string): Promise<T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      Logger.info(`Calling Figma API: ${url}`);
      console.log(`Figma API Request: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          "X-Figma-Token": this.apiKey,
        },
      });
      
      console.log(`Figma API Response Status: ${response.status}`);
      Logger.info(`Figma API Response Status: ${response.status}`);
      
      return response.data;
    } catch (error) {
      console.error('Figma API Error:', error);
      
      if (error instanceof AxiosError) {
        console.error('Figma API Error Details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers
          }
        });
        
        if (error.response) {
          throw {
            status: error.response.status,
            err: (error.response.data as { err?: string }).err || error.response.statusText || "Unknown error",
          } as FigmaError;
        }
      }
      
      throw new Error(`Failed to make request to Figma API: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getImageFills(
    fileKey: string,
    nodes: FetchImageFillParams[],
    localPath: string,
  ): Promise<string[]> {
    if (nodes.length === 0) return [];

    let promises: Promise<string>[] = [];
    const endpoint = `/files/${fileKey}/images`;
    const file = await this.request<GetImageFillsResponse>(endpoint);
    const { images = {} } = file.meta;
    promises = nodes.map(async ({ imageRef, fileName }) => {
      const imageUrl = images[imageRef];
      if (!imageUrl) {
        return "";
      }
      return downloadFigmaImage(fileName, localPath, imageUrl);
    });
    return Promise.all(promises);
  }

  async getImages(
    fileKey: string,
    nodes: FetchImageParams[],
    localPath: string,
  ): Promise<string[]> {
    const pngIds = nodes.filter(({ fileType }) => fileType === "png").map(({ nodeId }) => nodeId);
    const pngFiles =
      pngIds.length > 0
        ? this.request<GetImagesResponse>(
            `/images/${fileKey}?ids=${pngIds.join(",")}&scale=2&format=png`,
          ).then(({ images = {} }) => images)
        : ({} as GetImagesResponse["images"]);

    const svgIds = nodes.filter(({ fileType }) => fileType === "svg").map(({ nodeId }) => nodeId);
    const svgFiles =
      svgIds.length > 0
        ? this.request<GetImagesResponse>(
            `/images/${fileKey}?ids=${svgIds.join(",")}&scale=2&format=svg`,
          ).then(({ images = {} }) => images)
        : ({} as GetImagesResponse["images"]);

    const files = await Promise.all([pngFiles, svgFiles]).then(([f, l]) => ({ ...f, ...l }));

    const downloads = nodes
      .map(({ nodeId, fileName }) => {
        const imageUrl = files[nodeId];
        if (imageUrl) {
          return downloadFigmaImage(fileName, localPath, imageUrl);
        }
        return false;
      })
      .filter((url) => !!url);

    return Promise.all(downloads);
  }

  async getFile(fileKey: string, depth?: number): Promise<SimplifiedDesign> {
    try {
      const endpoint = `/files/${fileKey}${depth ? `?depth=${depth}` : ""}`;
      Logger.info(`Retrieving Figma file: ${fileKey} (depth: ${depth ?? "default"})`);
      console.log(`Retrieving Figma file: ${fileKey} (depth: ${depth ?? "default"})`);
      
      // Validate file key format before making the request
      if (!/^[a-zA-Z0-9_-]+$/.test(fileKey)) {
        console.error(`Invalid file key format: ${fileKey}`);
        throw new Error(`Invalid file key format: ${fileKey}`);
      }
      
      const response = await this.request<GetFileResponse>(endpoint);
      Logger.info("Got Figma file response");
      console.log("Got Figma file response");
      
      const simplifiedResponse = parseFigmaResponse(response);
      writeLogs("figma-raw.json", response);
      writeLogs("figma-simplified.json", simplifiedResponse);
      
      return simplifiedResponse;
    } catch (e) {
      console.error("Failed to get Figma file:", e);
      Logger.error(`Failed to get Figma file: ${e instanceof Error ? e.message : String(e)}`);
      throw e;
    }
  }

  async getNode(fileKey: string, nodeId: string, depth?: number): Promise<SimplifiedDesign> {
    try {
      console.log(`Retrieving Figma node: ${nodeId} from file ${fileKey} (depth: ${depth ?? "default"})`);
      Logger.info(`Retrieving Figma node: ${nodeId} from file ${fileKey} (depth: ${depth ?? "default"})`);
      
      // Validate file key and node ID format before making the request
      if (!/^[a-zA-Z0-9_-]+$/.test(fileKey)) {
        console.error(`Invalid file key format: ${fileKey}`);
        throw new Error(`Invalid file key format: ${fileKey}`);
      }
      
      if (!/^\d+:\d+$/.test(nodeId)) {
        console.error(`Invalid node ID format: ${nodeId}`);
        throw new Error(`Invalid node ID format: ${nodeId}`);
      }
      
      const endpoint = `/files/${fileKey}/nodes?ids=${nodeId}${depth ? `&depth=${depth}` : ""}`;
      const response = await this.request<GetFileNodesResponse>(endpoint);
      
      console.log("Got Figma node response");
      Logger.info("Got Figma node response");
      
      writeLogs("figma-raw.json", response);
      const simplifiedResponse = parseFigmaResponse(response);
      writeLogs("figma-simplified.json", simplifiedResponse);
      
      return simplifiedResponse;
    } catch (e) {
      console.error("Failed to get Figma node:", e);
      Logger.error(`Failed to get Figma node: ${e instanceof Error ? e.message : String(e)}`);
      throw e;
    }
  }
}

function writeLogs(name: string, value: any) {
  try {
    if (process.env.NODE_ENV !== "development") return;

    const logsDir = "logs";

    try {
      fs.accessSync(process.cwd(), fs.constants.W_OK);
    } catch (error) {
      Logger.error("Failed to write logs", error);
      return;
    }

    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir);
    }
    fs.writeFileSync(`${logsDir}/${name}`, JSON.stringify(value, null, 2));
  } catch (error) {
    console.debug("Failed to write logs:", error);
  }
}
