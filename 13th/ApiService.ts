export default class ApiService {
  private apiKey: string;
  private baseUrl = "https://c3ntrala.ag3nts.org/";

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || "";
  }

  public async askQuery(
    task: string,
    query: string
  ): Promise<{ reply: string | null; error?: string }> {
    const response = await fetch(`${this.baseUrl}/apidb`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        task,
        apikey: this.apiKey,
        query,
      }),
    });

    const data = await response.json();
    return data;
  }

  public async postAnswer(task: string, answer: string): Promise<unknown> {
    console.log(task, answer);

    try {
      const response = await fetch(`${this.baseUrl}/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task,
          apikey: this.apiKey,
          answer,
        }),
      });

      const data = await response.json();

      return data;
    } catch (error) {
      console.error("Error submitting answer:", error);
      throw error;
    }
  }
}
