import { NextResponse } from "next/server";
import { getGeminiResponse } from "@/lib/gemini";
import { MAGIC_COMMANDS } from "@/lib/magicCommands";

export async function POST(req) {
  try {
    const { command, args, messages, conversationId, model } = await req.json();

    const commandInfo = MAGIC_COMMANDS[command];

    if (!commandInfo) {
      return NextResponse.json(
        {
          error: `Unknown command: ${command}. Type /help to see available commands.`,
        },
        { status: 400 },
      );
    }

    if (
      commandInfo.requiresConversation &&
      (!messages || messages.length === 0)
    ) {
      return NextResponse.json(
        {
          error: `The ${command} command requires an active conversation with messages.`,
        },
        { status: 400 },
      );
    }

    let result;

    switch (command) {
      case "/help":
        result = generateHelpMessage();
        break;

      case "/summarize":
        result = await generateSummary(messages, model);
        break;

      case "/history":
        result = generateHistory(messages);
        break;

      case "/explain":
        result = await explainLastResponse(messages, model);
        break;

      case "/translate":
        result = await translateLastMessage(messages, args, model);
        break;

      case "/code":
        result = await reviewCode(messages, model);
        break;

      case "/brainstorm":
        result = await brainstormIdeas(messages, args, model);
        break;

      default:
        result = `Command ${command} is not implemented yet.`;
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Magic command execution error:", error);
    return NextResponse.json(
      { error: `Failed to execute command: ${error.message}` },
      { status: 500 },
    );
  }
}

function generateHelpMessage() {
  const commandList = Object.entries(MAGIC_COMMANDS)
    .map(([cmd, info]) => `${info.icon} **${cmd}** - ${info.description}`)
    .join("\n");

  return `# 🪄 Magic Commands\n\nHere are the available magic commands:\n\n${commandList}\n\n*Simply type any command in the input box to use it!*`;
}

async function generateSummary(messages, model) {
  const conversationText = messages
    .map((msg) => `**${msg.role.toUpperCase()}**: ${msg.content}`)
    .join("\n\n");

  const prompt = `Please provide a concise summary of this conversation. Focus on the main topics discussed, key questions asked, and important conclusions reached:\n\n${conversationText}`;

  const summary = await getGeminiResponse(
    [{ role: "user", content: prompt }],
    model,
  );
  return `# 📝 Conversation Summary\n\n${summary}`;
}

function generateHistory(messages) {
  const messageCount = messages.length;
  const userMessages = messages.filter((msg) => msg.role === "user").length;
  const assistantMessages = messages.filter(
    (msg) => msg.role === "assistant",
  ).length;

  const firstMessage = messages[0];
  const lastMessage = messages[messages.length - 1];

  const timeline = messages
    .slice(-10) // Show last 10 messages
    .map((msg, index) => {
      const time = new Date(msg.createdAt).toLocaleTimeString();
      const preview =
        msg.content.substring(0, 50) + (msg.content.length > 50 ? "..." : "");
      return `${time} - **${msg.role.toUpperCase()}**: ${preview}`;
    })
    .join("\n");

  return `# 📚 Conversation History\n\n**Statistics:**\n- Total messages: ${messageCount}\n- User messages: ${userMessages}\n- Assistant messages: ${assistantMessages}\n- Started: ${new Date(firstMessage?.createdAt).toLocaleString()}\n- Last activity: ${new Date(lastMessage?.createdAt).toLocaleString()}\n\n**Recent Timeline:**\n${timeline}`;
}

async function explainLastResponse(messages, model) {
  const lastAssistantMessage = messages
    .filter((msg) => msg.role === "assistant")
    .pop();

  if (!lastAssistantMessage) {
    return "No AI responses found to explain.";
  }

  const prompt = `Please explain this AI response in simple, easy-to-understand terms. Break down complex concepts and provide clarification:\n\n"${lastAssistantMessage.content}"`;

  const explanation = await getGeminiResponse(
    [{ role: "user", content: prompt }],
    model,
  );
  return `# 💡 Explanation of Last Response\n\n${explanation}`;
}

async function translateLastMessage(messages, targetLang, model) {
  const lastMessage = messages[messages.length - 1];

  if (!lastMessage) {
    return "No messages found to translate.";
  }

  const language = targetLang || "English";
  const prompt = `Please translate this message to ${language}:\n\n"${lastMessage.content}"`;

  const translation = await getGeminiResponse(
    [{ role: "user", content: prompt }],
    model,
  );
  return `# 🌍 Translation to ${language}\n\n**Original (${lastMessage.role.toUpperCase()}):**\n${lastMessage.content}\n\n**Translation:**\n${translation}`;
}

async function reviewCode(messages, model) {
  const codeMessages = messages.filter(
    (msg) =>
      msg.content.includes("```") ||
      msg.content.includes("function") ||
      msg.content.includes("class") ||
      msg.content.includes("import") ||
      msg.content.includes("const ") ||
      msg.content.includes("let ") ||
      msg.content.includes("var "),
  );

  if (codeMessages.length === 0) {
    return "No code found in the conversation to review.";
  }

  const codeContent = codeMessages.map((msg) => msg.content).join("\n\n");
  const prompt = `Please review the following code from our conversation. Provide feedback on code quality, best practices, potential improvements, and any issues you notice:\n\n${codeContent}`;

  const review = await getGeminiResponse(
    [{ role: "user", content: prompt }],
    model,
  );
  return `# 💻 Code Review\n\n${review}`;
}

async function brainstormIdeas(messages, topic, model) {
  const context =
    messages.length > 0
      ? `Based on our conversation about: ${messages
          .map((m) => m.content)
          .join(" ")
          .substring(0, 200)}...`
      : "";

  const prompt = topic
    ? `Generate creative ideas and suggestions for: ${topic}. ${context}`
    : `Generate creative ideas and next steps based on our conversation. ${context}`;

  const ideas = await getGeminiResponse(
    [{ role: "user", content: prompt }],
    model,
  );
  return `# 🧠 Brainstorming Session\n\n${ideas}`;
}
