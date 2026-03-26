import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ArrowRight, Clock, Box, Trash2 } from "lucide-react";


export default function Dashboard() {
  const navigate = useNavigate();
  const username = localStorage.getItem("collab_username");
  const [recentBoards, setRecentBoards] = useState([]);

  useEffect(() => {
    if (!username) {
      navigate("/");
      return;
    }
    
    
    const saved = localStorage.getItem("recent_boards");
    if (saved) {
      try {
        setRecentBoards(JSON.parse(saved).sort((a,b) => b.updatedAt - a.updatedAt));
      } catch {
        
      }
    }
  }, [username, navigate]);

  const logout = () => {
    localStorage.removeItem("collab_token");
    localStorage.removeItem("collab_username");
    navigate("/");
  };

  const createBoard = () => {
    const roomId = crypto.randomUUID();
    
    
    const newBoard = { id: roomId, name: "Untitled Diagram", updatedAt: Date.now() };
    const updated = [newBoard, ...recentBoards.filter(b => b.id !== roomId)];
    localStorage.setItem("recent_boards", JSON.stringify(updated));
    
    navigate(`/whiteboard?room=${roomId}`);
  };

  const openBoard = (roomId) => {
    
    const updated = recentBoards.map(b => b.id === roomId ? { ...b, updatedAt: Date.now() } : b).sort((a,b) => b.updatedAt - a.updatedAt);
    localStorage.setItem("recent_boards", JSON.stringify(updated));
    navigate(`/whiteboard?room=${roomId}`);
  };

  const deleteBoard = (e, roomId) => {
    e.stopPropagation();
    const updated = recentBoards.filter(b => b.id !== roomId);
    setRecentBoards(updated);
    localStorage.setItem("recent_boards", JSON.stringify(updated));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-gray-900 font-sans selection:bg-blue-200 selection:text-blue-900 relative overflow-hidden">

      {/* Top Navbar */}
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-md shadow-blue-500/30">
              <svg className="w-4 h-4 text-white transform rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight text-gray-900">CollabSpace</span>
            <div className="h-6 w-[2px] bg-gray-200 mx-2 rounded-full" />
            <span className="text-gray-500 text-sm font-semibold">{username}</span>
          </div>
          
          <button
            onClick={logout}
            className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors px-4 py-2 rounded-lg hover:bg-gray-100"
          >
            Sign Out
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-[1200px] mx-auto w-full px-6 py-20 relative z-10">
        
        <div className="flex items-center justify-between mb-16">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-2">
              Welcome back, <span className="text-blue-600">{username}</span>
            </h1>
            <p className="text-gray-500 text-lg font-medium">Create or resume your collaborative projects here.</p>
          </div>
          <button
            onClick={createBoard}
            className="bg-blue-600 text-white hover:bg-blue-700 font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-200 shadow-md shadow-blue-500/25 hover:shadow-lg hover:-translate-y-0.5"
          >
            <Plus size={20} />
            <span>New Board</span>
          </button>
        </div>

        {recentBoards.length === 0 ? (
          <div className="border-2 border-gray-200 border-dashed rounded-2xl p-20 flex flex-col items-center justify-center text-center bg-white shadow-sm">
            <div className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center mb-6">
              <Box size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">No projects found</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-8 text-base font-medium">
              Get started by creating a new collaborative whiteboard and sharing the link with your team instantly.
            </p>
            <button
              onClick={createBoard}
              className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold px-6 py-3 rounded-xl transition-all duration-200 text-sm shadow-sm hover:shadow-md"
            >
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentBoards.map(board => (
              <div 
                key={board.id} 
                className="group bg-white border border-gray-200 hover:border-blue-400 rounded-2xl p-6 cursor-pointer transition-all duration-300 flex flex-col h-[200px] relative shadow-sm hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1"
                onClick={() => openBoard(board.id)}
              >
                <div className="flex-1 z-10">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors flex items-center justify-between">
                    {board.name}
                    <div className="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-blue-600 flex items-center justify-center transition-all">
                      <ArrowRight size={16} className="text-gray-400 group-hover:text-white transition-colors" />
                    </div>
                  </h3>
                  <div className="flex items-center gap-2 text-gray-500 text-sm mt-4 font-semibold">
                    <Clock size={14} />
                    <span>Edited {new Date(board.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100 z-10 flex items-center justify-between gap-4">
                  <p className="text-xs text-gray-400 font-mono font-medium truncate">{board.id}</p>
                  <button 
                    onClick={(e) => deleteBoard(e, board.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50 focus:outline-none"
                    title="Delete Project"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}