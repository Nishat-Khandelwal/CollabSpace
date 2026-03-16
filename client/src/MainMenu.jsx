import { useNavigate } from "react-router-dom";
import { Paintbrush, MessageSquare, LogIn } from "lucide-react";

export default function MainMenu() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white">
      <div className="bg-white bg-opacity-20 backdrop-blur-lg p-10 rounded-3xl shadow-2xl text-center max-w-lg w-full">
        <h1 className="text-4xl font-extrabold mb-6">
          Welcome to <span className="text-yellow-300">Whiteboard App 🎨</span>
        </h1>

        <p className="text-lg text-gray-200 mb-8">
          Collaborate, draw, and chat in real-time with your friends and team!
        </p>

        <div className="flex flex-col gap-4">
          <button
            onClick={() => navigate("/whiteboard")}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl shadow-lg transition-all duration-200"
          >
            <Paintbrush size={20} />
            Go to Whiteboard
          </button>

          <button
            onClick={() => navigate("/chat")}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl shadow-lg transition-all duration-200"
          >
            <MessageSquare size={20} />
            Go to Chat
          </button>

          <button
            onClick={() => navigate("/auth")}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-xl shadow-lg transition-all duration-200"
          >
            <LogIn size={20} />
            Login / Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}
