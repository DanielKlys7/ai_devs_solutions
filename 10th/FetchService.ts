import { NodeHtmlMarkdown } from "node-html-markdown";

export default class FetchService {
  async fetchText(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch text from ${url}: ${response.statusText}`
      );
    }
    return response.text();
  }

  async fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url);
    return response.json();
  }

  async fetchHTMLtoMarkdown(url: string): Promise<string> {
    const nhm = new NodeHtmlMarkdown();

    const response = await fetch(url);
    const html = await response.text();
    const markdown = nhm.translate(html);
    return markdown;
  }
}
