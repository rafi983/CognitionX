import { NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function GET() {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Missing Gemini API key" },
      { status: 500 },
    );
  }
  const url = `https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 },
    );
  }
  const data = await res.json();
  // Only return models that support generateContent and are not deprecated
  const deprecatedModels = [
    "gemini-pro-vision",
    "gemini-1.0-pro-vision",
    "gemini-1.0-pro-vision-latest",
    "gemini-1.0-pro-vision-001",
    "gemini-1.0-pro-vision-002",
    "gemini-pro-vision-001",
    "gemini-pro-vision-002",
    // add more deprecated model names here if needed
  ];
  const models = (data.models || []).filter(
    (m) =>
      (m.supportedGenerationMethods || []).includes("generateContent") &&
      !deprecatedModels.includes(m.name) &&
      !(m.displayName && m.displayName.toLowerCase().includes("vision")) &&
      !(m.name && m.name.toLowerCase().includes("vision")),
  );
  return NextResponse.json({ models });
}
