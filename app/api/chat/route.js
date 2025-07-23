import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import { getGeminiResponse } from "@/lib/gemini";
import { generateTitle } from "@/lib/titleGenerator";

export async function POST(req) {
  await connectToDatabase();
  const { conversationId, message, imageUrl, imageData } = await req.json();
  if (!conversationId || !message) {
    return NextResponse.json(
      { error: "Conversation ID and message are required." },
      { status: 400 },
    );
  }

  const userMsg = await Message.create({
    conversationId,
    role: "user",
    content: message,
    imageUrl: imageUrl || undefined,
  });

  const messages = await Message.find({ conversationId }).sort({
    createdAt: 1,
  });

  const geminiMessages = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : m.role,
    content: m.content,
    ...(m.imageUrl && { imageUrl: m.imageUrl }),
    ...(imageData && m === messages[messages.length - 1] && { imageData }),
  }));

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found." },
      { status: 404 },
    );
  }

  let assistantContent = "";
  const modelToUse = conversation.model || "gemini-1.5-pro-002";
  try {
    assistantContent = await getGeminiResponse(
      geminiMessages,
      modelToUse,
      conversation.systemPrompt,
    );
  } catch (e) {
    return NextResponse.json(
      { error: `Gemini API error: ${e.message}` },
      { status: 500 },
    );
  }

  const assistantMsg = await Message.create({
    conversationId,
    role: "assistant",
    content: assistantContent,
  });

  await Conversation.findByIdAndUpdate(conversationId, {
    updatedAt: Date.now(),
  });

  if (messages.length === 1) {
    try {
      await generateTitle(conversationId);
    } catch (error) {}
  }

  return NextResponse.json({ user: userMsg, assistant: assistantMsg });
}
