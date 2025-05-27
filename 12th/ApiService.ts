export interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export class ApiService {
  constructor(private readonly apiKey: string) {}

  async submitAnswer(task: string, answer: string): Promise<ApiResponse> {
    try {
      const response = await fetch("https://c3ntrala.ag3nts.org/report", {
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

      return {
        success: response.ok,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error,
      };
    }
  }
}
