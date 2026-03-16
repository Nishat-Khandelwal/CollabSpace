import React from "react";
import { useNavigate } from "react-router-dom";

import whiteboardImg from "./assets/collaborativeWhiteboard.png";
import chatImg from "./assets/chatRoom.png";

export default function Dashboard() {

  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-blue-200 to-purple-300 p-8">

      {/* Top Bar */}
      <div className="w-full max-w-5xl flex justify-between items-center bg-white/70 backdrop-blur rounded-xl shadow-md px-6 py-3 mb-10">
        <h1 className="text-2xl font-semibold text-gray-800">
          CollabSpace
        </h1>

        <button
          onClick={logout}
          className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg"
        >
          Logout
        </button>
      </div>

      {/* Subtitle */}
      <p className="text-lg text-gray-700 mb-10">
        Collaborate with your team in real-time
      </p>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">

        {/* Whiteboard Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:scale-105 transition duration-300">

          <img
            src={whiteboardImg}
            alt="Whiteboard"
            className="w-full h-52 object-cover"
          />

          <div className="p-6 text-center">

            <h3 className="text-lg font-semibold mb-2">
              Collaborative Whiteboard
            </h3>

            <p className="text-gray-600 mb-4">
              Draw and brainstorm together in real-time.
            </p>

            <button
              onClick={() => navigate("/whiteboard")}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700"
            >
              Open Whiteboard
            </button>

          </div>
        </div>

        {/* Chat Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:scale-105 transition duration-300">

          <img
            src={chatImg}
            alt="Chat"
            className="w-full h-52 object-cover"
          />

          <div className="p-6 text-center">

            <h3 className="text-lg font-semibold mb-2">
              Chat Room
            </h3>

            <p className="text-gray-600 mb-4">
              Communicate instantly with your team.
            </p>

            <button
              onClick={() => navigate("/chat")}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700"
            >
              Open Chat
            </button>

          </div>
        </div>

      </div>

    </div>
  );
}