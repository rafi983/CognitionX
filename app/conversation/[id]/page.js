"use client";

import { useEffect, useRef, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ArrowRight, ImageIcon, X } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { useSpeech } from "@/hooks/useSpeech";
import {
  VoiceInputButton,
  TextToSpeechButton,
} from "@/components/SpeechControls";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

const Message = ({ isAI, content, time, isStreaming, imageUrl, imageData }) => {
  const { isSpeaking, speak, stopSpeaking } = useSpeech();

  return (
    <div className="flex items-start space-x-3">
      <div
        className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-semibold ${isAI ? "bg-gradient-to-r from-purple-500 to-pink-500" : "bg-blue-500"}`}
      >
        {isAI ? "AI" : "U"}
      </div>
      <div className="flex-1">
        <div className="flex items-start space-x-2">
          <div
            className={`rounded-2xl px-4 py-3 max-w-3xl prose ${isAI ? "bg-white border border-gray-200 text-gray-800" : "bg-gray-100 text-gray-800"}`}
          >
            {/* Use imageData (base64) if available, otherwise fall back to imageUrl */}
            {(imageData || imageUrl) && (
              <div className="mb-3">
                {imageData ? (
                  <img
                    src={imageData}
                    alt="Uploaded image"
                    className="rounded-lg object-contain max-h-[300px] max-w-full"
                  />
                ) : imageUrl &&
                  (imageUrl.startsWith("/") || imageUrl.startsWith("http")) ? (
                  <Image
                    src={imageUrl}
                    alt="Uploaded image"
                    width={300}
                    height={300}
                    className="rounded-lg object-contain max-h-[300px]"
                    style={{ objectFit: "contain" }}
                  />
                ) : imageUrl ? (
                  <img
                    src={`data:image/jpeg;base64,${imageUrl}`}
                    alt="Uploaded image"
                    className="rounded-lg object-contain max-h-[300px] max-w-full"
                  />
                ) : null}
              </div>
            )}
            <Markdown remarkPlugins={[remarkGfm]}>{content || ""}</Markdown>
            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-gray-800 animate-pulse">
                &#8203;
              </span>
            )}
          </div>
          {isAI && content && !isStreaming && (
            <TextToSpeechButton
              isSpeaking={isSpeaking}
              onSpeak={speak}
              onStopSpeaking={stopSpeaking}
              text={content}
            />
          )}
        </div>
        {time && (
          <span className="text-xs text-gray-500 mt-1 block">{time}</span>
        )}
      </div>
    </div>
  );
};

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
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  const router = useRouter();
  const bottomRef = useRef(null);

  // Add speech functionality
  const { isListening, speechError, startListening, stopListening } =
    useSpeech();

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
    if (!input.trim() && !imagePreview) return;
    setLoading(true);
    setError("");
    const optimisticUserMsg = {
      _id: Date.now().toString(),
      role: "user",
      content: input,
      imageData: imagePreview,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUserMsg]);
    setInput("");

    const sentImageUrl = imagePreview;
    if (imagePreview) {
      setSelectedImage(null);
      setImagePreview(null);
    }

    let assistantMsg = null;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          message: optimisticUserMsg.content,
          imageUrl: sentImageUrl,
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
      setMessages((prev) => [...prev.slice(0, -1), data.user, assistantMsg]);
    } catch (e) {
      setError("Failed to send message. Try again.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleSendStreaming = async (messageText = null) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() && !selectedImage) return;
    setLoading(true);
    setIsStreaming(true);
    setError("");
    setStreamedContent("");

    const optimisticUserMsg = {
      _id: Date.now().toString(),
      role: "user",
      content: textToSend,
      imageData: imagePreview,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUserMsg]);

    const placeholderAssistantMsg = {
      _id: `streaming-${Date.now()}`,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      isStreaming: true,
    };
    setMessages((prev) => [...prev, placeholderAssistantMsg]);
    setInput("");

    const imageData = selectedImage ? selectedImage.base64Data : null;

    if (imagePreview) {
      setSelectedImage(null);
      setImagePreview(null);
    }

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          message: textToSend,
          imageUrl: imagePreview,
          imageData: imageData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get streaming response");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedContent = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.substring(5).trim();

            if (data === "[DONE]") {
              setIsStreaming(false);
              continue;
            }

            try {
              const parsedData = JSON.parse(data);
              if (parsedData.text) {
                accumulatedContent += parsedData.text;
                setStreamedContent(accumulatedContent);

                setMessages((prev) =>
                  prev.map((msg) =>
                    msg._id === placeholderAssistantMsg._id
                      ? { ...msg, content: accumulatedContent }
                      : msg,
                  ),
                );
              }

              if (parsedData.error) {
                setError(`Streaming error: ${parsedData.error}`);
                break;
              }
            } catch (e) {
              console.error(
                "Error parsing streaming data:",
                e,
                "Raw data:",
                data,
              );
            }
          }
        }
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === placeholderAssistantMsg._id
            ? { ...msg, isStreaming: false }
            : msg,
        ),
      );
    } catch (e) {
      setError(`Streaming error: ${e.message}`);
      setMessages((prev) =>
        prev.filter((msg) => msg._id !== placeholderAssistantMsg._id),
      );
    } finally {
      setLoading(false);
      setIsStreaming(false);
    }
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
      // Use the base64Data for image preview instead of the URL
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

  const handleVoiceInput = (transcript, autoSend = false) => {
    setInput(transcript);
    if (autoSend && transcript.trim()) {
      // Pass the transcript directly to avoid state update delays
      handleSendStreaming(transcript);
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
        <header className="px-8 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <h1 className="text-lg font-semibold text-gray-800 truncate max-w-xs">
              {conversation?.title || "Conversation"}
            </h1>
          </div>
        </header>
        <div className="flex-1 flex flex-col p-8 overflow-y-auto space-y-6">
          {messages.map((msg) => (
            <Message
              key={msg._id}
              isAI={msg.role === "assistant"}
              content={msg.content}
              imageUrl={msg.imageUrl}
              imageData={msg.imageData}
              isStreaming={msg.isStreaming}
              time={new Date(msg.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            />
          ))}
          {loading && !isStreaming && <LoadingSkeleton />}
          <div ref={bottomRef} />
        </div>
        <footer className="p-6 border-t border-gray-200">
          <div className="relative">
            <input
              type="text"
              placeholder="Ask me Anything"
              className="w-full p-4 pr-44 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendStreaming()}
              disabled={loading}
              maxLength={1000}
            />
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
              <VoiceInputButton
                isListening={isListening}
                onStartListening={() => startListening(handleVoiceInput, true)}
                onStopListening={stopListening}
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
                onClick={handleSendStreaming}
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
        </footer>
      </main>
    </div>
  );
}
