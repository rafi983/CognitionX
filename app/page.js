"use client";

import { useState, useEffect, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Zap, ArrowRight, ImageIcon, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSpeech } from "@/hooks/useSpeech";
import { VoiceInputButton } from "@/components/SpeechControls";
import { PersonaSelector } from "@/components/PersonaSelector";
import { PERSONAS } from "@/lib/personas";
import {
  isMagicCommand,
  parseMagicCommand,
  executeMagicCommand,
  getMagicCommandSuggestions,
} from "@/lib/magicCommands";

const SUGGESTIONS = [
  "Summarize this article for me.",
  "Help me write a professional email.",
  "Generate a list of creative marketing ideas.",
  "/help - Show all available magic commands",
  "/brainstorm marketing ideas for a coffee shop",
];

const MAGIC_COMMAND_EXAMPLES = [
  { command: "/help", description: "Show all available magic commands" },
  { command: "/brainstorm", description: "Generate creative ideas" },
  { command: "/summarize", description: "Summarize conversation" },
  { command: "/history", description: "Show conversation overview" },
  { command: "/explain", description: "Explain last AI response" },
];

const LoadingSkeleton = () => (
  <div className="flex items-center space-x-3 animate-pulse mt-8 w-full max-w-2xl">
    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-300 to-pink-300 flex-shrink-0" />
    <div className="flex-1">
      <div className="rounded-2xl px-4 py-3 max-w-2xl bg-gray-100 h-6 mb-2" />
      <div className="rounded-2xl px-4 py-3 max-w-xl bg-gray-100 h-4" />
    </div>
  </div>
);

