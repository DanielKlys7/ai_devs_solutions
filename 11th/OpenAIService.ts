import OpenAI from "openai";

export class OpenAIService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateKeywords(
    reportContent: string,
    fileName: string
  ): Promise<string[]> {
    const prompt = `Przeanalizuj następujący raport i wygeneruj słowa kluczowe w języku polskim, w mianowniku, oddzielone przecinkami.

Nazwa pliku: ${fileName}
Treść raportu: ${reportContent}

Zasady:
- Używaj języka polskiego, mianownika
- Bądź konkretny i precyzyjny
- Uwzględnij informacje z nazwy pliku (data, sektor)
- Jeśli wspominane są zwierzęta/fauna/wildlife, użyj słowa "zwierzęta"
- Uwzględnij wszystkie istotne osoby, ich zawody, miejsca, wydarzenia
- Oddziel przecinkami

Zwróć tylko słowa kluczowe, bez dodatkowych komentarzy.`;

    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100,
        temperature: 0.1,
      });

      const keywords = response.choices[0].message.content?.trim() || "";
      return keywords
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);
    } catch (error) {
      console.error("Error generating keywords:", error);
      return [];
    }
  }

  async enrichKeywords(
    reportKeywords: string[],
    reportContent: string,
    fileName: string,
    relevantFacts: string[]
  ): Promise<string[]> {
    const prompt = `Masz słowa kluczowe z raportu oraz powiązane fakty. Wzbogać słowa kluczowe o dodatkowe informacje z faktów.

Nazwa pliku: ${fileName}
Treść raportu: ${reportContent}
Obecne słowa kluczowe: ${reportKeywords.join(", ")}

Powiązane fakty:
${relevantFacts.join("\n\n")}

Zasady wzbogacania:
- Dodaj nowe słowa kluczowe z faktów, jeśli są powiązane z raportem
- Zachowaj wszystkie istniejące słowa kluczowe
- Język polski, mianownik
- Bądź precyzyjny i konkretny

SZCZEGÓLNIE WAŻNE dla zatrzymań/schwytań:
- Jeśli raport opisuje zatrzymanie osoby, dodaj słowa: "zatrzymany", "schwytany", "pojmany", "aresztowany"
- Jeśli osoba z faktów to nauczyciel, dodaj: "nauczyciel", zawód (np. "język angielski"), "schwytanie nauczyciela", "pojmanie nauczyciela"
- Jeśli osoba była uciekinierem, dodaj: "uciekinier", "poszukiwany", "zbieg"
- Jeśli osoba należała do ruchu oporu, dodaj: "ruch oporu", "aktywista", "przeciwnik reżimu"
- Dodaj informacje o miejscu pracy, szkole, miejscu zamieszkania z faktów
- KLUCZOWE: Jeśli raport opisuje schwytanie osoby która w faktach jest nauczycielem, dodaj: "schwytanie nauczyciela", "zatrzymanie nauczyciela", "pojmanie nauczyciela"

SZCZEGÓLNIE WAŻNE dla programistów/umiejętności technicznych:
- Jeśli fakty wspominają, że osoba nauczyła się programowania, dodaj: "programista", "programowanie"
- Jeśli wspomina konkretny język programowania (Java, JavaScript, Python, C++, itp.), dodaj ten język
- Jeśli osoba ma umiejętności techniczne, dodaj: "umiejętności techniczne", "technologia"
- Jeśli planuje hakować/łamać systemy, dodaj: "haker", "systemy komputerowe", "zabezpieczenia"
- Jeśli wspomina przełamywanie zabezpieczeń, dodaj: "przełamywanie zabezpieczeń", "systemy rządowe"

Przykłady:
1. Jeśli raport mówi o schwytaniu "Aleksander Ragowski", a fakty mówią że to nauczyciel języka angielskiego z ruchu oporu i nauczył się programowania w Java, dodaj:
"nauczyciel, język angielski, ruch oporu, uciekinier, poszukiwany, schwytany, zatrzymany, aresztowany, programista, programowanie, Java, umiejętności techniczne"

2. Jeśli fakty mówią że osoba planuje hakować systemy rządowe używając JavaScript, dodaj:
"programista, JavaScript, haker, systemy komputerowe, zabezpieczenia, przełamywanie zabezpieczeń, systemy rządowe"

Zwróć wzbogaconą listę słów kluczowych oddzielonych przecinkami, bez dodatkowych komentarzy.`;

    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4.1-nano",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
        temperature: 0.1,
      });

      const enrichedKeywords =
        response.choices[0].message.content?.trim() || "";
      return enrichedKeywords
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);
    } catch (error) {
      console.error("Error enriching keywords:", error);
      return reportKeywords;
    }
  }

  async findRelevantFacts(
    reportContent: string,
    fileName: string,
    allFacts: Array<{ content: string; fileName: string }>
  ): Promise<string[]> {
    const relevantFactContents: string[] = [];
    const chunkSize = 2; // Sprawdzamy po 2 fakty naraz dla lepszej dokładności

    // Przetwarzamy fakty w kawałkach
    for (let i = 0; i < allFacts.length; i += chunkSize) {
      const chunk = allFacts.slice(i, i + chunkSize);

      const prompt = `Przeanalizuj raport i znajdź które z faktów są powiązane z tym raportem. WAŻNE: Szukaj połączeń przez:
- Imiona i nazwiska osób (nie musi być dokładne dopasowanie, ale podobieństwo)
- Miejsca i lokalizacje
- Wydarzenia i działania (takie jak zatrzymania, aresztowania, itp.)
- Biometryczne skanowanie/identyfikację
- Zatrzymania, aresztowania, schwytania
- Zawody i profesje (nauczyciel, inżynier, itp.)

Nazwa pliku raportu: ${fileName}
Treść raportu: ${reportContent}

Dostępne fakty w tym kawałku (PEŁNA TREŚĆ):
${chunk
  .map((fact, index) => `${i + index + 1}. ${fact.fileName}:\n${fact.content}`)
  .join("\n\n")}

KRYTYCZNA ANALIZA - szukaj tych połączeń:
1. IDENTYFIKACJA OSOBY: Czy raport zawiera pełne imię i nazwisko osoby?
2. DOPASOWANIE FAKTÓW: Czy ta sama osoba (imię + nazwisko) występuje w faktach?
3. ZAWÓD/PROFESJA: Czy w faktach ta osoba ma określony zawód (nauczyciel, programista, itp.)?
4. SCHWYTANIE: Czy raport opisuje zatrzymanie/wykrycie/schwytanie tej osoby?
5. KONTEKST: Czy osoba była poszukiwana, była zbiegiem, należała do ruchu oporu?

SZCZEGÓLNA UWAGA na nauczycieli:
- Jeśli raport zawiera imię osoby, sprawdź czy w faktach ta osoba jest nauczycielem
- Jeśli w faktach ktoś jest nauczycielem i był poszukiwany/zbiegł, a raport opisuje schwytanie tej osoby - TO JEST POŁĄCZENIE!
- Jeśli report opisuje to, ze ktoś jest nauczycielem, a w faktach jest informacja, ze pojmano nauczyciela, dodaj to jako powiązanie

Zwróć numery faktów (${i + 1}${
        chunk.length > 1 ? `,${i + 2}` : ""
      }...) które są powiązane z raportem, oddzielone przecinkami. Jeśli żaden fakt nie jest powiązany, zwróć "brak".`;

      try {
        const response = await this.client.chat.completions.create({
          model: "gpt-4.1-nano",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1000,
          temperature: 0.1,
        });

        const result = response.choices[0].message.content?.trim() || "brak";

        if (result !== "brak") {
          const factNumbers = result
            .split(",")
            .map((n) => Number.parseInt(n.trim()) - 1)
            .filter((n) => !Number.isNaN(n) && n >= 0 && n < allFacts.length);

          // Dodajemy zawartość znalezionych faktów
          for (const factIndex of factNumbers) {
            if (!relevantFactContents.includes(allFacts[factIndex].content)) {
              relevantFactContents.push(allFacts[factIndex].content);
            }
          }
        }
      } catch (error) {
        console.error(
          `Error finding relevant facts in chunk ${i / chunkSize + 1}:`,
          error
        );
      }
    }

    return relevantFactContents;
  }

  async extractFactsKeywords(
    allFacts: Array<{ content: string; fileName: string }>
  ): Promise<string[]> {
    const allFactsKeywords: string[] = [];

    for (const fact of allFacts) {
      const prompt = `Przeanalizuj następujący fakt i wyciągnij z niego wszystkie istotne słowa kluczowe w języku polskim, w mianowniku.

Nazwa pliku: ${fact.fileName}
Treść faktu: ${fact.content}

Zasady:
- Używaj języka polskiego, mianownika
- Uwzględnij wszystkie imiona i nazwiska osób
- Uwzględnij wszystkie zawody i profesje
- Uwzględnij umiejętności techniczne (programowanie, języki programowania)
- Uwzględnij miejsca, organizacje, wydarzenia
- Uwzględnij technologie, narzędzia, systemy
- Bądź bardzo szczegółowy - wyciągnij każdą istotną informację

SZCZEGÓLNIE WAŻNE:
- Jeśli wspomina programowanie, dodaj: "programista", "programowanie"
- Jeśli wspomina konkretne języki programowania (JavaScript, Java, Python, itp.), dodaj je
- Jeśli wspomina hakowanie/łamanie systemów, dodaj: "haker", "systemy komputerowe", "zabezpieczenia"
- Jeśli wspomina nauczycieli, dodaj: "nauczyciel" + przedmiot
- Jeśli wspomina ruch oporu, dodaj: "ruch oporu", "aktywista", "przeciwnik reżimu"
- Jeśli wspomina teleportację/podróże w czasie, dodaj te terminy

Zwróć słowa kluczowe oddzielone przecinkami, bez dodatkowych komentarzy.`;

      try {
        const response = await this.client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 200,
          temperature: 0.1,
        });

        const keywords = response.choices[0].message.content?.trim() || "";
        const factKeywords = keywords
          .split(",")
          .map((k) => k.trim())
          .filter((k) => k.length > 0);

        allFactsKeywords.push(...factKeywords);
      } catch (error) {
        console.error(
          `Error extracting keywords from fact ${fact.fileName}:`,
          error
        );
      }
    }

    // Deduplikacja
    return Array.from(new Set(allFactsKeywords));
  }
}
