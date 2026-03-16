import { useEffect, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

export default function ChatPage() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    socket.emit("joinServer", { name: "User_" + Math.floor(Math.random() * 1000) });

    socket.on("userList", (list) => setUsers(list));
    socket.on("privateMessage", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off("userList");
      socket.off("privateMessage");
    };
  }, []);

  const sendMessage = () => {
    if (!selectedUser || input.trim() === "") return;
    socket.emit("privateMessage", { to: selectedUser.id, message: input });
    setMessages((prev) => [...prev, { from: "You", message: input }]);
    setInput("");
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-1/4 bg-gray-800 p-4">
        <h2 className="text-xl font-bold mb-4">Online Users</h2>
        {users.map((u) => (
          <div
            key={u.id}
            onClick={() => setSelectedUser(u)}
            className={`p-2 mb-2 cursor-pointer rounded ${
              selectedUser?.id === u.id ? "bg-green-600" : "bg-gray-700"
            }`}
          >
            {u.name}
          </div>
        ))}
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col p-4">
        <h2 className="text-2xl mb-2">
          {selectedUser ? `Chatting with ${selectedUser.name}` : "Select a user"}
        </h2>

        <div className="flex-1 bg-gray-800 p-4 rounded overflow-y-auto mb-4">
          {messages.map((m, i) => (
            <div key={i} className="mb-2">
              <b>{m.from}: </b> {m.message}
            </div>
          ))}
        </div>

        {selectedUser && (
          <div className="flex">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message..."
              className="flex-grow p-2 rounded-l bg-gray-700 text-white outline-none"
            />
            <button
              onClick={sendMessage}
              className="bg-blue-600 px-4 py-2 rounded-r hover:bg-blue-700"
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
