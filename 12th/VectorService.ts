import { QdrantClient } from "@qdrant/js-client-rest";
import { v4 as uuidv4 } from "uuid";

export interface VectorPoint {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
}

export interface SearchResult {
  payload?: Record<string, unknown>;
}

export class VectorService {
  private client: QdrantClient;

  constructor(host = "localhost", port = 6333) {
    this.client = new QdrantClient({ host, port });
  }

  async ensureCollectionExists(
    collectionName: string,
    vectorSize = 1024
  ): Promise<void> {
    const { collections } = await this.client.getCollections();
    const collection = collections.find((c) => c.name === collectionName);

    if (!collection) {
      await this.client.createCollection(collectionName, {
        vectors: { size: vectorSize, distance: "Cosine" },
      });
    }
  }

  async upsertPoints(
    collectionName: string,
    points: VectorPoint[]
  ): Promise<void> {
    // Check if points already exist to prevent duplicates
    const existingPoints = await this.client.scroll(collectionName, {
      limit: 1000,
      with_payload: true,
    });

    const existingFilenames = new Set(
      existingPoints.points
        .map((point) => point.payload?.metadata as { filename?: string })
        .filter((metadata) => metadata?.filename)
        .map((metadata) => metadata.filename)
    );

    // Filter out points that already exist
    const newPoints = points.filter((point) => {
      const filename = (point.payload?.metadata as { filename?: string })
        ?.filename;
      return filename ? !existingFilenames.has(filename) : true;
    });

    if (newPoints.length > 0) {
      await this.client.upsert(collectionName, { points: newPoints });
      console.log(
        `Upserted ${newPoints.length} new points to ${collectionName}`
      );
    } else {
      console.log(
        "No new points to upsert - all files already exist in the collection"
      );
    }
  }

  async search(collectionName: string, vector: number[], limit = 5) {
    const searchResult = await this.client.search(collectionName, {
      vector,
      limit,
      with_payload: true,
    });

    return searchResult;
  }

  async deleteCollection(collectionName: string): Promise<void> {
    await this.client.deleteCollection(collectionName);
  }
}
