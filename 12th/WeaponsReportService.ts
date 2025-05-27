import { FileService, FileData } from "./FileService";
import { VectorService } from "./VectorService";
import { OpenAIService } from "./OpenAIService";
import { ApiService } from "./ApiService";
import type { VectorPoint } from "./VectorService";
import { DocumentProcessor } from "./DocumentProcessor";

export class WeaponsReportService {
  private fileService: FileService;
  private vectorService: VectorService;
  private openAIService: OpenAIService;
  private apiService: ApiService;
  private documentProcessor: DocumentProcessor;
  private readonly collectionName = "weapons_reports";

  constructor(
    openAIApiKey: string,
    aiDevsApiKey: string,
    documentsPath: string
  ) {
    this.fileService = new FileService(documentsPath);
    this.vectorService = new VectorService();
    this.openAIService = new OpenAIService(openAIApiKey);
    this.apiService = new ApiService(aiDevsApiKey);
    this.documentProcessor = new DocumentProcessor();
  }

  async initializeVectorDatabase(): Promise<void> {
    console.log("Initializing vector database...");

    // Ensure collection exists
    await this.vectorService.ensureCollectionExists(this.collectionName);

    // Read all text files
    const files = this.fileService.readAllTextFiles();
    console.log(`Found ${files.length} files to process`);

    // Process and store documents
    const vectorPoints: VectorPoint[] = [];

    for (const file of files) {
      console.log(`Processing file: ${file.filename}`);

      // Generate keywords and embeddings
      const keywords = await this.openAIService.generateKeywords(file.content);
      const embeddings = await this.openAIService.generateEmbeddings(
        file.content
      );

      // Process document
      const processedDoc = await this.documentProcessor.processDocument(
        file,
        keywords
      );

      // Create vector point
      const vectorPoint = this.documentProcessor.createVectorPoint(
        processedDoc,
        embeddings
      );
      vectorPoints.push(vectorPoint);
    }

    // Store in vector database (with duplicate prevention)
    await this.vectorService.upsertPoints(this.collectionName, vectorPoints);
    console.log("Vector database initialization completed");
  }

  async searchForWeaponTheft(): Promise<string> {
    console.log("Searching for weapon theft information...");

    const query =
      "W raporcie, z którego dnia znajduje się wzmianka o kradzieży prototypu broni?";
    const embeddings = await this.openAIService.generateEmbeddings(query);

    const searchResults = await this.vectorService.search(
      this.collectionName,
      embeddings,
      5
    );

    // Prepare data for analysis
    const analysisInputs = searchResults.map((result) => ({
      content: (result.payload?.text as string) || "",
      date:
        (result.payload?.metadata as { filename?: string })?.filename?.replace(
          ".txt",
          ""
        ) || "",
    }));

    // Get answer from OpenAI
    const answer = await this.openAIService.prepareAnswer(analysisInputs);
    console.log("Analysis result:", answer);

    return answer;
  }

  async submitAnswer(answer: string): Promise<void> {
    console.log("Submitting answer...");

    const result = await this.apiService.submitAnswer("wektory", answer);

    if (result.success) {
      console.log("Answer submitted successfully:", result.data);
    } else {
      console.error("Failed to submit answer:", result.error);
      throw new Error(`API submission failed: ${result.error}`);
    }
  }

  async run(): Promise<void> {
    try {
      // Initialize vector database
      await this.initializeVectorDatabase();

      // Search for weapon theft information
      const answer = await this.searchForWeaponTheft();

      // Submit the answer
      await this.submitAnswer(answer);
    } catch (error) {
      console.error("Error in WeaponsReportService:", error);
      throw error;
    }
  }
}
