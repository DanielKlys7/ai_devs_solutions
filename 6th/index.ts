import OpenAI from "openai";
import FetchService from "./FetchService";
import OpenAIService from "./OpenAIService";
import { config } from "dotenv";
config();

export const main = async () => {
  const dataTranscriptions: { name: string; transcription: string }[] = [];
  const openAiService = new OpenAIService(process.env.OPENAI_API_KEY || "");
  const fetchService = new FetchService();
  let message = "";
  const jsonData = await fetchService.fetchAndExtractAudioFiles(
    "https://c3ntrala.ag3nts.org/dane/przesluchania.zip"
  );

  for (const file of jsonData) {
    const buffer = Buffer.from(file.data);
    const transcription = await openAiService.generateTranscription(buffer);
    dataTranscriptions.push({
      name: file.name,
      transcription,
    });
  }

  // biome-ignore lint/complexity/noForEach: <explanation>
  dataTranscriptions.forEach((item) => {
    console.log(`File: ${item.name}`);
    message += `${item.name}: \n <MESSAGE> ${item.transcription} </MESSAGE>`;
  });

  const chatCompletion = await openAiService.generateResponse([
    {
      role: "system",
      content:
        "Jesteś specjalistą od sprawdzania treści przesłuchań, dostaniesz treść przesłuchań wielu osób, które są podejrzane. Twoim zadaniem jest ocena ich treści i podanie informacji dotyczącej  instytutu, w którym pracuje profesor Maj.",
    },
    {
      role: "user",
      content: message,
    },
  ]);

  const institute = chatCompletion.choices[0].message.content;
  console.log("institute: ", institute);

  const chatCompletion2 = await openAiService.generateResponse([
    {
      role: "system",
      content:
        "Znajdź adres instytutu, w którym pracuje profesor Maj. Podaj tylko adres.",
    },
    {
      role: "user",
      content: institute || "",
    },
  ]);

  const address = chatCompletion2.choices[0].message.content;
  console.log("address: ", address);

  const flag = await fetch("https://c3ntrala.ag3nts.org/report", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      task: "mp3",
      answer: address,
      apikey: process.env.AI_DEVS_API_KEY,
    }),
  });

  const flagData = await flag.json();
  console.log("Flag data: ", flagData);
};

main()
  .then(() => {
    console.log("Fetch and extract completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error during fetch and extract:", error);
    process.exit(1);
  });
