import { config } from "dotenv";
import path from "node:path";
import fs from "node:fs";
import https from "node:https";
import * as unzipper from "unzipper";
import OpenAiService from "./OpenAiService";
import FetchService from "./FetchService";

config();

const downloadFile = (url: string, dest: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (response) => {
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (err) => {
        fs.unlink(dest, () => reject(err));
      });
  });
};

const processFileContent = async (
  filePath: string,
  openAiService: OpenAiService
): Promise<string | null> => {
  const fileExt = path.extname(filePath).toLowerCase();

  switch (fileExt) {
    case ".txt":
      return fs.readFileSync(filePath, "utf-8");
    case ".png":
      return await openAiService.analyzeImage(filePath);
    case ".mp3":
      return await openAiService.transcribeAudio(filePath);
    default:
      return null;
  }
};

const categorizeContent = async (
  content: string,
  openAiService: OpenAiService
): Promise<string | null> => {
  const response = await openAiService.categorizeContent(content);
  return response;
};

const main = async () => {
  const zipPath = path.join(__dirname, "files.zip");
  const extractPath = path.join(__dirname, "extracted");

  try {
    const openAiService = new OpenAiService(process.env.OPENAI_API_KEY || "");
    const fetchService = new FetchService();

    const zipUrl = "https://c3ntrala.ag3nts.org/dane/pliki_z_fabryki.zip";

    // Create extracted directory if it doesn't exist
    if (!fs.existsSync(extractPath)) {
      fs.mkdirSync(extractPath);
    }

    // Download and extract zip file
    await downloadFile(zipUrl, zipPath);
    await fs
      .createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: extractPath }))
      .promise();

    // Process all files
    const files = fs.readdirSync(extractPath);
    const categories = {
      people: [] as string[],
      hardware: [] as string[],
    };

    for (const file of files) {
      const filePath = path.join(extractPath, file);
      const content = await processFileContent(filePath, openAiService);

      if (content) {
        const category = await categorizeContent(content, openAiService);
        if (category === "people") {
          categories.people.push(file);
          console.log("Found people category:", file, content);
        } else if (category === "hardware") {
          categories.hardware.push(file);
          console.log("Found hardware category:", file, content);
        }
      }
    }

    // Send the response
    const response = await fetch("https://c3ntrala.ag3nts.org/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        task: "kategorie",
        apikey: process.env.AI_DEVS_API_KEY,
        answer: categories,
      }),
    });

    const result = await response.json();
    console.log("Result:", result);

    // Cleanup
    fs.rmSync(zipPath);
    fs.rmSync(extractPath, { recursive: true });
  } catch (error) {
    fs.rmSync(zipPath);
    fs.rmSync(extractPath, { recursive: true });
  }
};

main()
  .then(() => {
    console.log("Done");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
