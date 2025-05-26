export class FetchService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = "https://c3ntrala.ag3nts.org/report") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async submitAnswer(
    task: string,
    answer: Record<string, string>
  ): Promise<unknown> {
    const payload = {
      task,
      apikey: this.apiKey,
      answer,
    };

    console.log("📤 Sending answer to centrala...");
    console.log("Payload:", JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(`${this.baseUrl}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log("✅ Response from centrala:", result);
      return result;
    } catch (error: any) {
      console.log("An error occurred:", error);
    }
  }
}
