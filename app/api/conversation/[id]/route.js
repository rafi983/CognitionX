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
  return NextResponse.json({ conversation, messages });
}

export async function PATCH(req, { params }) {
  await connectToDatabase();
  const { id } = params;
  const { title } = await req.json();
  const conversation = await Conversation.findByIdAndUpdate(
    id,
    { title, updatedAt: Date.now() },
    { new: true },
  );
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
