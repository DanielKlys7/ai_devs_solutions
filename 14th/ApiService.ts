export default class ApiService {
  private apiKey: string;
  private baseUrl = "https://c3ntrala.ag3nts.org/";

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || "";
  }

  public async getInitialDocument(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/dane/barbara.txt`);

    const data = await response.text();
    return data;
  }

  public async getPeopleOrPlaceInformation(
    query: string,
    isCity: boolean
  ): Promise<string> {
    const response = await fetch(
      `${this.baseUrl}/${isCity ? "places" : "people"}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apikey: this.apiKey,
          query,
        }),
      }
    );

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
