import { truncate } from './text.js';

/** Gemini model — override with the GEMINI_MODEL env var if needed. */
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
const API = 'https://generativelanguage.googleapis.com/v1beta/models';

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

/** True when a Gemini API key is configured. */
export function summariesEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/** Summarize a job posting into one short Portuguese sentence via Gemini. */
export async function summarizeJob(title: string, description: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return '';
  }
  const prompt =
    'Resuma esta vaga de início de carreira em UMA frase curta e direta ' +
    '(no máximo 22 palavras), em português do Brasil. Diga o que a pessoa vai fazer e ' +
    'as principais habilidades ou requisitos. Não use saudações nem comece com "esta vaga".\n\n' +
    `Cargo: ${title}\n\nDescrição:\n${truncate(description, 2400)}`;
  const response = await fetch(`${API}/${MODEL}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 120,
        // gemini-2.5 reasons by default and thinking tokens count against the
        // output budget — disable it so a one-line summary isn't truncated.
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });
  if (!response.ok) {
    throw new Error(`Gemini request failed: ${response.status}`);
  }
  const data = (await response.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return text
    .replace(/\s+/g, ' ')
    .replace(/^["']|["']$/g, '')
    .trim();
}
