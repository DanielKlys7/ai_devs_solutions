import { config } from "dotenv";
import ApiService from "./ApiService";
import OpenAiService from "./OpenAiService";
import type OpenAI from "openai";
import * as fs from "node:fs";
import * as path from "node:path";
config();

const apiService = new ApiService(
  process.env.AI_DEVS_API_KEY || "",
  "https://c3ntrala.ag3nts.org/"
);

const openAiService = new OpenAiService(process.env.OPENAI_API_KEY || "");

// ...existing code...
export const main = async () => {
  const namesSet = new Set<string>();
  const citiesSet = new Set<string>();
  const processedNames = new Set<string>();
  const processedCities = new Set<string>();
  const barbaraCities = new Set<string>();

  // Przygotuj plik do zapisywania treści dokumentów
  const documentsFile = path.join(__dirname, "documents.md");
  fs.writeFileSync(documentsFile, "# Zebrane dokumenty\n\n");

  const initialData = await apiService.getInitialDocument();

  // Zapisz początkowy dokument
  fs.appendFileSync(
    documentsFile,
    `## Dokument początkowy (barbara.txt)\n\`\`\`\n${initialData}\n\`\`\`\n\n`
  );

  const extractNamesAndCities = await openAiService.extractNamesAndCities({
    string: initialData,
  });

  const { names, cities } = JSON.parse(extractNamesAndCities);

  for (const name of names) {
    namesSet.add(name);
  }
  for (const city of cities) {
    citiesSet.add(city);
  }

  // Funkcja do przetwarzania odpowiedzi
  const processResponse = async (query: string, isCity: boolean) => {
    if (
      (isCity && processedCities.has(query)) ||
      (!isCity && processedNames.has(query))
    ) {
      return;
    }

    console.log(`Sprawdzam ${isCity ? "miasto" : "osobę"}: ${query}`);

    const response = await apiService.getPeopleOrPlaceInformation(
      query,
      isCity
    );

    // Zapisz treść dokumentu do pliku
    const documentType = isCity ? "miasto" : "osoba";
    fs.appendFileSync(
      documentsFile,
      `## ${documentType}: ${query}\n\`\`\`json\n${JSON.stringify(
        response,
        null,
        2
      )}\n\`\`\`\n\n`
    );

    // Dodaj do przetworzonych
    if (isCity) {
      processedCities.add(query);
    } else {
      processedNames.add(query);
    }

    // Ekstraktuj nowe imiona i miasta z odpowiedzi
    const extractedData = await openAiService.extractNamesAndCities({
      string: JSON.stringify(response),
    });

    const { names: newNames, cities: newCities } = JSON.parse(extractedData);

    // Sprawdź czy w odpowiedzi pojawia się Barbara
    const hasBarbara = newNames.some((name: string) =>
      name.toLowerCase().includes("barbara")
    );

    if (hasBarbara) {
      console.log(`🎯 Znaleziono Barbarę w odpowiedzi dla: ${query}`);
      console.log(`Miasta powiązane z Barbarą:`, newCities);
      newCities.forEach((city: string) => barbaraCities.add(city));

      const response = await apiService.postAnswer("loop", query);
      console.log(response);
    }

    // Dodaj nowe imiona i miasta do zestawów
    newNames.forEach((name: string) => namesSet.add(name));
    newCities.forEach((city: string) => citiesSet.add(city));
  };

  // Przetwarzaj wszystkie imiona i miasta do skutku
  let previousSize = 0;
  let currentSize = namesSet.size + citiesSet.size;

  while (currentSize > previousSize) {
    previousSize = currentSize;

    // Przetwarzaj imiona
    for (const name of Array.from(namesSet)) {
      if (!processedNames.has(name)) {
        await processResponse(name, false);
      }
    }

    // Przetwarzaj miasta
    for (const city of Array.from(citiesSet)) {
      if (!processedCities.has(city)) {
        await processResponse(city, true);
      }
    }

    currentSize = namesSet.size + citiesSet.size;
  }

  console.log("\n=== WYNIKI ===");
  console.log(
    `Wszystkie znalezione imiona (${namesSet.size}):`,
    Array.from(namesSet)
  );
  console.log(
    `Wszystkie znalezione miasta (${citiesSet.size}):`,
    Array.from(citiesSet)
  );
  console.log(
    `Miasta powiązane z Barbarą (${barbaraCities.size}):`,
    Array.from(barbaraCities)
  );
  console.log(`\nTreść dokumentów zapisana w: ${documentsFile}`);
};
// ...existing code...

main().then(() => {
  process.exit(0);
});
