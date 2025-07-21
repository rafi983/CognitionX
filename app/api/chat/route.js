import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import { getGeminiResponse } from "@/lib/gemini";

export async function POST(req) {
  await connectToDatabase();
  const { conversationId, message } = await req.json();
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
  });
  // Get all previous messages for context
  const messages = await Message.find({ conversationId }).sort({
    createdAt: 1,
  });
  // Prepare for Gemini (do not duplicate the latest message)
  const geminiMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  // Get Gemini response
  let assistantContent = "";
  try {
    assistantContent = await getGeminiResponse(geminiMessages);
  } catch (e) {
    return NextResponse.json({ error: "Gemini API error." }, { status: 500 });
  }
  const assistantMsg = await Message.create({
    conversationId,
    role: "assistant",
    content: assistantContent,
  });
  await Conversation.findByIdAndUpdate(conversationId, {
    updatedAt: Date.now(),
  });
  return NextResponse.json({ user: userMsg, assistant: assistantMsg });
}
