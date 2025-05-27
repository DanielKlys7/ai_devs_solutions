import { OpenAI } from "openai";

export interface AnalysisInput {
  content: string;
  date: string;
}

export class OpenAIService {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async prepareAnswer(texts: AnalysisInput[]): Promise<string> {
    console.log(
      "context",
      texts
        .map(
          (text) =>
            `<date_of_next_text>${text.date.replace(
              ".txt",
              ""
            )}</date_of_next_text>\n<text>Treść: ${text.content}</text>`
        )
        .join("\n\n")
    );

    const response = await this.client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Dostaniesz teksty i daty, musisz na ich podstawie odpowiedzieć na pytanie w raporcie z którego dnia pojawia się wzmianka o kradziey prototypu broni. Odpowiedz tylko i wyłącznie w formacie 'YYYY-MM-DD'",
        },
        {
          role: "user",
          content: texts
            .map(
              (text) =>
                `<date_of_next_text>${text.date.replace(
                  ".txt",
                  ""
                )}</date_of_next_text>\n<text>Treść: ${text.content}</text>`
            )
            .join("\n\n"),
        },
      ],
    });

    console.log("answer", response.choices[0].message?.content);

    return response.choices[0].message?.content || "";
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    const embedding = await this.client.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      dimensions: 1024,
    });

    return embedding.data[0].embedding;
  }

  async generateKeywords(text: string): Promise<string[]> {
    const response = await this.client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert at extracting search-optimized keywords for vector database indexing. Generate a comprehensive set of keywords that includes: 1) Main topics and themes, 2) Key entities (people, places, organizations, objects), 3) Actions and events, 4) Contextual terms and synonyms, 5) Technical terms and concepts. Focus on terms that users might search for to find this content. Return keywords as a comma-separated list without explanations.",
        },
        {
          role: "user",
          content: `Extract search-optimized keywords from the following text. Include main topics, entities, actions, and relevant synonyms that would help users find this content:\n\n${text}`,
        },
      ],
    });

    const keywords = response.choices[0].message?.content
      ?.split(",")
      .map((keyword) => keyword.trim())
      .filter((keyword) => keyword.length > 0);

    return keywords || [];
  }
}
