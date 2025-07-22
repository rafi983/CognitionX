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
  // Process messages to include images if available
  const contents = messages.map((m) => {
    // If message has direct base64 image data, use that (highest priority)
    if (m.imageData) {
      try {
        // For multimodal messages with base64 data from the client
        return {
          role: m.role === "assistant" ? "model" : m.role,
          parts: [
            { text: m.content || "" },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: m.imageData.startsWith("data:")
                  ? m.imageData.split(",")[1] // Extract the base64 part
                  : m.imageData,
              },
            },
          ],
        };
      } catch (error) {
        console.error("Error processing image data:", error);
        return {
          role: m.role === "assistant" ? "model" : m.role,
          parts: [{ text: m.content || "Image processing failed" }],
        };
      }
    }
    // If message has imageUrl but no direct base64 data
    else if (m.imageUrl) {
      // We can't use URLs directly with Gemini API
      console.log("Image URL without base64 data, skipping image:", m.imageUrl);
      return {
        role: m.role === "assistant" ? "model" : m.role,
        parts: [
          { text: m.content || "Image attached (but can't be processed)" },
        ],
      };
    }

    // Standard text message
    return {
      role: m.role === "assistant" ? "model" : m.role,
      parts: [{ text: m.content }],
    };
  });

  // Use provided model or default to gemini-1.5-flash
  let modelName =
    typeof model === "string" && model ? model : "gemini-1.5-flash";

  // Check if we have images in the message
  const hasImages = messages.some((m) => m.imageData);

  // The following models are known to support multimodal content as of July 2025
  const multimodalModels = [
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-1.5-pro-001",
    "gemini-1.5-pro-002",
  ];

  // If we have images but the selected model doesn't support images
  if (hasImages && !multimodalModels.some((m) => modelName.includes(m))) {
    console.log(
      `Model ${modelName} might not support images, falling back to gemini-1.5-flash`,
    );
    modelName = "gemini-1.5-flash"; // Fallback to a model that definitely supports images
  }

  // Add 'models/' prefix if not already present
  if (!modelName.startsWith("models/")) {
    modelName = `models/${modelName}`;
  }

  const url = `https://generativelanguage.googleapis.com/v1/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents }),
  };

  console.log(
    `Sending request to ${modelName} with ${contents.length} messages`,
  );
  if (hasImages) {
    console.log("Request includes image data");
  }

  try {
    const response = await makeApiRequest(url, options);
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    return text || "[No response from Gemini API]";
  } catch (error) {
    // If the error is related to model capabilities, try with a fallback model
    if (hasImages && error.message?.includes("not supported")) {
      console.log("Model error with image content, trying with fallback model");
      // Try again with a known multimodal model
      modelName = "models/gemini-1.5-flash";

      const fallbackUrl = `https://generativelanguage.googleapis.com/v1/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
      const fallbackResponse = await makeApiRequest(fallbackUrl, {
        ...options,
        body: JSON.stringify({ contents }),
      });

      const fallbackData = await fallbackResponse.json();
      const fallbackText =
        fallbackData?.candidates?.[0]?.content?.parts?.[0]?.text;

      return fallbackText || "[No response from fallback model]";
    }

    throw error;
  }
}

export async function streamGeminiResponse(messages, model) {
  // Process messages to include images if available
  const contents = messages.map((m) => {
    if (m.imageUrl) {
      // If message has image, we need to create a multipart message
      try {
        return {
          role: m.role === "assistant" ? "model" : m.role,
          parts: [
            { text: m.content || "" },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: m.imageUrl.startsWith("data:")
                  ? m.imageUrl.split(",")[1]
                  : `image-url:${m.imageUrl}`,
              },
            },
          ],
        };
      } catch (error) {
        console.error("Error processing image for streaming:", error);
        return {
          role: m.role === "assistant" ? "model" : m.role,
          parts: [{ text: m.content || "Image processing failed" }],
        };
      }
    }

    // Standard text message
    return {
      role: m.role === "assistant" ? "model" : m.role,
      parts: [{ text: m.content }],
    };
  });

  let modelName =
    typeof model === "string" && model ? model : "gemini-1.5-flash";
  if (!modelName.startsWith("models/")) {
    modelName = `models/${modelName}`;
  }

  // Use gemini-1.5-pro for multimodal content
  if (messages.some((m) => m.imageUrl)) {
    if (!modelName.includes("pro")) {
      console.log("Switching to pro model for streaming multimodal content");
      modelName = "models/gemini-1.5-pro-002";
    }
  }

  const url = `https://generativelanguage.googleapis.com/v1/${modelName}:streamGenerateContent?key=${GEMINI_API_KEY}`;

  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents }),
  };

  return await makeApiRequest(url, options);
}
