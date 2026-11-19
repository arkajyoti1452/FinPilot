import 'dotenv/config';

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

if (!apiKey) {
  console.error('GEMINI_API_KEY is missing from server/.env.');
  process.exitCode = 1;
}

try {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Reply with the single word OK.' }] }], generationConfig: { temperature: 0, maxOutputTokens: 8 } }),
    signal: AbortSignal.timeout(60_000)
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    console.error(`Gemini check failed with HTTP ${response.status}.`);
    console.error(payload.error?.status ?? 'No provider status returned.');
    console.error(payload.error?.message ?? 'No provider message returned.');
    process.exitCode = 1;
  }

  console.log(`Gemini connection and API key work with model ${model}.`);
} catch (error) {
  console.error('Gemini check could not complete.');
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown network error.');
  process.exitCode = 1;
}
