import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

class OpenAIService {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateResponse(messages: ChatCompletionMessageParam[]) {
    const chatCompletion = await this.client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
    });

    return chatCompletion;
  }
}

export default OpenAIService;
