import OpenAiService from "./OpenAiService";
import { config } from "dotenv";
import fs from "node:fs";
config();

const imagePath = "/Users/daniel/projects/ai-devs-solutions/7th/image.jpeg";
const imageBase64 = fs.readFileSync(imagePath, "base64");

const main = async () => {
  const openAiService = new OpenAiService(process.env.OPENAI_API_KEY || "");

  const response = await openAiService.generateResponse([
    {
      role: "system",
      content:
        "You are an skilled polish maps expert. You will be provided a map and have to check what city is on the map. One of the panels of map is from different city and tries to mislead you. Provide me with just a name of the city that this map is based on. I also got some intel that says, that in this city there were some strongholds and granaries. No additional information, you have to response in this format: <format>%CITY_NAME%</format>. Do not add any additional information.",
    },
    {
      role: "user",
      content: [
        {
          type: "input_image",
          image_url: `data:image/jpeg;base64,${imageBase64}`,
        },
      ],
    },
  ]);

  console.log("Response:", response);
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
