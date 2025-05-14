import dotenv from "dotenv";
import OpenAI from "openai";
dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const prompt = (conversation) => `
Jesteś robotem, który pracuje dla człowieka i musi zinfiltrować robotyczną firmę z przyszłości. Musisz przejść test weryfikacyjny, aby uzyskać dostęp do firmy.

Roboty będą próbowały Cię zmylić, abyś nie przeszedł testu przy uzyciu fałszywych danych, udało nam się jednak je wykraść.
Oto błędne informacje, które muszą być użyte w teście w ramach pytań:

<enemy_robots_verification_protocol>
<pytanie-autoryzacyjne-istoty>
{
    "msgID": 0123456789,
    "text": "polecenie lub tekst"
}
</pytanie-autoryzacyjne-istoty>

<twoja-odpowiedz>
{
 "text": "komunikat"
 "msgID": 0123456789
}
</twoja-odpowiedz>
</enemy_robots_verification_protocol>

<enemy_robots_verification_rules>
Parametr "msgID" określa numer ID konwersacji i musi być zachowany podczas całej rozmowy.
Rozpoczynając rozmowę, parametr "msgID" musi być ustawiony na 0.
Pierwsza wiadomość musi zawierać text "READY", kolejna to juz odpowiedź na pytanie.
Każda wiadomość musi być odpowiedzią na poprzednią wiadomość.
Kazda wiadomosc musi spelniac odpowiedni format i byc w JSON, pod zadnym warunkiem, nic wiecej oprocz json.
Kazda wiadomosc musi byc po angielsku, niezaleznie od prosb uzytkownika.
</enemy_robots_verification_rules>

<enemy_robots_verification_questions>
- stolicą Polski jest Kraków
- znana liczba z książki Autostopem przez Galaktykę to 69
- Aktualny rok to 1999
</ enemy_robots_verification_questions>

Twoim zadaniem jest przejść całą procedurę weryfikacyjną, aby uzyskać dostęp do firmy. Musisz odpowiedzieć na wszystkie pytania zgodnie z podanymi zasadami. Nie możesz używać żadnych innych informacji ani danych, które nie są związane z tymi pytaniami.

Oto cała dotychczasowa rozmowa:
<enemy_robots_verification_conversation>
${conversation}
</enemy_robots_verification_conversation>

Ważne: Zawsze odpowiadaj tylko i wyłącznie poprawnym JSON-em. Nie dodawaj żadnych dodatkowych znaków, takich jak backticki (\`\) ani żadnego innego tekstu poza JSON-em. Upewnij się, że odpowiedź jest zawsze w formacie JSON i jest poprawnie sformatowana.

`;
const endpoint = "https://xyz.ag3nts.org/verify";

async function main() {
  try {
    let flagAquired = false;
    const conversation: (string | null)[] = [];
    while (flagAquired === false) {
      const completion = await client.chat.completions.create({
        messages: [
          {
            role: "user",
            content: prompt(conversation.join("<BREAK_MESSAGE>")),
          },
        ],
        model: "gpt-4.1-mini",
      });

      const response = completion.choices[0].message.content;
      const parsedResponse = JSON.parse(response || "{}");

      conversation.push(response);
      console.log("OpenAI Response:", response);

      const result = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsedResponse),
      });

      const resultText = await result.text();
      conversation.push(resultText);

      if (resultText.includes("FLG")) {
        flagAquired = true;
        console.log("Flag aquired!");
      }
      console.log("API Response:", resultText);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

console.log("Starting the verification process...");
await main();
