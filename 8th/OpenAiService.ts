import OpenAI from "openai";
import type {} from "openai/resources/chat/completions";
import { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses.mjs";

class OpenAIService {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateResponse(input) {
    const chatCompletion = await this.client.responses.create({
      model: "gpt-4.1-mini",
      input,
    });

    return chatCompletion;
  }

  async generateImage(prompt: string) {
    const imageResponse = await this.client.images.generate({
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      model: "dall-e-3",
    });

    return imageResponse;
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
