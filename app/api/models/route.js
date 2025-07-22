import { NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function GET() {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Missing Gemini API key" },
      { status: 500 },
    );
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch models" },
        { status: 500 },
      );
    }
    const data = await res.json();

    // List of deprecated models to exclude
    const deprecatedModels = [
      "gemini-pro-vision",
      "gemini-1.0-pro-vision",
      "gemini-1.0-pro-vision-latest",
      "gemini-1.0-pro-vision-001",
      "gemini-1.0-pro-vision-002",
      "gemini-pro-vision-001",
      "gemini-pro-vision-002",
    ];

    const models = (data.models || []).filter(
      (m) =>
        (m.supportedGenerationMethods || []).includes("generateContent") &&
        !deprecatedModels.includes(m.name),
    );

    const recommendedVisionModel = models.find(
      (m) => m.name === "gemini-1.5-flash",
    ) ||
      models.find((m) => m.name === "gemini-1.5-pro") || {
        name: "gemini-1.5-flash",
        displayName: "Gemini 1.5 Flash",
        description: "Efficient multimodal model supporting images and text",
        supportedGenerationMethods: ["generateContent"],
      };

    // Ensure no duplicates
    const allModels = [...models];
    if (!models.some((m) => m.name === recommendedVisionModel.name)) {
      allModels.push(recommendedVisionModel);
    }

    return NextResponse.json({ models: allModels });
  } catch (error) {
    console.error("Error fetching models:", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 },
    );
  }
}
