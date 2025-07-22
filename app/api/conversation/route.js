import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import { getGeminiResponse } from "@/lib/gemini";
import { generateTitle } from "@/lib/titleGenerator";

export async function POST(req) {
  await connectToDatabase();
  const { title, message, model } = await req.json();
  if (!title || !message || !model) {
    return NextResponse.json(
      { error: "Title, message, and model are required." },
      { status: 400 },
    );
  }

  const conversation = await Conversation.create({ title, model });

  const userMsg = await Message.create({
    conversationId: conversation._id,
    role: "user",
    content: message,
  });

  let assistantContent = "";
  try {
    assistantContent = await getGeminiResponse(
      [{ role: "user", content: message }],
      model,
    );
  } catch (e) {
    assistantContent = "[No response from Gemini]";
  }

  const assistantMsg = await Message.create({
    conversationId: conversation._id,
    role: "assistant",
    content: assistantContent,
  });

  try {
    await generateTitle(conversation._id.toString());
  } catch (error) {}

  return NextResponse.json({ conversation, messages: [userMsg, assistantMsg] });
}

export async function GET() {
  await connectToDatabase();
  const conversations = await Conversation.find().sort({ updatedAt: -1 });
  return NextResponse.json(conversations);
}
