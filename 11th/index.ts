import * as fs from "node:fs";
import * as path from "node:path";
import { OpenAIService } from "./OpenAIService";
import { FetchService } from "./FetchService";
import { config } from "dotenv";
config(); // Load environment variables from .env file

interface ProcessedReport {
  fileName: string;
  content: string;
  initialKeywords: string[];
  enrichedKeywords: string[];
}

interface Fact {
  fileName: string;
  content: string;
}

interface CachedReportData {
  fileName: string;
  content: string;
  initialKeywords: string[];
  enrichedKeywords: string[];
  keywordsAdded: number;
}

class KeywordProcessor {
  private openAIService: OpenAIService;
  private fetchService: FetchService;
  private reportsDir: string;
  private factsDir: string;

  constructor(apiKey: string) {
    this.openAIService = new OpenAIService();
    this.fetchService = new FetchService(apiKey);
    this.reportsDir = path.join(__dirname, "reports");
    this.factsDir = path.join(__dirname, "reports", "facts");
  }

  async processReports(): Promise<void> {
    console.log("🚀 Starting keyword processing...");

    // Check if we already have cached results
    const cachedResults = await this.loadCachedResults();
    if (cachedResults) {
      console.log("📦 Found cached results, using existing data...");
      await this.submitResults(cachedResults);
      console.log("\n✅ Processing completed using cached results!");
      return;
    }

    // Step 1: Load all facts first
    console.log("📚 Loading facts...");
    const facts = await this.loadFacts();
    console.log(`Loaded ${facts.length} facts`);

    // Step 2: Extract keywords from all facts (to catch important info like Adam Gospodarczyk)
    console.log("🔍 Extracting keywords from all facts...");
    const factsKeywords = await this.openAIService.extractFactsKeywords(facts);
    console.log(
      `Extracted ${factsKeywords.length} keywords from facts: ${factsKeywords
        .slice(0, 10)
        .join(", ")}...`
    );

    // Step 3: Get all txt report files
    console.log("📄 Loading reports...");
    const reportFiles = this.getReportFiles();
    console.log(`Found ${reportFiles.length} report files`);

    // Step 4: Process each report
    const processedReports: ProcessedReport[] = [];

    for (const reportFile of reportFiles) {
      console.log(`\n🔍 Processing: ${reportFile}`);

      try {
        const reportContent = await this.loadReportContent(reportFile);

        // Generate initial keywords
        console.log("  - Generating initial keywords...");
        const initialKeywords = await this.openAIService.generateKeywords(
          reportContent,
          reportFile
        );
        console.log(`  - Initial keywords: ${initialKeywords.join(", ")}`);

        // Find relevant facts
        console.log("  - Finding relevant facts...");
        const relevantFacts = await this.openAIService.findRelevantFacts(
          reportContent,
          reportFile,
          facts
        );
        console.log(`  - Found ${relevantFacts.length} relevant facts`);

        // Enrich keywords with facts
        console.log("  - Enriching keywords...");
        const enrichedKeywords = await this.openAIService.enrichKeywords(
          initialKeywords,
          reportContent,
          reportFile,
          relevantFacts
        );

        // Merge with general facts keywords for comprehensive coverage
        const allKeywords = Array.from(
          new Set([...enrichedKeywords, ...factsKeywords])
        );
        console.log(
          `  - Final keywords (${allKeywords.length}): ${allKeywords
            .slice(0, 15)
            .join(", ")}...`
        );

        processedReports.push({
          fileName: reportFile,
          content: reportContent,
          initialKeywords,
          enrichedKeywords: allKeywords, // Use merged keywords
        });

        // Small delay to avoid rate limiting
        await this.delay(500);
      } catch (error) {
        console.error(`❌ Error processing ${reportFile}:`, error);
      }
    }

    // Step 4: Save results
    await this.saveResults(processedReports);

    // Step 5: Submit to centrala
    await this.submitResults(processedReports);

    console.log("\n✅ Processing completed!");
  }

  private async loadFacts(): Promise<Fact[]> {
    const facts: Fact[] = [];

    try {
      const factFiles = fs
        .readdirSync(this.factsDir)
        .filter((file) => file.endsWith(".txt"))
        .sort();

      for (const factFile of factFiles) {
        const factPath = path.join(this.factsDir, factFile);
        const content = fs.readFileSync(factPath, "utf-8").trim();
        facts.push({
          fileName: factFile,
          content,
        });
      }
    } catch (error) {
      console.error("Error loading facts:", error);
    }

    return facts;
  }

