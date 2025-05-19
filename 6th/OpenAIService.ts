import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

class OpenAIService {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateResponse(messages: ChatCompletionMessageParam[]) {
    const chatCompletion = await this.client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages,
    });

    return chatCompletion;
  }

  async generateTranscription(audioData: Buffer): Promise<string> {
    const blob = new Blob([audioData], { type: "audio/mp4" });
    const file = new File([blob], "audio.m4a", { type: "audio/mp4" });

    const transcription = await this.client.audio.transcriptions.create({
      file: file,
      model: "gpt-4o-transcribe",
      response_format: "text",
    });

    return transcription;
  }
}

export default OpenAIService;
