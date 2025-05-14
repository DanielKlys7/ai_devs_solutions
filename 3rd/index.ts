import dotenv from "dotenv";
import OpenAI from "openai";
import FetchJsonService from "./FetchJsonService.ts";
import LangfuseService from "./LangfuseService.ts";
import { v4 as uuidv4 } from "uuid";
import MathService from "./MathService.ts";
import {
  createSystemMessage,
  processMathQuestions,
  processTestQuestion,
} from "./utils.ts";
import type { TestData } from "./types.ts";
dotenv.config();

const API_URL = "https://c3ntrala.ag3nts.org";
const API_KEY = process.env.AI_DEVS_API_KEY;

const createServices = () => ({
  openAI: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  fetchJson: new FetchJsonService(),
  langfuse: new LangfuseService(),
  math: new MathService(),
});

const processData = async (
  data: TestData[],
  services: ReturnType<typeof createServices>,
  trace: ReturnType<typeof services.langfuse.createTrace>
) => {
  const systemMessage = createSystemMessage();
  const solvedMath = processMathQuestions(services.math, data);

  return await solvedMath.reduce(async (promise, record) => {
    const acc = await promise;
    const processed = await processTestQuestion(
      services.openAI,
      trace,
      record,
      [systemMessage]
    );
    return [...acc, processed];
  }, Promise.resolve([] as TestData[]));
};

const sendReport = async (testData: TestData[], apiKey: string) => {
  const response = await fetch(`${API_URL}/report`, {
    method: "POST",
    body: JSON.stringify({
      task: "JSON",
      apikey: apiKey,
      answer: {
        apikey: apiKey,
        description:
          "This is simple calibration data used for testing purposes. Do not use it in production environment!",
        copyright: "Copyright (C) 2238 by BanAN Technologies Inc.",
        "test-data": testData,
      },
    }),
  });

  return response.json();
};

const main = async () => {
  try {
    const services = createServices();
    const trace = services.langfuse.createTrace({
      id: uuidv4(),
      name: "AI_DEVS day 3",
      sessionId: uuidv4(),
    });

    const fileData = await services.fetchJson.fetchJson<{
      "test-data": TestData[];
    }>(`${API_URL}/data/${API_KEY}/json.txt`);

    const processedData = await processData(
      fileData["test-data"],
      services,
      trace
    );

    if (!API_KEY) {
      throw new Error("API_KEY is not defined");
    }
    const result = await sendReport(processedData, API_KEY);
    console.log("Response from server:", result);

    return result;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
