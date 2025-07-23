import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import { getGeminiResponse } from "@/lib/gemini";
import { generateTitle } from "@/lib/titleGenerator";

export async function POST(req) {
  await connectToDatabase();
  const { conversationId, message, imageUrl, imageData } = await req.json();

  if (!conversationId || (!message && !imageUrl && !imageData)) {
    return NextResponse.json(
      { error: "Conversation ID and either message or image are required." },
      { status: 400 },
    );
  }

  try {
    const userMsg = await Message.create({
      conversationId,
      role: "user",
      content: message || "Image attached",
      imageUrl: imageUrl || undefined,
    });

    const messages = await Message.find({ conversationId }).sort({
      createdAt: 1,
    });

    const validMessages = messages.filter(
      (m) =>
        !(
          m.role === "assistant" &&
          (m.content === "[Loading response...]" ||
            m.content === "[No response from Gemini]" ||
            m.content === "[No response from Gemini API]" ||
            m.content.includes("[Error during streaming:"))
        ),
    );

    const geminiMessages = validMessages.map((m, index) => {
      if (
        index === validMessages.length - 1 &&
        m.role === "user" &&
        imageData
      ) {
        return {
          role: m.role,
          content: m.content,
          imageUrl: m.imageUrl,
          imageData: imageData,
        };
      }

      return {
        role: m.role,
        content: m.content,
        imageUrl: m.imageUrl,
      };
    });

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    }

    await Conversation.findByIdAndUpdate(conversationId, {
      updatedAt: Date.now(),
    });

    const assistantMsg = await Message.create({
      conversationId,
      role: "assistant",
      content: "[Loading response...]",
    });

    const modelToUse = conversation.model || "gemini-1.5-pro-002";

    const headers = new Headers();
    headers.set("Content-Type", "text/event-stream");
    headers.set("Cache-Control", "no-cache");
    headers.set("Connection", "keep-alive");

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      try {
        const fullText = await getGeminiResponse(
          geminiMessages,
          modelToUse,
          conversation.systemPrompt,
        );

        await Message.findByIdAndUpdate(assistantMsg._id, {
          content: fullText,
        });

        if (messages.length === 2) {
          try {
            await generateTitle(conversationId);
          } catch (error) {}
        }

        const chunkSize = 15;
        for (let i = 0; i < fullText.length; i += chunkSize) {
          const chunk = fullText.substring(
            i,
            Math.min(i + chunkSize, fullText.length),
          );
          await writer.write(
            encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`),
          );
          await new Promise((resolve) => setTimeout(resolve, 5));
        }

        await writer.write(encoder.encode("data: [DONE]\n\n"));
        await writer.close();
      } catch (error) {
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({ error: error.message })}\n\n`,
          ),
        );

        await Message.findByIdAndUpdate(assistantMsg._id, {
          content: `[Error: ${error.message}]`,
        });

        await writer.write(encoder.encode("data: [DONE]\n\n"));
        await writer.close();
      }
    })();

    return new Response(readable, { headers });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to set up streaming: ${error.message}` },
      { status: 500 },
    );
  }
}
