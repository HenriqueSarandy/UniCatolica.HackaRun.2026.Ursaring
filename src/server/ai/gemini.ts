import { GoogleGenAI } from "@google/genai";
import { buildContents, buildSystemInstruction } from "./prompt";

const TIMEOUT_MS = 8000;
let client: GoogleGenAI | null = null;

/** Retorna o texto da IA, ou `null` se sem chave / erro / timeout. */
export async function askGemini(
  pointName: string,
  history: { role: "user" | "bot"; text: string }[],
  userText: string,
): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    client ??= new GoogleGenAI({ apiKey: key });
    const call = client.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: buildContents(history, userText),
      config: { systemInstruction: buildSystemInstruction(pointName), maxOutputTokens: 300, temperature: 0.4 },
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<null>((r) => { timer = setTimeout(() => r(null), TIMEOUT_MS); });
    const res = await Promise.race([call, timeout]);
    clearTimeout(timer);
    call.catch(() => {}); // evita unhandled rejection se o timeout vencer
    return res?.text?.trim() || null;
  } catch {
    return null; // nunca logar a chave nem o erro bruto
  }
}
