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
      .limit(3);

    if (messages.length < 2) {
      return null;
    }

    const formattedMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
      imageUrl: m.imageUrl || null,
    }));

    // Get persona context from conversation
    const personaContext = conversation.systemPrompt || "";
    const hasPersona = personaContext.length > 0;

    // Enhanced prompt that considers persona
    let titlePrompt =
      "Based on the conversation above, create a concise, engaging title that captures the main topic or theme.";

    if (hasPersona) {
      titlePrompt +=
        " IMPORTANT: The conversation uses a specific AI persona/character. Consider the personality and tone from the conversation when creating the title - make it reflect the style and approach used.";
    }

    titlePrompt += "\n\nThe title should be:\n";
    titlePrompt += "- 2-6 words maximum\n";
    titlePrompt +=
      "- Creative and descriptive (not just restating the question)\n";
    titlePrompt += "- In title case format\n";
    titlePrompt += "- Focus on the core concept or subject matter";

    if (hasPersona) {
      titlePrompt +=
        "\n- Reflect the personality/style evident in the conversation";
    }

    titlePrompt +=
      "\n- Avoid generic words like 'help', 'question', 'assistance'\n\n";
    titlePrompt += "Examples:";

    if (hasPersona) {
      titlePrompt += '\n- For sarcastic tone about coding: "Debugging Drama"';
      titlePrompt +=
        '\n- For creative writing about stories: "Narrative Crafting"';
      titlePrompt += '\n- For analytical discussion: "Data Deep Dive"';
      titlePrompt += '\n- For teaching style: "Learning Journey"';
    } else {
      titlePrompt += '\n- For AI questions: "AI Technology Insights"';
      titlePrompt += '\n- For coding help: "Programming Solutions"';
      titlePrompt += '\n- For creative topics: "Creative Writing Tips"';
    }

    titlePrompt += "\n\nReturn ONLY the title, no quotes or explanations.";

    formattedMessages.push({
      role: "user",
      content: titlePrompt,
    });

    const title = await getGeminiResponse(
      formattedMessages,
      "gemini-1.5-flash",
      "",
    );

    let cleanTitle = title.trim();

    // Better cleaning of the title
    cleanTitle = cleanTitle.replace(/^["'\s.,;:]+|["'\s.,;:]+$/g, "");
    cleanTitle = cleanTitle.replace(/^Title:\s*/i, ""); // Remove "Title:" prefix if present
    cleanTitle = cleanTitle.replace(/\n.*/s, ""); // Remove everything after first line

    cleanTitle = toTitleCase(cleanTitle);

    const userQuestion = messages[0].content.toLowerCase();
    const titleWords = cleanTitle.toLowerCase().split(/\s+/);
    const questionWords = userQuestion.toLowerCase().split(/\s+/);

    // Improved similarity detection - only reject if title is too similar
    const isExactMatch =
      cleanTitle.toLowerCase() === userQuestion.toLowerCase();
    const isSubstring =
      userQuestion.toLowerCase().includes(cleanTitle.toLowerCase()) &&
      cleanTitle.length > userQuestion.length * 0.7;

    // Check if title is just a subset of question words (too generic)
    const titleWordSet = new Set(titleWords.filter((word) => word.length > 2)); // Ignore short words
    const questionWordSet = new Set(
      questionWords.filter((word) => word.length > 2),
    );
    const overlap = [...titleWordSet].filter((word) =>
      questionWordSet.has(word),
    );
    const isJustQuestionWords =
      overlap.length === titleWordSet.size && titleWordSet.size > 0;

    if (isExactMatch || isSubstring || isJustQuestionWords) {
      // Better fallback: extract meaningful topic from the question with persona context
      const topic = extractMeaningfulTopic(userQuestion);
      cleanTitle = hasPersona
        ? generatePersonaAwareTitle(topic, personaContext)
        : toTitleCase(topic);
    }

    // Length validation
    if (cleanTitle.length > 50) {
      cleanTitle = cleanTitle.substring(0, 47) + "...";
    }

    // Final validation
    if (
      !cleanTitle ||
      cleanTitle.includes("[No response") ||
      cleanTitle.length < 2 ||
      cleanTitle.toLowerCase() === "new conversation"
    ) {
      cleanTitle = generateFallbackTitle(messages, personaContext);
    }

    conversation.title = cleanTitle;
    await conversation.save();

    return cleanTitle;
  } catch (error) {
    console.error("Title generation error:", error);
    return "New Conversation";
  }
}

