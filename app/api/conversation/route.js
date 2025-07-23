import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import { getGeminiResponse } from "@/lib/gemini";
import { generateTitle } from "@/lib/titleGenerator";

export async function POST(req) {
  await connectToDatabase();
  const { title, message, model, systemPrompt, imageUrl } = await req.json();

  if (!title || !message || !model) {
    return NextResponse.json(
      { error: "Title, message, and model are required." },
      { status: 400 },
    );
  }

  try {
    const conversation = await Conversation.create({
      title,
      model,
      systemPrompt: systemPrompt || "",
    });

    const userMsg = await Message.create({
      conversationId: conversation._id,
      role: "user",
      content: message,
      imageUrl: imageUrl || undefined,
    });

    const geminiMessages = [
      {
        role: "user",
        content: message,
        ...(imageUrl && { imageData: imageUrl }),
      },
    ];

    let assistantContent = "";
    try {
      assistantContent = await getGeminiResponse(
        geminiMessages,
        model,
        systemPrompt,
      );
    } catch (e) {
      return NextResponse.json(
        { error: `Gemini API error: ${e.message}` },
        { status: 500 },
      );
    }

    const assistantMsg = await Message.create({
      conversationId: conversation._id,
      role: "assistant",
      content: assistantContent,
    });

    try {
      await generateTitle(conversation._id);
    } catch (error) {}

    return NextResponse.json({
      conversation,
      messages: [userMsg, assistantMsg],
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to create conversation: ${error.message}` },
      { status: 500 },
    );
  }
}

export async function GET() {
  await connectToDatabase();
  const conversations = await Conversation.find().sort({ updatedAt: -1 });
  return NextResponse.json(conversations);
}
