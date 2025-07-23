import mongoose from "mongoose";

const ConversationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  model: { type: String, required: true },
  systemPrompt: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.Conversation ||
  mongoose.model("Conversation", ConversationSchema);
