import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";

export async function GET(req, { params }) {
  await connectToDatabase();
  const { id } = params;
  const conversation = await Conversation.findById(id);
  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  }
  const messages = await Message.find({ conversationId: id }).sort({
    createdAt: 1,
  });
  const plainConversation = conversation.toObject();
  return NextResponse.json({
    conversation,
    messages,
    model: conversation.model,
  });
}

export async function PATCH(req, { params }) {
  await connectToDatabase();
  const { id } = params;
  const { title, model } = await req.json();
  const update = { updatedAt: Date.now() };
  if (title !== undefined) update.title = title;
  if (model !== undefined) update.model = model;
  const conversation = await Conversation.findByIdAndUpdate(id, update, {
    new: true,
  });
  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  }
  return NextResponse.json(conversation);
}

export async function DELETE(req, { params }) {
  await connectToDatabase();
  const { id } = params;
  await Message.deleteMany({ conversationId: id });
  await Conversation.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
