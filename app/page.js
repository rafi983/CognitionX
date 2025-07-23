"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Zap, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSpeech } from "@/hooks/useSpeech";
import { VoiceInputButton } from "@/components/SpeechControls";

const SUGGESTIONS = [
  "Summarize this article for me.",
  "Help me write a professional email.",
  "Generate a list of creative marketing ideas.",
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
        console.error("Error loading models:", error);
        setError("Failed to load models. Please refresh the page.");
      });
  }, []);

  const handleSend = async (prompt) => {
    if (!prompt || !selectedModel) return;
    setLoading(true);
    setError("");
    try {
      console.log("Sending request with model:", selectedModel);
      const res = await fetch("/api/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: prompt.slice(0, 40),
          message: prompt,
          model: selectedModel,
        }),
      });

      if (!res.ok) {
        const errorData = await res.text();
        console.error(
          `Failed to create conversation: ${res.status}`,
          errorData,
        );
        throw new Error(`Failed to create conversation: ${res.status}`);
      }

      const data = await res.json();
      if (!data || !data.conversation || !data.conversation._id) {
        console.error("Invalid response data:", data);
        throw new Error("Invalid response from server");
      }

      router.push(`/conversation/${data.conversation._id}`);
    } catch (e) {
      console.error("Error in handleSend:", e);
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
            I'm a professional looking for an AI assistant that helps with their
            workflows, automates routine tasks, and gives valuable insights
            based on real-time data.
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
              placeholder="Ask me Anything"
              className="w-full p-4 pr-44 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
              disabled={loading}
              maxLength={1000}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
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
                onClick={() => handleSend(input)}
                disabled={loading || !input.trim()}
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
