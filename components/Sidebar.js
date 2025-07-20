import Image from "next/image";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

export function Sidebar() {
  const conversations = [
    { name: "Learning NLP vs LLM", href: "/chat" },
    { name: "Microservice Data Orchestration", href: "#" },
    { name: "Deep Cloning Alternatives", href: "#" },
    { name: "AI Database Diagram Generation", href: "#" },
  ];

  return (
    <aside className="w-64 bg-gray-900 text-white flex-col hidden md:flex">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-white rounded-full"></div>
          <div className="w-2 h-2 bg-white rounded-full"></div>
          <span className="font-semibold text-sm">CognitionX</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <div>
          <Link
            href="/"
            className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm">Create Chat</span>
          </Link>
        </div>

        <div className="pt-4">
          <span className="text-gray-500 text-xs uppercase font-semibold">
            Conversations
          </span>
          <div className="space-y-1 mt-3">
            {conversations.map((convo) => (
              <Link
                key={convo.name}
                href={convo.href}
                className="flex items-center space-x-3 px-2 py-2 rounded-lg transition-colors text-sm hover:bg-gray-800"
              >
                <span className="text-zinc-300">{convo.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-gray-700 mt-auto">
        <div className="text-center space-y-2">
          <span className="text-xs text-gray-400">Powered by</span>
          <div className="flex items-center justify-center space-x-2">
            <img src="/assets/logo.svg" alt="Logo" className="h-10" />
          </div>
          <p className="text-xs text-gray-500">© 2025 All rights reserved</p>
        </div>
      </div>
    </aside>
  );
}