  private getReportFiles(): string[] {
    try {
      return fs
        .readdirSync(this.reportsDir)
        .filter((file) => file.endsWith(".txt") && !file.startsWith("."))
        .sort();
    } catch (error) {
      console.error("Error reading reports directory:", error);
      return [];
    }
  }

  private async loadReportContent(fileName: string): Promise<string> {
    const filePath = path.join(this.reportsDir, fileName);
    return fs.readFileSync(filePath, "utf-8").trim();
  }

  private async saveResults(reports: ProcessedReport[]): Promise<void> {
    // Save detailed results
    const detailedResults = {
      processedAt: new Date().toISOString(),
      totalReports: reports.length,
      reports: reports.map((report) => ({
        fileName: report.fileName,
        content: report.content,
        initialKeywords: report.initialKeywords,
        enrichedKeywords: report.enrichedKeywords,
        keywordsAdded:
          report.enrichedKeywords.length - report.initialKeywords.length,
      })),
    };

    fs.writeFileSync(
      path.join(__dirname, "detailed_results.json"),
      JSON.stringify(detailedResults, null, 2),
      "utf-8"
    );

    // Save simple keywords mapping for easy access
    const keywordsMapping: Record<string, string[]> = {};
    for (const report of reports) {
      keywordsMapping[report.fileName] = report.enrichedKeywords;
    }

    fs.writeFileSync(
      path.join(__dirname, "keywords_mapping.json"),
      JSON.stringify(keywordsMapping, null, 2),
      "utf-8"
    );

    // Save final answer format (simplified)
    const finalAnswer: Record<string, string> = {};
    for (const report of reports) {
      finalAnswer[report.fileName] = report.enrichedKeywords.join(",");
    }

    fs.writeFileSync(
      path.join(__dirname, "final_answer.json"),
      JSON.stringify(finalAnswer, null, 2),
      "utf-8"
    );

    console.log("\n📁 Results saved to:");
    console.log("  - detailed_results.json (full analysis)");
    console.log("  - keywords_mapping.json (simple mapping)");
    console.log("  - final_answer.json (submission format)");
  }

  private async submitResults(reports: ProcessedReport[]): Promise<void> {
    console.log("\n📤 Preparing submission to centrala...");

    // Create answer object in the required format
    const answer: Record<string, string> = {};
    for (const report of reports) {
      answer[report.fileName] = report.enrichedKeywords.join(",");
    }

    console.log("Answer format:");
    console.log(JSON.stringify(answer, null, 2));

    try {
      const result = await this.fetchService.submitAnswer("dokumenty", answer);
      console.log("✅ Successfully submitted to centrala:", result);
    } catch (error) {
      console.error("❌ Failed to submit to centrala:", error);
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Helper method to display results
  displayResults(reports: ProcessedReport[]): void {
    console.log("\n📊 FINAL RESULTS:");
    console.log("=".repeat(50));

    reports.forEach((report, index) => {
      console.log(`\n${index + 1}. ${report.fileName}`);
      console.log(`   Keywords: ${report.enrichedKeywords.join(", ")}`);
    });
  }

  private async loadCachedResults(): Promise<ProcessedReport[] | null> {
    const finalAnswerPath = path.join(__dirname, "final_answer.json");
    const detailedResultsPath = path.join(__dirname, "detailed_results.json");

    try {
      // Check if both cache files exist
      if (
        !fs.existsSync(finalAnswerPath) ||
        !fs.existsSync(detailedResultsPath)
      ) {
        return null;
      }

      console.log("📁 Found cached results files");

      // Load the detailed results which contain the full ProcessedReport data
      const detailedData = JSON.parse(
        fs.readFileSync(detailedResultsPath, "utf-8")
      );

      // Convert back to ProcessedReport format
      const processedReports: ProcessedReport[] = detailedData.reports.map(
        (report: CachedReportData) => ({
          fileName: report.fileName,
          content: report.content,
          initialKeywords: report.initialKeywords,
          enrichedKeywords: report.enrichedKeywords,
        })
      );

      console.log(`✅ Loaded ${processedReports.length} cached reports`);
      return processedReports;
    } catch (error) {
      console.log(
        "⚠️ Error loading cached results, will process from scratch:",
        error
      );
      return null;
    }
  }
}

// Main execution
async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY environment variable is required");
    process.exit(1);
  }

  if (!process.env.AI_DEVS_API_KEY) {
    console.error(
      "❌ API_KEY environment variable is required for centrala submission"
    );
    process.exit(1);
  }

  const processor = new KeywordProcessor(process.env.AI_DEVS_API_KEY || "");

  try {
    await processor.processReports();
  } catch (error) {
    process.exit(1);
  }
}

// Run the application
if (require.main === module) {
  main();
}

export { KeywordProcessor };
