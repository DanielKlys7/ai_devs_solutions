import { createByModelName } from "@microsoft/tiktokenizer";
import { v4 as uuidv4 } from "uuid";
import type { VectorPoint } from "./VectorService";
import type { FileData } from "./FileService";

export interface ProcessedDocument {
  text: string;
  metadata: {
    tokens: number;
    filename: string;
    date: string;
    keywords: string[];
  };
}

export class DocumentProcessor {
  private tokenizer: Awaited<ReturnType<typeof createByModelName>> | null =
    null;

  async initializeTokenizer(): Promise<void> {
    if (!this.tokenizer) {
      this.tokenizer = await createByModelName("gpt-4o");
    }
  }

  async processDocument(
    fileData: FileData,
    keywords: string[]
  ): Promise<ProcessedDocument> {
    await this.initializeTokenizer();

    const tokens = this.tokenizer?.encode(fileData.content).length;

    return {
      text: fileData.content,
      metadata: {
        tokens: tokens || 0,
        filename: fileData.filename,
        date: fileData.date,
        keywords,
      },
    };
  }

  createVectorPoint(
    processedDoc: ProcessedDocument,
    embeddings: number[]
  ): VectorPoint {
    return {
      id: uuidv4(),
      vector: embeddings,
      payload: {
        text: processedDoc.text,
        metadata: processedDoc.metadata,
      },
    };
  }
}
