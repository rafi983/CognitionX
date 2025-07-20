// app/page.jsx or app/chat/page.jsx
"use client";

import { useState } from "react";
import { Sidebar } from "../components/Sidebar";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Sparkles,
  ArrowRight,
} from "lucide-react";

// A reusable component for chat messages
const Message = ({ author, time, content, isAI = false }) => (
  <div className="flex items-start space-x-3">
    <div
      className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-semibold ${isAI ? "bg-gradient-to-r from-purple-500 to-pink-500" : "bg-blue-500"}`}
    >
      {isAI ? "AI" : "H"}
    </div>
    <div className="flex-1">
      <div
        className={`rounded-2xl px-4 py-3 max-w-3xl ${isAI ? "bg-white border border-gray-200" : "bg-gray-100"}`}
      >
        {content}
      </div>
      <span className="text-xs text-gray-500 mt-1 block">{time}</span>
    </div>
  </div>
);

export default function ChatPage() {
  const [isDropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div className="flex h-screen mx-auto bg-white max-h-screen">
      <Sidebar />

      <main className="flex-1 flex flex-col bg-white">
        {/* Chat Header */}
        <header className="px-8 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <h1 className="text-lg font-semibold text-gray-800">
                Learning NLP vs LLM
              </h1>
            </div>
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!isDropdownOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
              >
                <MoreHorizontal className="w-5 h-5 text-gray-500 group-hover:text-gray-700" />
              </button>
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
                    <Edit className="w-4 h-4" />
                    <span>Rename conversation</span>
                  </button>
                  <hr className="my-1" />
                  <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2">
                    <Trash2 className="w-4 h-4" />
                    <span>Delete conversation</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Chat Content - Now with the full conversation */}
        <div className="flex-1 flex flex-col p-8 overflow-y-auto space-y-6">
          {/* Human Message 1 */}
          <Message
            author="H"
            time="2:34 PM"
            content={
              <p className="text-gray-800">
                What's the difference between machine learning and artificial
                intelligence?
              </p>
            }
          />

          {/* AI Response 1 */}
          <Message
            author="AI"
            time="2:35 PM"
            isAI={true}
            content={
              <>
                <p className="text-gray-800 mb-3">
                  Great question! Here's the key difference:
                </p>
                <p className="text-gray-800 mb-3">
                  <strong>Artificial Intelligence (AI)</strong> is the broader
                  concept of creating machines that can perform tasks that
                  typically require human intelligence. It's like the umbrella
                  term.
                </p>
                <p className="text-gray-800">
                  <strong>Machine Learning (ML)</strong> is a subset of AI that
                  focuses on algorithms that can learn and improve from data
                  without being explicitly programmed for every scenario.
                </p>
              </>
            }
          />

          {/* Human Message 2 */}
          <Message
            author="H"
            time="2:36 PM"
            content={
              <p className="text-gray-800">
                Can you give me some practical examples of each?
              </p>
            }
          />

          {/* AI Response 2 */}
          <Message
            author="AI"
            time="2:37 PM"
            isAI={true}
            content={
              <>
                <p className="text-gray-800 mb-3">
                  Absolutely! Here are some practical examples:
                </p>
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-800 mb-2">
                    🤖 AI Examples (broader applications):
                  </h4>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 ml-2">
                    <li>Siri, Alexa (voice assistants)</li>
                    <li>Chess-playing computers</li>
                    <li>Autonomous vehicles</li>
                    <li>Chatbots like me!</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">
                    📊 Machine Learning Examples (data-driven learning):
                  </h4>
                  <ul className="list-disc list-inside text-gray-700 space-y-1 ml-2">
                    <li>Netflix movie recommendations</li>
                    <li>Email spam detection</li>
                    <li>Credit card fraud detection</li>
                    <li>Image recognition in photos</li>
                  </ul>
                </div>
              </>
            }
          />
        </div>

        {/* Input Area */}
        <footer className="p-6 border-t border-gray-200">
          <div className="relative">
            <input
              type="text"
              placeholder="Ask me Anything"
              className="w-full p-4 pr-20 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
            </div>
          </div>
          <div className="flex items-center justify-end mt-3">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">0/1000</span>
              <button className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
                <span className="text-sm">Send</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