export default function WelcomePage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedPersona, setSelectedPersona] = useState("default");
  const [customPrompt, setCustomPrompt] = useState("");
  const [, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  const router = useRouter();

  const { isListening, speechError, startListening, stopListening } =
    useSpeech();

  useEffect(() => {
    fetch("/api/models")
      .then((res) => {
        if (!res.ok) {
          throw new Error(
            `Failed to fetch models: ${res.status} ${res.statusText}`,
          );
        }
        return res.json();
      })
      .then((data) => {
        setModels(data.models || []);
        if (data.models && data.models.length > 0) {
          setSelectedModel(data.models[0].name);
        }
      })
      .catch((error) => {
        setError("Failed to load models. Please refresh the page.");
      });
  }, []);

  const getSystemPrompt = () => {
    if (selectedPersona === "custom") {
      return customPrompt;
    }
    const persona = PERSONAS.find((p) => p.id === selectedPersona);
    return persona?.systemPrompt || "";
  };

  const handleUploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    setError("");

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload image");
      }

      const data = await response.json();
      setImagePreview(data.base64Data);
      setSelectedImage({
        url: data.url,
        base64Data: data.base64Data,
      });
    } catch (e) {
      setError(`Image upload failed: ${e.message}`);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Magic commands state
  const [showCommandSuggestions, setShowCommandSuggestions] = useState(false);
  const [commandSuggestions, setCommandSuggestions] = useState([]);

  const handleInputChange = (value) => {
    setInput(value);

    // Check if input is a magic command
    if (isMagicCommand(value)) {
      const query = value.slice(1).toLowerCase();
      const suggestions = getMagicCommandSuggestions(query);
      setCommandSuggestions(suggestions);
      setShowCommandSuggestions(suggestions.length > 0);
    } else {
      setShowCommandSuggestions(false);
      setCommandSuggestions([]);
    }
  };

  const handleMagicCommand = async (commandInput) => {
    const { command, args, isValid } = parseMagicCommand(commandInput);

    if (!isValid) {
      setError(
        `Unknown command: ${command}. Type /help to see available commands.`,
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await executeMagicCommand(
        command,
        args,
        [], // No conversation history on home page
        null, // No conversation ID
        selectedModel,
      );

      if (result.success) {
        // For home page, create a new conversation with the magic command result
        const res = await fetch("/api/conversation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: commandInput.slice(0, 40),
            message: commandInput,
            model: selectedModel,
            systemPrompt: getSystemPrompt(),
            magicCommandResult: result.result,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to create conversation");
        }

        const data = await res.json();
        router.push(`/conversation/${data.conversation._id}`);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError(`Command failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (prompt) => {
    if (!prompt && !imagePreview) return;
    if (!selectedModel) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: prompt?.slice(0, 40) || "Image conversation",
          message: prompt || "Image attached",
          model: selectedModel,
          systemPrompt: getSystemPrompt(),
          imageUrl: imagePreview,
        }),
      });

      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(`Failed to create conversation: ${res.status}`);
      }

      const data = await res.json();
      if (!data || !data.conversation || !data.conversation._id) {
        throw new Error("Invalid response from server");
      }

      router.push(`/conversation/${data.conversation._id}`);
    } catch (e) {
      setError(`Failed to start chat: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceInput = (transcript, autoSend = false) => {
    setInput(transcript);
    if (autoSend && transcript.trim()) {
      setTimeout(() => {
        handleSend(transcript);
      }, 100);
    }
  };

  const handleSubmit = async (inputText = null) => {
    const textToSend = inputText || input;
    if (!textToSend.trim() && !imagePreview) return;

    // Check if input is a magic command
    if (isMagicCommand(textToSend)) {
      await handleMagicCommand(textToSend);
    } else {
      await handleSend(textToSend);
    }
  };

  const selectCommandSuggestion = (suggestion) => {
    setInput(suggestion.command);
    setShowCommandSuggestions(false);
    setCommandSuggestions([]);
  };

  return (
    <div className="flex h-screen mx-auto bg-white max-h-screen">
      <Sidebar />
      <main className="flex-1 flex flex-col bg-white">
        <div className="flex-1 flex flex-col items-center justify-center px-8 pt-20 pb-8 overflow-y-auto">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 mb-8 flex items-center justify-center flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-300 via-pink-300 to-blue-300 opacity-80" />
          </div>

          <h1 className="text-4xl font-semibold text-gray-800 mb-2">
            Hi there
          </h1>
          <h2 className="text-3xl font-semibold text-gray-800 mb-6">
            How can I help you today?
          </h2>

          <p className="text-gray-600 text-center max-w-md mb-8 leading-relaxed">
            Choose a persona to customize the AI's behavior, then start your
            conversation.
          </p>

          <div className="space-y-3 w-full max-w-2xl">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                className="w-full flex items-center space-x-3 p-4 border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all text-left"
                onClick={() => handleSend(s)}
                disabled={loading}
              >
                <Zap className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                <span className="text-gray-700">{s}</span>
              </button>
            ))}
            {loading && <LoadingSkeleton />}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200">
          <div className="relative">
            <input
              type="text"
              placeholder="Ask me Anything or try /help for magic commands"
              className="w-full p-4 pr-64 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              disabled={loading}
              maxLength={1000}
            />
            {/* Magic Commands Dropdown - positioned above input */}
            {showCommandSuggestions && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
                {commandSuggestions.length === 0 ? (
                  <div className="p-2 text-gray-500 text-sm">
                    No command suggestions
                  </div>
                ) : (
                  commandSuggestions.map((suggestion) => (
                    <div
                      key={suggestion.command}
                      className="p-3 cursor-pointer hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0"
                      onClick={() => selectCommandSuggestion(suggestion)}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{suggestion.icon}</span>
                        <div className="flex-1">
                          <div className="font-medium text-gray-800">
                            {suggestion.command}
                          </div>
                          <div className="text-sm text-gray-500">
                            {suggestion.description}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
              {imagePreview && (
                <div className="relative mr-2">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-8 w-8 rounded object-cover"
                  />
                  <button
                    onClick={() => {
                      setImagePreview(null);
                      setSelectedImage(null);
                    }}
                    className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 text-white"
                    title="Remove image"
                  >
                    <X size={10} />
                  </button>
                </div>
              )}
              <PersonaSelector
                selectedPersona={selectedPersona}
                onPersonaChange={(persona) => setSelectedPersona(persona.id)}
                customPrompt={customPrompt}
                onCustomPromptChange={setCustomPrompt}
                disabled={loading}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                disabled={loading || isUploadingImage}
                title="Upload image"
              >
                <ImageIcon size={16} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleUploadImage}
                accept="image/*"
                className="hidden"
              />
              <VoiceInputButton
                isListening={isListening}
                onStartListening={() => startListening(handleVoiceInput, true)}
                onStopListening={stopListening}
                disabled={loading}
              />
              <select
                className="p-1 pr-6 border border-gray-300 rounded-md text-gray-800 bg-white text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={models.length === 0}
                style={{ minWidth: "110px" }}
              >
                {models.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.displayName || m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-end justify-end mt-3">
            <div className="flex items-end space-x-4">
              <span className="text-sm text-gray-500">{input.length}/1000</span>
              <button
                className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                onClick={() => handleSubmit()}
                disabled={loading || (!input.trim() && !imagePreview)}
              >
                <span className="text-sm">
                  {loading ? "Sending..." : "Send"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
          {speechError && (
            <div className="text-red-500 text-sm mt-2">{speechError}</div>
          )}
        </div>
      </main>
    </div>
  );
}
