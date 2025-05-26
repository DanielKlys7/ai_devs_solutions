import fs from "node:fs";
import path from "node:path";

export interface ProcessedFile {
  filename: string;
  content: string;
  relativePath: string;
}

export default class FileProcessor {
  async processDirectory(
    dirPath: string,
    baseDir: string = dirPath
  ): Promise<ProcessedFile[]> {
    const results: ProcessedFile[] = [];

    if (!fs.existsSync(dirPath)) {
      console.warn(`Directory ${dirPath} does not exist`);
      return results;
    }

    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        // Recursively process subdirectories
        const subResults = await this.processDirectory(fullPath, baseDir);
        results.push(...subResults);
      } else if (stats.isFile() && item.endsWith(".txt")) {
        // Process TXT files
        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          const relativePath = path.relative(baseDir, fullPath);

          results.push({
            filename: item,
            content: content.trim(),
            relativePath,
          });

          console.log(`✓ Processed: ${relativePath}`);
        } catch (error) {
          console.error(`Error reading file ${fullPath}:`, error);
        }
      }
    }

    return results;
  }

  async downloadAndProcessRemoteFiles(
    baseUrl: string,
    apiKey: string
  ): Promise<{
    reports: ProcessedFile[];
    facts: Record<string, string>;
  }> {
    try {
      // Try to get file list from API or download files
      // This is a placeholder - adjust based on actual API structure
      const reports: ProcessedFile[] = [];
      const facts: Record<string, string> = {};

      // Example implementation - adjust URLs based on actual API
      console.log("Attempting to download files from remote source...");

      // Try to download reports
      for (let i = 1; i <= 10; i++) {
        const reportNum = i.toString().padStart(2, "0");
        try {
          const reportUrl = `${baseUrl}/data/${apiKey}/report_${reportNum}.txt`;
          const response = await fetch(reportUrl);

          if (response.ok) {
            const content = await response.text();
            reports.push({
              filename: `report_${reportNum}.txt`,
              content: content.trim(),
              relativePath: `report_${reportNum}.txt`,
            });
            console.log(`✓ Downloaded: report_${reportNum}.txt`);
          }
        } catch (error) {
          console.log(`Could not download report_${reportNum}.txt`);
        }
      }

      // Try to download facts
      try {
        const factsResponse = await fetch(
          `${baseUrl}/data/${apiKey}/facts.json`
        );
        if (factsResponse.ok) {
          const factsData = await factsResponse.json();
          Object.assign(facts, factsData);
          console.log(`✓ Downloaded facts data`);
        }
      } catch (error) {
        console.log("Could not download facts data");
      }

      return { reports, facts };
    } catch (error) {
      console.error("Error downloading remote files:", error);
      return { reports: [], facts: {} };
    }
  }

  extractFilenameInfo(filename: string): { name: string; extension: string } {
    const name = path.basename(filename, path.extname(filename));
    const extension = path.extname(filename);
    return { name, extension };
  }
}
