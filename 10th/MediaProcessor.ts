import FetchService from "./FetchService";
import type OpenAiService from "./OpenAIService";
import fs from "node:fs";

export class MediaProcessor {
  private fetchService: FetchService;
  private openAIService: OpenAiService;
  private cacheFile = "./10th/media_cache.json";

  constructor(openAIService: OpenAiService) {
    this.fetchService = new FetchService();
    this.openAIService = openAIService;
  }

  async loadCache(): Promise<Record<string, string>> {
    if (fs.existsSync(this.cacheFile)) {
      try {
        const cacheContent = fs.readFileSync(this.cacheFile, "utf-8");
        return JSON.parse(cacheContent);
      } catch (error) {
        console.log("Cache file exists but couldn't be read, starting fresh");
      }
    }
    return {};
  }

  async saveCache(cachedData: Record<string, string>): Promise<void> {
    fs.writeFileSync(this.cacheFile, JSON.stringify(cachedData, null, 2));
  }

  async processMediaFiles(
    mediaLinks: string[]
  ): Promise<Record<string, string>> {
    const cachedData = await this.loadCache();
    const uncachedLinks = mediaLinks.filter((link: string) => {
      const fileName = link.split("/").pop();
      return fileName && !cachedData[fileName];
    });

    console.log(
      `Processing ${uncachedLinks.length} uncached files out of ${mediaLinks.length} total files`
    );

    for (const link of uncachedLinks) {
      const fileName = link.split("/").pop();
      if (!fileName) continue;

      try {
        console.log(`Processing ${fileName}...`);
        const response = await fetch(link);

        if (!response.ok) {
          console.error(`Failed to fetch ${link}: ${response.statusText}`);
          continue;
        }

        let description = "";

        if (fileName.endsWith(".png")) {
          description = await this.processImage(link);
        } else if (fileName.endsWith(".mp3")) {
          const audioBuffer = Buffer.from(await response.arrayBuffer());
          description = await this.processAudio(audioBuffer);
        }

        if (description) {
          cachedData[fileName] = description;
          console.log(`✓ Processed ${fileName}`);
        }
      } catch (error) {
        console.error(`Error processing ${fileName}:`, error);
      }
    }

    await this.saveCache(cachedData);
    return cachedData;
  }

  private async processImage(imageUrl: string): Promise<string> {
    return await this.openAIService.analyzeImage(imageUrl);
  }

  private async processAudio(audioBuffer: Buffer): Promise<string> {
    return await this.openAIService.generateTranscription(audioBuffer);
  }
}
