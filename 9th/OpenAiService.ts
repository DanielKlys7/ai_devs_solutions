import OpenAI from "openai";
import fs from "node:fs";

export default class OpenAiService {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async analyzeImage(imagePath: string): Promise<string> {
    const imageBase64 = fs.readFileSync(imagePath, { encoding: "base64" });

    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image and determine if it contains: 1) Information about captured people or traces of human presence, or 2) Hardware malfunctions (not software). Describe what you see, focusing specifically on these aspects.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    return response.choices[0].message.content || "";
  }

  async transcribeAudio(audioPath: string): Promise<string> {
    const transcription = await this.client.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: "gpt-4o-transcribe",
    });

    return transcription.text;
  }

  async categorizeContent(content: string): Promise<string | null> {
    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a strict security categorization system in a robot factory. Your task is to categorize content with extremely high precision:

          1. "people" - ONLY if the content contains evidence of:
             - Actually captured/detained humans
             - Direct, verified human sightings
             - Active human intrusion with physical evidence

          2. "hardware" - ONLY for physical equipment issues:
             - Mechanical component failures
             - Physical damage to machinery
             - Hardware malfunctions with specific part numbers
             - If it's a repair note - analyze whether it refers to hardware or software (it might not be clear)

          Respond with exactly one word: "people", "hardware" or "none" if cannot be determined.`,
        },
        {
          role: "user",
          content,
        },
      ],
      temperature: 0,
    });

    const category = response.choices[0].message.content?.toLowerCase();
    return category === "none" ? null : category || null;
  }
}
