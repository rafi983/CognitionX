import { connectToDatabase } from "./mongodb";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import { getGeminiResponse } from "./gemini";

export async function generateTitle(conversationId) {
  try {
    await connectToDatabase();

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return null;
    }

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .limit(2);

    if (messages.length < 2) {
      return null;
    }

    const formattedMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
      imageUrl: m.imageUrl || null,
    }));

    const titlePrompt =
      "Create a catchy, capitalized title for this conversation that's 2-5 words long. The title should be in title case (capitalize important words), be creative, and NOT just repeat the question. For example, if the conversation is about 'choreography in movies', the title could be 'Film Dance Artistry' or 'Cinematic Movement Masters'. Return ONLY the title text, no quotes or explanations.";

    formattedMessages.push({
      role: "user",
      content: titlePrompt,
    });

    const title = await getGeminiResponse(
      formattedMessages,
      "gemini-1.5-flash",
    );

    let cleanTitle = title.trim();

    cleanTitle = cleanTitle.replace(/^["'\s.,;:]+|["'\s.,;:]+$/g, "");

    cleanTitle = toTitleCase(cleanTitle);

    const userQuestion = messages[0].content.toLowerCase();
    const titleLower = cleanTitle.toLowerCase();

    const isTitleSameAsQuestion = titleLower === userQuestion.toLowerCase();
    const isQuestionContainsTitle = userQuestion.includes(titleLower);
    const isTitleContainsQuestion = titleLower.includes(userQuestion);

    if (
      isTitleSameAsQuestion ||
      isQuestionContainsTitle ||
      isTitleContainsQuestion
    ) {
      const topic = extractTopic(userQuestion);
      cleanTitle = toTitleCase(topic + " Exploration");
    }

    if (cleanTitle.length > 50) {
      cleanTitle = cleanTitle.substring(0, 47) + "...";
    }

    if (
      !cleanTitle ||
      cleanTitle.includes("[No response") ||
      cleanTitle.length < 2
    ) {
      cleanTitle = "New Conversation";
    }

    conversation.title = cleanTitle;
    await conversation.save();

    return cleanTitle;
  } catch (error) {
    return null;
  }
}

function toTitleCase(str) {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function extractTopic(question) {
  const cleaned = question
    .toLowerCase()
    .replace(
      /^(what|who|when|where|why|how|is|are|can|could|would|should|do|does|did) /i,
      "",
    )
    .replace(/\?/g, "");

  const words = cleaned.split(" ");
  const topic = words.slice(0, Math.min(2, words.length)).join(" ");
  return topic;
}
