import dotenv from "dotenv";
import OpenAI from "openai";
import express from "express";
dotenv.config();

const preparePrompt = (html: string) =>
  `You are a web scraping assistant. Your task is to extract the captcha question from the HTML page provided. The HTML page is as follows <page_content>${html}</page_content>`;

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const page = await fetch("https://xyz.ag3nts.org/");
const html = await page.text();

const getQuestion = await client.chat.completions.create({
  messages: [{ role: "user", content: preparePrompt(html) }],
  model: "gpt-3.5-turbo",
});

const getAnswer = await client.chat.completions.create({
  messages: [
    {
      role: "user",
      content: `Odpowiedz mi na to pytanie, bez dodatkowego tekstu, sama odpowiedź: ${getQuestion.choices[0].message.content}`,
    },
  ],
  model: "gpt-3.5-turbo",
});

console.log(getAnswer.choices[0].message.content);

const login = await fetch("https://xyz.ag3nts.org/", {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: `username=tester&password=574e112a&answer=${getAnswer.choices[0].message.content}`,
});
const loginText = await login.text();
console.log(loginText);

const checkCss = await fetch("https://xyz.ag3nts.org/files/0_13_4.txt");
const cssText = await checkCss.text();
console.log(cssText);

const server = express();
const port = 53565;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
