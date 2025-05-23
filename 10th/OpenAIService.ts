import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

class OpenAIService {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateResponse(messages: ChatCompletionMessageParam[]) {
    const chatCompletion = await this.client.chat.completions.create({
      model: "gpt-4.1",
      messages,
    });

    return chatCompletion;
  }

  async analyzeImage(imageUrl: string) {
    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Describe the image in detail. Description have to be in Polish language",
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
    });

    return response.choices[0].message.content || "";
  }

  async generateTranscription(audioData: Buffer): Promise<string> {
    const blob = new Blob([audioData], { type: "audio/mpeg" });
    const file = new File([blob], "audio.mp3", { type: "audio/mpeg" });

    const transcription = await this.client.audio.transcriptions.create({
      file: file,
      model: "gpt-4o-transcribe",
      response_format: "text",
    });

    return transcription;
  }
}

export default OpenAIService;
