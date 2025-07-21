const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro-002:generateContent";

if (!GEMINI_API_KEY) {
  throw new Error("Please define the GEMINI_API_KEY environment variable");
}

export async function getGeminiResponse(messages) {
  const contents = messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));
  const body = { contents };
  const url = `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${errorText}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return "[No response from Gemini API]";
  }
  return text;
}
