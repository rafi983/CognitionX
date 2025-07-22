const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error("Please define the GEMINI_API_KEY environment variable");
}

const MAX_RETRIES = 2;
const TIMEOUT_MS = 30000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function makeApiRequest(url, options, retries = MAX_RETRIES) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${errorText}`);
    }

    return response;
  } catch (error) {
    if (
      retries > 0 &&
      (error.name === "TimeoutError" ||
        error.name === "AbortError" ||
        (error.cause && error.cause.code === "UND_ERR_CONNECT_TIMEOUT"))
    ) {
      const backoffTime = 1000 * (MAX_RETRIES - retries + 1);
      await wait(backoffTime);
      return makeApiRequest(url, options, retries - 1);
    }

    if (
      error.name === "TimeoutError" ||
      error.name === "AbortError" ||
      (error.cause && error.cause.code === "UND_ERR_CONNECT_TIMEOUT")
    ) {
      throw new Error(
        "Connection timeout when calling Gemini API. Please try again later.",
      );
    }
    throw error;
  }
}

export async function getGeminiResponse(messages, model) {
  const contents = messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));

  let modelName =
    typeof model === "string" && model ? model : "gemini-1.5-flash";
  if (!modelName.startsWith("models/")) {
    modelName = `models/${modelName}`;
  }

  const url = `https://generativelanguage.googleapis.com/v1/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents }),
  };

  const response = await makeApiRequest(url, options);
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  return text || "[No response from Gemini API]";
}

export async function streamGeminiResponse(messages, model) {
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : m.role,
    parts: [{ text: m.content }],
  }));

  let modelName =
    typeof model === "string" && model ? model : "gemini-1.5-flash";
  if (!modelName.startsWith("models/")) {
    modelName = `models/${modelName}`;
  }

  const url = `https://generativelanguage.googleapis.com/v1/${modelName}:streamGenerateContent?key=${GEMINI_API_KEY}`;

  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents }),
  };

  return await makeApiRequest(url, options);
}
