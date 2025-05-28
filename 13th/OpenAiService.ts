import OpenAI from "openai";

export default class OpenAiService {
  private apiKey: string;
  private baseUrl = "https://api.openai.com/v1/";
  private client: OpenAI;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || this.baseUrl;
    this.client = new OpenAI({
      apiKey: this.apiKey,
    });
  }

  public async prepareQuery({
    messages,
  }: {
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  }): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: messages,
    });

    return response.choices[0].message?.content || "";
  }

  public async assesWhetherPossibleSolution({ queryResult }) {
    const response = await this.client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "Będziesz dostawał wiadomości z odpowiedziami, które pochodzą z bazy danych. Twoim zadaniem jest ocenić, czy odpowiedź ma prawdopodobieństwo bycia prawidłową odpowiedzią na zadanie. Potrzebujemy obietków które zawierają dc_id w swojej strukturze - na przykład { reply: [ { dc_id: '4278' }, { dc_id: '9294' } ], error: 'OK' } - nie potrzebujemy schematu, tylko odpowiedzi. Jeśli odpowiedź jest prawdopodobnie poprawna to odpowiedz 1, jeśli nie to odpowiedz 0.",
        },
        {
          role: "user",
          content: queryResult,
        },
      ],
    });

    return response.choices[0].message?.content || "";
  }

  public async prepareFlagQuery({
    string,
  }: {
    string: string;
  }): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [
        {
          role: "system",
          content:
            "Dostaniesz string, który zawiera json z paroma dc_id. Musisz stworzyć tablicę, która zawiera te dc_id. przykład: { reply: [ { dc_id: '4278' }, { dc_id: '9294' } ], error: 'OK' } - odpowiedź: '4278,9294'. Jeśli nie ma żadnych dc_id to odpowiedz pustą tablicą.",
        },
        {
          role: "user",
          content: string,
        },
      ],
    });

    return response.choices[0].message?.content || "";
  }
}
