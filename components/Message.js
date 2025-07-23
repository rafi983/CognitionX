import { useState } from "react";
import Image from "next/image";
import { Copy, Edit3, Check, X as XIcon, RotateCcw } from "lucide-react";
import { TextToSpeechButton } from "@/components/SpeechControls";
import { useSpeech } from "@/hooks/useSpeech";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const Message = ({
  isAI,
  content,
  time,
  isStreaming,
  imageUrl,
  imageData,
  messageId,
  onRegenerate,
  onEdit,
  isLastUserMessage,
}) => {
  const { isSpeaking, speak, stopSpeaking } = useSpeech();
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditContent(content);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() !== content) {
      onEdit(messageId, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(content);
  };

  const handleRegenerate = () => {
    onRegenerate();
  };

  return (
    <div
      className="flex items-start space-x-3 group relative"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div
        className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-semibold ${
          isAI ? "bg-gradient-to-r from-purple-500 to-pink-500" : "bg-blue-500"
        }`}
      >
        {isAI ? "AI" : "U"}
      </div>
      <div className="flex-1">
        <div className="flex items-start space-x-2">
          <div
            className={`rounded-2xl px-4 py-3 max-w-3xl prose ${
              isAI
                ? "bg-white border border-gray-200 text-gray-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
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

            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={Math.max(2, editContent.split("\n").length)}
                  autoFocus
                />
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleSaveEdit}
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                  >
                    <Check size={14} />
                    <span>Save</span>
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center space-x-1 px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                  >
                    <XIcon size={14} />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <Markdown remarkPlugins={[remarkGfm]}>{content || ""}</Markdown>
                {isStreaming && (
                  <span className="inline-block w-2 h-4 ml-1 bg-gray-800 animate-pulse">
                    &#8203;
                  </span>
                )}
              </>
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

        {/* Action Menu */}
        {showActions && !isStreaming && !isEditing && (
          <div className="absolute right-0 top-0 flex items-center space-x-1 bg-white border border-gray-200 rounded-lg shadow-lg p-1 z-10">
            <button
              onClick={handleCopy}
              className={`p-2 rounded-md transition-colors ${
                copySuccess
                  ? "bg-green-100 text-green-600"
                  : "hover:bg-gray-100 text-gray-600"
              }`}
              title="Copy message"
            >
              <Copy size={14} />
            </button>

            {!isAI && (
              <button
                onClick={handleEdit}
                className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
                title="Edit message"
              >
                <Edit3 size={14} />
              </button>
            )}

            {isAI && isLastUserMessage && (
              <button
                onClick={handleRegenerate}
                className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
                title="Regenerate response"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        )}

        {time && (
          <span className="text-xs text-gray-500 mt-1 block">{time}</span>
        )}
      </div>
    </div>
  );
};

export const LoadingSkeleton = () => (
  <div className="flex items-start space-x-3 animate-pulse">
    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-300 to-pink-300 flex-shrink-0" />
    <div className="flex-1">
      <div className="rounded-2xl px-4 py-3 max-w-3xl bg-gray-100 h-6 mb-2" />
      <div className="rounded-2xl px-4 py-3 max-w-xl bg-gray-100 h-4" />
    </div>
  </div>
);
