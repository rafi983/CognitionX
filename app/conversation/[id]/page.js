"use client";

import { useEffect, useRef, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ArrowRight } from "lucide-react";
import { useRouter, useParams } from "next/navigation";

const Message = ({ isAI, content, time }) => (
  <div className="flex items-start space-x-3">
    <div
      className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-semibold ${isAI ? "bg-gradient-to-r from-purple-500 to-pink-500" : "bg-blue-500"}`}
    >
      {isAI ? "AI" : "U"}
    </div>
    <div className="flex-1">
      <div
        className={`rounded-2xl px-4 py-3 max-w-3xl ${isAI ? "bg-white border border-gray-200 text-gray-800" : "bg-gray-100 text-gray-800"}`}
      >
        {content}
      </div>
      {time && <span className="text-xs text-gray-500 mt-1 block">{time}</span>}
    </div>
  </div>
);

const LoadingSkeleton = () => (
  <div className="flex items-start space-x-3 animate-pulse">
    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-300 to-pink-300 flex-shrink-0" />
    <div className="flex-1">
      <div className="rounded-2xl px-4 py-3 max-w-3xl bg-gray-100 h-6 mb-2" />
      <div className="rounded-2xl px-4 py-3 max-w-xl bg-gray-100 h-4" />
    </div>
  </div>
);

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.id;
  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [notFound, setNotFound] = useState(false);
  const router = useRouter();
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!conversationId) return;
    fetch(`/api/conversation/${conversationId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error || !data.conversation) {
          setNotFound(true);
          setConversation(null);
          setMessages([]);
        } else {
          setConversation(data.conversation);
          setMessages(data.messages || []);
          setSelectedModel(data.conversation?.model || "");
          setNotFound(false);
        }
      });
    fetch("/api/models")
      .then((res) => res.json())
      .then((data) => setModels(data.models || []));
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleModelChange = async (e) => {
    const newModel = e.target.value;
    setSelectedModel(newModel);
    await fetch(`/api/conversation/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: newModel }),
    });
    setConversation((prev) => ({ ...prev, model: newModel }));
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError("");
    // Optimistically add the user message to the UI
    const optimisticUserMsg = {
      _id: Date.now().toString(),
      role: "user",
      content: input,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUserMsg]);
    setInput("");
    let assistantMsg = null;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          message: optimisticUserMsg.content,
        }),
      });
      let data;
      try {
        data = await res.json();
      } catch (e) {
        setError("Invalid response from server.");
        setLoading(false);
        return;
      }
      if (!res.ok || !data.assistant) {
        setError(data?.error || "No response from Gemini.");
        setLoading(false);
        return;
      }
      assistantMsg = data.assistant.content?.trim()
        ? data.assistant
        : { ...data.assistant, content: "[No response from Gemini]" };
      // Replace the optimistic user message with the real one from DB, then add assistant
      setMessages((prev) => [...prev.slice(0, -1), data.user, assistantMsg]);
    } catch (e) {
      setError("Failed to send message. Try again.");
      // Remove the optimistic user message if error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  if (notFound) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Conversation not found
          </h2>
          <p className="text-gray-600 mb-6">
            This conversation may have been deleted or never existed.
          </p>
          <a href="/" className="text-blue-600 hover:underline">
            Go back to home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen mx-auto bg-white max-h-screen">
      <Sidebar />
      <main className="flex-1 flex flex-col bg-white">
        {/* Chat Header */}
        <header className="px-8 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <h1 className="text-lg font-semibold text-gray-800 truncate max-w-xs">
              {conversation?.title || "Conversation"}
            </h1>
          </div>
        </header>
        {/* Chat Content */}
        <div className="flex-1 flex flex-col p-8 overflow-y-auto space-y-6">
          {messages.map((msg) => (
            <Message
              key={msg._id}
              isAI={msg.role === "assistant"}
              content={msg.content}
              time={new Date(msg.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            />
          ))}
          {loading && <LoadingSkeleton />}
          <div ref={bottomRef} />
        </div>
        {/* Input Area */}
        <footer className="p-6 border-t border-gray-200">
          <div className="relative">
            <input
              type="text"
              placeholder="Ask me Anything"
              className="w-full p-4 pr-36 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={loading}
              maxLength={1000}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
              <select
                className="p-1 pr-6 border border-gray-300 rounded-md text-gray-800 bg-white text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                value={selectedModel}
                onChange={handleModelChange}
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
          <div className="flex items-center justify-end mt-3">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">{input.length}/1000</span>
              <button
                className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                onClick={handleSend}
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
        </footer>
      </main>
    </div>
  );
}
