import dotenv from "dotenv";
import FetchService from "./FetchService";
import OpenAIService from "./OpenAIService";
import { MediaProcessor } from "./MediaProcessor";
import fs from "node:fs";

dotenv.config();

export const main = async () => {
  const questionsApi = `https://c3ntrala.ag3nts.org/data/${process.env.AI_DEVS_API_KEY}/arxiv.txt`;
  const articleApi = "https://c3ntrala.ag3nts.org/dane/arxiv-draft.html";

  // Initialize services
  const fetchService = new FetchService();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }
  const openAIService = new OpenAIService(apiKey);
  const mediaProcessor = new MediaProcessor(openAIService);

  try {
    // 1. Fetch questions
    console.log("Fetching questions...");
    const questionsText = await fetchService.fetchText(questionsApi);
    const questions = parseQuestions(questionsText);
    console.log(`Found ${Object.keys(questions).length} questions`);

    // 2. Fetch article as markdown
    console.log("Fetching article...");
    const articleMarkdown = await fetchService.fetchHTMLtoMarkdown(articleApi);

    // 3. Load media cache
    console.log("Loading media cache...");
    const mediaCache = await mediaProcessor.loadCache();

    // 4. Enhance article with media context
    console.log("Enhancing article with media context...");
    const enhancedArticle = enhanceArticleWithMediaContext(
      articleMarkdown,
      mediaCache
    );

    // 5. Generate answers using AI
    console.log("Generating answers...");
    const answers = await generateAnswers(
      questions,
      enhancedArticle,
      openAIService
    );

    // 6. Output results
    console.log("Generated answers:");
    console.log(JSON.stringify(answers, null, 2));

    // Save to file
    fs.writeFileSync("./10th/answers.json", JSON.stringify(answers, null, 2));
    console.log("Answers saved to answers.json");

    // Send report
    await sendReport(answers, fetchService);

    return answers;
  } catch (error) {
    console.error("Error in main function:", error);
    throw error;
  }
};

function parseQuestions(questionsText: string): Record<string, string> {
  const questions: Record<string, string> = {};
  const lines = questionsText.split("\n").filter((line) => line.trim());

  for (const line of lines) {
    // Parse format like "01=What is the capital of Poland?"
    const match = line.match(/^(\d+)=(.+)$/);
    if (match) {
      const id = `ID-pytania-${match[1].padStart(2, "0")}`;
      questions[id] = match[2].trim();
    }
  }

  return questions;
}

function enhanceArticleWithMediaContext(
  articleMarkdown: string,
  mediaCache: Record<string, string>
): string {
  let enhancedArticle = articleMarkdown;

  // For each media file in cache, find references in the article and add context
  for (const [filename, description] of Object.entries(mediaCache)) {
    // Remove URL encoding if present
    const cleanFilename = decodeURIComponent(filename);
    const baseFilename = cleanFilename.replace(/\.[^/.]+$/, ""); // Remove extension

    // Look for references to this file in the article
    const patterns = [
      new RegExp(`\\b${filename}\\b`, "gi"),
      new RegExp(`\\b${cleanFilename}\\b`, "gi"),
      new RegExp(`\\b${baseFilename}\\b`, "gi"),
    ];

    for (const pattern of patterns) {
      if (pattern.test(enhancedArticle)) {
        // Add media context near the reference
        const contextNote = `\n\n[MEDIA CONTEXT for ${cleanFilename}]: ${description}\n\n`;
        enhancedArticle = enhancedArticle.replace(pattern, (match) => {
          return match + contextNote;
        });
        break; // Only add context once per file
      }
    }
  }

  return enhancedArticle;
}

async function generateAnswers(
  questions: Record<string, string>,
  enhancedArticle: string,
  openAIService: OpenAIService
): Promise<Record<string, string>> {
  const answers: Record<string, string> = {};

  const systemPrompt = `Jesteś ekspertem w analizie tekstów i mediów. Odpowiadaj krótko i zwięźle po polsku, maksymalnie w 1 zdaniu. 
    
Bazuj wyłącznie na informacjach zawartych w artykule i kontekście mediów. Jeśli nie znajdziesz odpowiedzi w dostarczonych materiałach, napisz "Brak informacji w materiale".`;

  for (const [questionId, question] of Object.entries(questions)) {
    try {
      const userPrompt = `Artykuł z kontekstem mediów:
${enhancedArticle}

Pytanie: ${question}

Odpowiedz krótko w 1 zdaniu, bazując wyłącznie na powyższym materiale.`;

      const response = await openAIService.generateResponse([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ]);

      const answer =
        response.choices[0]?.message?.content?.trim() ||
        "Błąd generowania odpowiedzi";
      answers[questionId] = answer;

      console.log(`✓ ${questionId}: ${question} -> ${answer}`);

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Error generating answer for ${questionId}:`, error);
      answers[questionId] = "Błąd podczas generowania odpowiedzi";
    }
  }

  return answers;
}

function transformAnswersForReport(
  answers: Record<string, string>
): Record<string, string> {
  const transformedAnswers: Record<string, string> = {};

  for (const [questionId, answer] of Object.entries(answers)) {
    // Extract the number from "ID-pytania-XX" format
    const match = questionId.match(/ID-pytania-(\d+)/);
    if (match) {
      const questionNumber = match[1];
      transformedAnswers[questionNumber] = answer;
    }
  }

  return transformedAnswers;
}

async function sendReport(
  answers: Record<string, string>,
  fetchService: FetchService
): Promise<void> {
  const reportUrl = "https://c3ntrala.ag3nts.org/report";
  const apiKey = process.env.AI_DEVS_API_KEY;

  if (!apiKey) {
    throw new Error("AI_DEVS_API_KEY environment variable is required");
  }

  const transformedAnswers = transformAnswersForReport(answers);

  const reportData = {
    task: "arxiv",
    apikey: apiKey,
    answer: transformedAnswers,
  };

  console.log("Sending report...");
  console.log("Report data:", JSON.stringify(reportData, null, 2));

  try {
    const response = await fetch(reportUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reportData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to send report: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const result = await response.json();
    console.log("Report sent successfully!");
    console.log("Response:", result);
  } catch (error) {
    console.error("Error sending report:", error);
    throw error;
  }
}

main()
  .then(() => {
    process.exit(0);
    console.log("Done");
  })
  .catch((error) => {
    console.error("Error in main function:", error);
    process.exit(1);
  });
