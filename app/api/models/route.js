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
  // Only return models that support generateContent
  const models = (data.models || []).filter((m) =>
    (m.supportedGenerationMethods || []).includes("generateContent"),
  );
  return NextResponse.json({ models });
}
