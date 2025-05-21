import OpenAiService from "./OpenAiService";
import FetchService from "./FetchService";
import { config } from "dotenv";
config();

const main = async () => {
  const openAiService = new OpenAiService(process.env.OPENAI_API_KEY || "");
  const fetchService = new FetchService();

  const { description } = await fetchService.fetchJson<{ description: string }>(
    `https://c3ntrala.ag3nts.org/data/${process.env.AI_DEVS_API_KEY}/robotid.json`
  );

  const image = await openAiService.generateImage(
    `Jesteś specjalistą od tworzenia obrazów robotów, to wynik rekonesansu w fabryce złowrogich robotów, stwórz jego obraz: ${description}`
  );

  const response = await fetch("https://c3ntrala.ag3nts.org/report", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      answer: image!.data![0].url,
      task: "robotid",
      apikey: process.env.AI_DEVS_API_KEY,
    }),
  });

  const flagData = await response.json();
  console.log("Flag data: ", flagData);
};

main()
  .then(() => {
    console.log("done");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
