import type { ReportPayload, TestData } from "./types";

class ReportService {
  private readonly endpoint = "https://c3ntrala.ag3nts.org/report";

  async sendReport(apiKey: string, testData: TestData[]): Promise<unknown> {
    const payload: ReportPayload = {
      task: "JSON",
      apikey: apiKey,
      answer: {
        apikey: apiKey,
        description:
          "This is simple calibration data used for testing purposes. Do not use it in production environment!",
        copyright: "Copyright (C) 2238 by BanAN Technologies Inc.",
        "test-data": testData,
      },
    };

    const response = await fetch(this.endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return response.json();
  }
}

export default ReportService;
