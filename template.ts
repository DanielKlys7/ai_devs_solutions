import dotenv from "dotenv";
import OpenAI from "openai";
dotenv.config();

// Initialize OpenAI client
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const prompt = "";
const endpoint = "";

async function main() {
  try {
    const completion = await client.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
    });

    const response = completion.choices[0].message.content;
    console.log("OpenAI Response:", response);

    const result = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        answer: response,
      }),
    });

    const resultText = await result.text();
    console.log("API Response:", resultText);
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
