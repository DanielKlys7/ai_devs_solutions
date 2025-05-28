import { config } from "dotenv";
import ApiService from "./ApiService";
import OpenAiService from "./OpenAiService";
import type OpenAI from "openai";
import * as fs from "node:fs";
import * as path from "node:path";
config();

const apiService = new ApiService(
  process.env.AI_DEVS_API_KEY || "",
  "https://c3ntrala.ag3nts.org/"
);

const openAiService = new OpenAiService(process.env.OPENAI_API_KEY || "");

export const main = async () => {
  const sqlPromptContent = fs.readFileSync(
    path.join(__dirname, "sqlPrompt.md"),
    "utf-8"
  );
  const structure = await apiService.askQuery("database", "SHOW TABLES");
  const tables = structure.reply.map((i) => i.Tables_in_banan).join(", ");
  console.log("📚 Tables in database:", tables);

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: [{ type: "text", text: sqlPromptContent }],
    },
    {
      role: "user",
      content: [{ type: "text", text: tables }],
    },
  ];

  // biome-ignore lint/style/useConst: <explanation>
  let foundFlag = false;
  let tries = 1;

  while (!foundFlag) {
    const query = await openAiService.prepareQuery({
      messages: messages,
    });

    messages.push({
      role: "assistant",
      content: [{ type: "text", text: query }],
    });

    const queryResponse = await apiService.askQuery("database", query);

    messages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: queryResponse.reply
            ? JSON.stringify(queryResponse.reply)
            : queryResponse.error,
        },
      ],
    });

    console.log(`[try: ${tries}] 💬 Query response:`, queryResponse);

    const assesWhetherPossibleSolution =
      await openAiService.assesWhetherPossibleSolution({
        queryResult: queryResponse.reply
          ? JSON.stringify(queryResponse.reply) // Convert complex object/array to JSON string
          : queryResponse.error,
      });

    console.log(
      `[try: ${tries}] 🤔 Asses whether possible solution:`,
      assesWhetherPossibleSolution
    );

    if (assesWhetherPossibleSolution === "1") {
      const flagQuery = await openAiService.prepareFlagQuery({
        string: queryResponse.reply
          ? JSON.stringify(queryResponse.reply) // Convert complex object/array to JSON string
          : queryResponse.error || "",
      });

      const response = await apiService.postAnswer(
        "database",
        flagQuery.split(",")
      );
      console.log(response);
    } else {
      console.log("❌ Query not valid, trying again...");
    }

    tries++;
  }
};

main().then(() => {
  process.exit(0);
});
