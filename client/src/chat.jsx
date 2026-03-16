// client/src/Chat.jsx
import React, { useEffect, useState, useRef } from "react";
import socket from "./socket";
import { getAuth } from "firebase/auth";

export default function Chat() {
  const auth = getAuth();
  // stable display name for this client (used as "me")
  const me = auth.currentUser
    ? (auth.currentUser.displayName || auth.currentUser.phoneNumber || auth.currentUser.email)
    : "Anonymous";

  const [onlineUsers, setOnlineUsers] = useState([]); // array of usernames
  const [selectedUser, setSelectedUser] = useState(null); // username string
  const [messages, setMessages] = useState({}); // { username: [{from, to, text, ts}] }
  const [text, setText] = useState("");
  const [typing, setTyping] = useState({});
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // join once with the stable name
    const nameToJoin = me || `User-${Math.floor(Math.random() * 1000)}`;
    socket.emit("join", nameToJoin);

    // receive online users list
    socket.on("onlineUsers", (list) => {
      // show others (exclude self)
      setOnlineUsers(list.filter(u => u !== nameToJoin));
    });

    // receive a private message forwarded by server
    socket.on("privateMessage", (msg) => {
      // msg expected: { from, to, text, ts }
      // Determine the "other" participant for this message thread
      const other = msg.from === nameToJoin ? msg.to : msg.from;

      // Add message to messages store under the "other" user
      setMessages(prev => {
        const copy = { ...prev };
        copy[other] = copy[other] ? [...copy[other], msg] : [msg];
        return copy;
      });

      // If user isn't currently viewing any chat, or not viewing this sender,
      // open the chat with the sender so incoming messages are visible.
      // But don't forcibly switch if the user is actively in a different chat.
      setSelectedUser(prev => (prev === null ? other : prev));
    });

    // typing indicator (optional)
    socket.on("typing", ({ from, to, isTyping }) => {
      setTyping(prev => ({ ...prev, [from]: isTyping }));
    });

    return () => {
      socket.off("onlineUsers");
      socket.off("privateMessage");
      socket.off("typing");
    };
  }, [me]);

  useEffect(() => {
    // scroll chat to bottom when messages or selectedUser change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, selectedUser]);

  const openChat = (username) => {
    setSelectedUser(username);
    // ensure a message array exists for the opened chat
    setMessages(prev => (prev[username] ? prev : { ...prev, [username]: [] }));
  };

  const sendMessage = () => {
    if (!selectedUser || !text.trim()) return;

    const payload = {
      from: me,
      to: selectedUser,
      text: text.trim(),
      ts: Date.now(),
    };

    // show locally (local echo)
    setMessages(prev => {
      const copy = { ...prev };
      copy[selectedUser] = copy[selectedUser] ? [...copy[selectedUser], payload] : [payload];
      return copy;
    });

    setText("");

    // send to server to forward to the target user
    socket.emit("privateMessage", payload);
  };

  const onKey = (e) => {
    if (e.key === "Enter") {
      sendMessage();
    } else {
      // optional typing indicator (fire-and-forget)
      if (selectedUser) {
        socket.emit("typing", { from: me, to: selectedUser, isTyping: e.key !== "Enter" && e.target.value.length > 0 });
      }
    }
  };

  // Render
  return (
   <div className="h-screen flex bg-gradient-to-r from-[var(--color-sky-200)] to-[var(--color-purple-300)]">

      {/* Left: online users */}
      <div className="w-80 border-r border-gray-200 bg-white/80">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">Online</h2>
          <p className="text-sm text-gray-500">You: <span className="font-medium">{me}</span></p>
        </div>

        <div className="p-3 overflow-auto" style={{ height: "calc(100vh - 96px)" }}>
          {onlineUsers.length === 0 && (
            <p className="text-sm text-gray-500">No other users online</p>
          )}
          {onlineUsers.map((u) => (
            <button
              key={u}
              onClick={() => openChat(u)}
              className={`w-full text-left p-3 rounded hover:bg-gray-50 flex justify-between items-center ${selectedUser === u ? "bg-blue-50" : ""}`}
            >
              <div>
                <div className="font-medium">{u}</div>
                <div className="text-xs text-gray-500">Tap to chat</div>
              </div>
              <div className="text-xs text-green-500">●</div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: chat window */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b bg-white flex items-center justify-between">
          <div>
            {selectedUser ? (
              <div>
                <div className="font-semibold">{selectedUser}</div>
                <div className="text-xs text-gray-500">{typing[selectedUser] ? "typing..." : ""}</div>
              </div>
            ) : (
              <div className="text-gray-600">Select a user to start chat</div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 bg-gray-50">
          {selectedUser ? (
            (messages[selectedUser] || []).map((m, idx) => {
              const mine = m.from === me;
              return (
                <div key={idx} className={`mb-3 flex ${mine ? "justify-end" : "justify-start"}`}>
  <div
    className={`px-4 py-2 rounded-lg shadow-sm max-w-[65%] ${
      mine
        ? "bg-blue-600 text-white rounded-br-none"
        : "bg-gray-200 text-gray-900 rounded-bl-none"
    }`}
  >
    <div className="text-sm break-words">{m.text}</div>

    <div
      className={`text-[10px] mt-1 text-right ${
        mine ? "text-blue-200" : "text-gray-500"
      }`}
    >
      {new Date(m.ts).toLocaleTimeString()}
    </div>
  </div>
</div>
              );
            })
          ) : (
            <div className="text-center text-gray-400 mt-20">Open a chat by selecting a user on the left.</div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t">
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKey}
              placeholder={selectedUser ? `Message ${selectedUser}` : "Select a user to message"}
              disabled={!selectedUser}
              className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring"
            />
            <button onClick={sendMessage} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50" disabled={!selectedUser || text.trim() === ""}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}
