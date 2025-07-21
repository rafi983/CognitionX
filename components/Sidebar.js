import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MessageCircle, Edit, Trash2 } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

export function Sidebar() {
  const [conversations, setConversations] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/conversation")
      .then((res) => res.json())
      .then(setConversations);
  }, []);

  const handleEdit = (id, title) => {
    setEditingId(id);
    setEditTitle(title);
  };

  const handleEditSave = async (id) => {
    await fetch(`/api/conversation/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle }),
    });
    setEditingId(null);
    setEditTitle("");
    // Refresh conversations
    fetch("/api/conversation")
      .then((res) => res.json())
      .then(setConversations);
  };

  const handleDelete = async (id) => {
    await fetch(`/api/conversation/${id}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c._id !== id));
    // If user is viewing the deleted conversation, redirect to home
    if (pathname === `/conversation/${id}`) {
      router.push("/");
    }
  };

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
              <div key={convo._id} className="flex items-center group">
                {editingId === convo._id ? (
                  <>
                    <input
                      className="bg-gray-800 text-white rounded px-2 py-1 text-sm w-32"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => handleEditSave(convo._id)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleEditSave(convo._id)
                      }
                      autoFocus
                    />
                  </>
                ) : (
                  <Link
                    href={`/conversation/${convo._id}`}
                    className="flex-1 flex items-center space-x-3 px-2 py-2 rounded-lg transition-colors text-sm hover:bg-gray-800"
                  >
                    <span className="text-zinc-300 truncate max-w-[120px]">
                      {convo.title}
                    </span>
                  </Link>
                )}
                <button
                  className="ml-1 p-1 hover:bg-gray-700 rounded hidden group-hover:block"
                  onClick={() => handleEdit(convo._id, convo.title)}
                  title="Edit"
                >
                  <Edit className="w-4 h-4 text-gray-400" />
                </button>
                <button
                  className="ml-1 p-1 hover:bg-gray-700 rounded hidden group-hover:block"
                  onClick={() => handleDelete(convo._id)}
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4 text-gray-400" />
                </button>
              </div>
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
