export default class FetchService {
  async fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url);
    return response.json();
  }
}
