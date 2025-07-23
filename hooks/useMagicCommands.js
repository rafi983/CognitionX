import { useState } from "react";
import {
  isMagicCommand,
  parseMagicCommand,
  executeMagicCommand,
  getMagicCommandSuggestions,
} from "@/lib/magicCommands";

export const useMagicCommands = (messages, conversationId, selectedModel) => {
  const [showCommandSuggestions, setShowCommandSuggestions] = useState(false);
  const [commandSuggestions, setCommandSuggestions] = useState([]);

  const handleInputChange = (value, setInput) => {
    setInput(value);

    // Check if input is a magic command
    if (isMagicCommand(value)) {
      const query = value.slice(1).toLowerCase();
      const suggestions = getMagicCommandSuggestions(query);
      setCommandSuggestions(suggestions);
      setShowCommandSuggestions(true);
    } else {
      setShowCommandSuggestions(false);
      setCommandSuggestions([]);
    }
  };

  const selectCommandSuggestion = (suggestion, setInput) => {
    setInput(suggestion.command);
    setShowCommandSuggestions(false);
    setCommandSuggestions([]);
  };

  const executeMagicCommandWithStreaming = async ({
    commandInput,
    setMessages,
    setInput,
    setLoading,
    setIsStreaming,
    setError,
  }) => {
    const { command, args, isValid } = parseMagicCommand(commandInput);

    if (!isValid) {
      setError(
        `Unknown command: ${command}. Type /help to see available commands.`,
      );
      return;
    }

    setLoading(true);
    setIsStreaming(true);
    setError("");

    // Add user message for the command
    const commandMsg = {
      _id: Date.now().toString(),
      role: "user",
      content: commandInput,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, commandMsg]);

    // Create streaming placeholder for magic command response
    const placeholderAssistantMsg = {
      _id: `magic-streaming-${Date.now()}`,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      isStreaming: true,
    };
    setMessages((prev) => [...prev, placeholderAssistantMsg]);
    setInput("");
    setShowCommandSuggestions(false);

    try {
      // Get the magic command result
      const result = await executeMagicCommand(
        command,
        args,
        messages,
        conversationId,
        selectedModel,
      );

      if (result.success) {
        // Simulate streaming by displaying the result gradually
        const fullContent = result.result;
        const words = fullContent.split(" ");
        let currentContent = "";

        // Stream the content word by word for a better UX
        for (let i = 0; i < words.length; i++) {
          currentContent += (i > 0 ? " " : "") + words[i];

          setMessages((prev) =>
            prev.map((msg) =>
              msg._id === placeholderAssistantMsg._id
                ? { ...msg, content: currentContent }
                : msg,
            ),
          );

          // Add a small delay to simulate streaming
          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        // Mark streaming as complete
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === placeholderAssistantMsg._id
              ? { ...msg, isStreaming: false }
              : msg,
          ),
        );
      } else {
        setError(result.error);
        // Remove the placeholder message on error
        setMessages((prev) =>
          prev.filter((msg) => msg._id !== placeholderAssistantMsg._id),
        );
      }
    } catch (error) {
      setError(`Command failed: ${error.message}`);
      // Remove the placeholder message on error
      setMessages((prev) =>
        prev.filter((msg) => msg._id !== placeholderAssistantMsg._id),
      );
    } finally {
      setLoading(false);
      setIsStreaming(false);
    }
  };

  return {
    showCommandSuggestions,
    commandSuggestions,
    handleInputChange,
    selectCommandSuggestion,
    executeMagicCommandWithStreaming,
  };
};
