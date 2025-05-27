import { config } from "dotenv";
import path from "node:path";
import { WeaponsReportService } from "./WeaponsReportService";

config();

const main = async () => {
  const openAIApiKey = process.env.OPENAI_API_KEY;
  const aiDevsApiKey = process.env.AI_DEVS_API_KEY;

  if (!openAIApiKey) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }

  if (!aiDevsApiKey) {
    throw new Error("AI_DEVS_API_KEY environment variable is required");
  }

  const documentsPath = path.join(__dirname, "do-not-share");

  const weaponsReportService = new WeaponsReportService(
    openAIApiKey,
    aiDevsApiKey,
    documentsPath
  );

  await weaponsReportService.run();
};

main()
  .then(() => {
    console.log("Process completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Process failed:", error);
    process.exit(1);
  });