function toTitleCase(str) {
  const articles = ["a", "an", "the"];
  const prepositions = [
    "in",
    "on",
    "at",
    "by",
    "for",
    "with",
    "to",
    "of",
    "and",
    "or",
    "but",
  ];

  return str
    .toLowerCase()
    .split(" ")
    .map((word, index) => {
      // Always capitalize first and last word
      if (index === 0 || index === str.split(" ").length - 1) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      // Don't capitalize articles and short prepositions
      if (articles.includes(word) || prepositions.includes(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function extractMeaningfulTopic(question) {
  // Remove common question words and patterns
  let cleaned = question
    .toLowerCase()
    .replace(
      /^(what|who|when|where|why|how|is|are|can|could|would|should|do|does|did|will|would|please|help|explain|tell)\s+/gi,
      "",
    )
    .replace(/\b(me|about|with|for|the|a|an)\b/gi, " ")
    .replace(/[?.,!]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Extract key concepts (nouns, adjectives, important words)
  const words = cleaned.split(" ");
  const meaningfulWords = words.filter(
    (word) =>
      word.length > 2 &&
      ![
        "you",
        "your",
        "this",
        "that",
        "some",
        "any",
        "how",
        "what",
        "why",
      ].includes(word),
  );

  // Take first 2-3 meaningful words
  const topic = meaningfulWords.slice(0, 3).join(" ");
  return topic || "Discussion Topic";
}

function generatePersonaAwareTitle(topic, personaContext) {
  // Extract personality indicators from the system prompt
  const personaLower = personaContext.toLowerCase();

  // Define personality-based title modifiers
  if (personaLower.includes("sarcastic") || personaLower.includes("witty")) {
    const sarcasticWords = [
      "Drama",
      "Saga",
      "Chronicles",
      "Reality Check",
      "Truth Bomb",
    ];
    const modifier =
      sarcasticWords[Math.floor(Math.random() * sarcasticWords.length)];
    return toTitleCase(`${topic} ${modifier}`);
  }

  if (personaLower.includes("creative") || personaLower.includes("writer")) {
    const creativeWords = [
      "Artistry",
      "Crafting",
      "Creation",
      "Expression",
      "Vision",
    ];
    const modifier =
      creativeWords[Math.floor(Math.random() * creativeWords.length)];
    return toTitleCase(`${topic} ${modifier}`);
  }

  if (personaLower.includes("research") || personaLower.includes("analyst")) {
    const analyticalWords = [
      "Analysis",
      "Deep Dive",
      "Investigation",
      "Study",
      "Insights",
    ];
    const modifier =
      analyticalWords[Math.floor(Math.random() * analyticalWords.length)];
    return toTitleCase(`${topic} ${modifier}`);
  }

  if (
    personaLower.includes("teaching") ||
    personaLower.includes("educational")
  ) {
    const teachingWords = [
      "Tutorial",
      "Learning",
      "Masterclass",
      "Guide",
      "Lesson",
    ];
    const modifier =
      teachingWords[Math.floor(Math.random() * teachingWords.length)];
    return toTitleCase(`${topic} ${modifier}`);
  }

  if (personaLower.includes("marketing") || personaLower.includes("strategy")) {
    const marketingWords = [
      "Strategy",
      "Campaign",
      "Insights",
      "Tactics",
      "Blueprint",
    ];
    const modifier =
      marketingWords[Math.floor(Math.random() * marketingWords.length)];
    return toTitleCase(`${topic} ${modifier}`);
  }

  if (personaLower.includes("code") || personaLower.includes("review")) {
    const codingWords = [
      "Code Review",
      "Debug Session",
      "Optimization",
      "Refactoring",
      "Solutions",
    ];
    const modifier =
      codingWords[Math.floor(Math.random() * codingWords.length)];
    return toTitleCase(`${topic} ${modifier}`);
  }

  // Fallback for unrecognized personas
  return toTitleCase(`${topic} Discussion`);
}

function generateFallbackTitle(messages, personaContext = "") {
  if (messages.length === 0) return "New Conversation";

  const firstMessage = messages[0].content;
  const topic = extractMeaningfulTopic(firstMessage);

  if (topic && topic !== "Discussion Topic") {
    if (personaContext) {
      return generatePersonaAwareTitle(topic, personaContext);
    }
    return toTitleCase(topic);
  }

  const words = firstMessage.split(" ").slice(0, 3);
  return toTitleCase(words.join(" "));
}
