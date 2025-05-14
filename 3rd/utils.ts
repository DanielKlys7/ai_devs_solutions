import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { TestData } from "./types";
import type { LangfuseTraceClient } from "langfuse";
import type { OpenAI } from "openai";
import type { Langfuse } from "langfuse";

export const createSystemMessage = (): ChatCompletionMessageParam => ({
  role: "system",
  content:
    "you should only answer this questions, don't provide anymore data. Respond as shortly as possible, but correctly.",
});

export const processMathQuestions = (
  mathService: { calculateString: (expression: string) => number },
  questions: TestData[]
): TestData[] =>
  questions.map((record) => ({
    ...record,
    answer: mathService.calculateString(record.question),
  }));

export const processTestQuestion = async (
  openAIClient: OpenAI,
  trace: LangfuseTraceClient,
  record: TestData,
  messages: ChatCompletionMessageParam[]
): Promise<TestData> => {
  if (!record.test?.q) {
    return record;
  }

  const updatedMessages = [
    ...messages,
    {
      role: "user",
      content: JSON.stringify(record.test.q),
    },
  ] as ChatCompletionMessageParam[];

  const answerSpan = trace.span({
    name: `answer ${record.test.q}`,
    metadata: { messages: updatedMessages },
  });

  const chatCompletion = await openAIClient.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: updatedMessages,
  });

  const answer = chatCompletion.choices[0].message.content || "";

  answerSpan.end({
    metadata: {
      messages: updatedMessages,
      completion: chatCompletion,
    },
  });

  return {
    ...record,
    test: {
      q: record.test.q,
      a: answer,
    },
  };
};
