require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const { GoogleGenAI } = require("@google/genai");

const app = express();
app.use(cors());
app.use(express.json());



const usersDB = {}; // storing usernames
const JWT_SECRET = "collabSpaceSecretKey123";

// Remove GOOGLE_API_KEY to prevent SDK from overriding GEMINI_API_KEY if exists in environment
delete process.env.GOOGLE_API_KEY;

// Initialize Gemini Client
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;



// ─── Share via Email Endpoint ───
app.post("/api/share-email", async (req, res) => {
  const { email, link, senderName } = req.body;

  if (!email || !link) {
    return res.status(400).json({ message: "Email and link are required." });
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email address." });
  }

  const sender = senderName || "A collaborator";

  try {
    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_TEMPLATE_ID,
        user_id: process.env.EMAILJS_PUBLIC_KEY,
        accessToken: process.env.EMAILJS_PRIVATE_KEY,
        template_params: {
          from_name: sender,
          join_link: link,
          email: email,
          to_email: email
        }
      })
    });

    if (!response.ok) {
       const text = await response.text();
       throw new Error(text || "Failed to send via EmailJS");
    }

    res.json({ message: "Invitation email sent successfully!" });
  } catch (err) {
    console.error("Email send error:", err);
    res.status(500).json({ message: "Failed to send email. " + (err.message || "") });
  }
});

// Simple Guest Login Route
app.post("/login", (req, res) => {
  let { username } = req.body;
  if (!username || !username.trim()) {
    return res.status(400).json({ message: "Username required" });
  }

  username = username.trim();

  // If user doesn't exist in our memory DB, just add them
  if (!usersDB[username]) {
    usersDB[username] = { username, created: Date.now() };
    console.log("New guest user created:", username);
  }

  // Issue token
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "24h" });

  res.json({ token, username });
});

const path = require("path");
const fs = require("fs");

const distPath = path.join(__dirname, "../client/dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // Catch-all route to serve React app for client-side routing
  app.use((req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Track socket to room & user mapping
const socketInfo = {}; // socket.id -> { room, username, status: 'active' | 'idle' }

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("joinRoom", ({ roomId, username }) => {
    socket.join(roomId);
    socketInfo[socket.id] = { room: roomId, username, status: "active" };
    console.log(`${username} joined room ${roomId}`);

    // Let others in the room know I joined to sync presence
    socket.to(roomId).emit("userJoined", { username, id: socket.id });

    // Send the current list of users in the room
    const roomUsers = Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(sid => {
      const info = socketInfo[sid];
      return { id: sid, username: info?.username, status: info?.status };
    });
    // Use an io.to(roomId).emit pattern to update everyone's user list when someone joins
    io.to(roomId).emit("roomUsersUpdate", roomUsers);
  });

  socket.on("cursorMove", ({ x, y }) => {
    const info = socketInfo[socket.id];
    if (info) {
      // Re-activate if they moved cursor
      if (info.status === "idle") {
         info.status = "active";
         io.to(info.room).emit("userStatusChange", { id: socket.id, status: "active" });
      }
      socket.to(info.room).emit("cursorMove", { id: socket.id, username: info.username, x, y });
    }
  });

  socket.on("statusUpdate", (status) => {
    const info = socketInfo[socket.id];
    if (info) {
      info.status = status; // active or idle
      io.to(info.room).emit("userStatusChange", { id: socket.id, status });
    }
  });

  socket.on("chatMessage", (msg) => {
    const info = socketInfo[socket.id];
    if (info) {
      // broadcast to everyone EXCEPT sender
      socket.to(info.room).emit("chatMessage", msg);
    }
  });

  socket.on("beginPath", (data) => {
    const info = socketInfo[socket.id];
    if (info) socket.to(info.room).emit("beginPath", data);
  });

  socket.on("draw", (data) => {
    const info = socketInfo[socket.id];
    if (info) socket.to(info.room).emit("draw", data);
  });

  socket.on("drawShape", (data) => {
    const info = socketInfo[socket.id];
    if (info) socket.to(info.room).emit("drawShape", data);
  });

  socket.on("drawText", (data) => {
    const info = socketInfo[socket.id];
    if (info) socket.to(info.room).emit("drawText", data);
  });

  socket.on("clearBoard", () => {
    const info = socketInfo[socket.id];
    if (info) socket.to(info.room).emit("clearBoard");
  });

  socket.on("requestSync", () => {
    const info = socketInfo[socket.id];
    if (info) {
      const allSids = Array.from(io.sockets.adapter.rooms.get(info.room) || []);
      const otherSid = allSids.find(sid => sid !== socket.id);
      if (otherSid) {
        io.to(otherSid).emit("provideSync", socket.id);
      }
    }
  });

  socket.on("deliverSync", ({ targetId, history }) => {
    io.to(targetId).emit("initBoard", history);
  });

  socket.on("askAi", async ({ prompt, history }) => {
    const info = socketInfo[socket.id];
    if (!info) return;

    if (!ai) {
      socket.emit("aiResponse", { message: "AI is not configured on the server. Please add GEMINI_API_KEY to server/.env.", actions: [] });
      return;
    }

    try {
      const systemInstruction = `You are an intelligent AI assistant in a collaborative whiteboard app. Your goal is to interpret the user's prompt and modify their whiteboard accordingly.
The whiteboard supports freehand drawings (type="path"), shapes (type="shape", shape="rectangle"|"circle"|"triangle"|"star"), and text boxes (type="text").
Each item on the whiteboard has a unique 'id', 'color', 'size', and positioning ('w', 'h', 'startPos' etc). Check 'history' given below.

Here is the current whiteboard state (JSON array):
${JSON.stringify(history)}

The user will provide a prompt (e.g., "draw a red circle", "delete the star", "make the blue square big"). Determine their intent. If they are asking a regular question, answer it in 'message' and return empty 'actions'.
If they want to change the whiteboard, return a structured list of commands in 'actions'. 
You MUST return STRICTLY a SINGLE JSON object, NO markdown, NO text outside the JSON. Schema:
{
  "message": "<Conversational response summarizing what you did or answering a question>",
  "actions": [
    { "action": "delete", "id": "<id_of_existing_item>" },
    { "action": "update", "id": "<id_of_existing_item>", "changes": { "color": "red" } },
    { "action": "drawShape", "item": { "type": "shape", "shape": "circle", "startPos": { "x": 500, "y": 300 }, "w": 200, "h": 200, "color": "red", "size": 3, "tool": "brush", "id": "gen_uuid_1" } },
    { "action": "drawText", "item": { "type": "text", "text": "Hello User!", "x": 500, "y": 300, "maxWidth": 200, "lineHeight": 24, "color": "black", "fontSize": 20, "id": "gen_uuid_2" } },
    { "action": "clear" }
  ]
}

When drawing new things, invent realistic visual parameters around the center (x: 500, y: 300). Strongly invent unique random UUIDs for 'id'.
When updating or deleting, FIND the 'id' of the element in the history matching the requested color or shape.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
        }
      });

      const responseText = response.text;
      let parsed = { message: "I didn't quite catch that. Try asking differently.", actions: [] };
      try {
         parsed = JSON.parse(responseText);
      } catch (err) {
         console.warn("Invalid JSON from AI:", responseText);
      }

      socket.emit("aiResponse", parsed);

    } catch (err) {
      console.error("AI Generation error:", err);
      socket.emit("aiResponse", { message: "AI Request Failed: " + (err.message || err.toString()), actions: [] });
    }
  });

  socket.on("recognizeShape", async (data) => {
    const info = socketInfo[socket.id];
    if (!info || !ai) return;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            inlineData: {
              data: data.image,
              mimeType: "image/png",
            },
          },
          "Analyze the drawn image. It's a single continuous stroke. Is it closest to a 'circle', 'rectangle', 'triangle', or 'star'? Respond with STRICTLY a valid JSON object like {\"shape\": \"circle\"}. If you are extremely uncertain or it doesn't look like any of these, respond with {\"shape\": \"none\"}."
        ],
        config: {
          responseMimeType: "application/json",
        }
      });

      const text = response.text;
      let parsed = { shape: "none" };
      try {
        parsed = JSON.parse(text);
      } catch (err) {
        console.warn("Invalid JSON from AI shape recognition:", text);
      }

      if (parsed.shape && parsed.shape !== "none") {
        socket.emit("aiShapeCorrection", {
          originalId: data.id,
          shape: parsed.shape,
          startPos: data.startPos,
          w: data.w,
          h: data.h,
          color: data.color,
          size: data.size
        });
      }
    } catch (err) {
      console.error("AI Shape Recognition error:", err);
    }
  });

  socket.on("disconnect", () => {
    const info = socketInfo[socket.id];
    if (info) {
      console.log(`${info.username} disconnected from ${info.room}`);
      delete socketInfo[socket.id];
      // Update the room users list after disconnect
      const roomUsers = Array.from(io.sockets.adapter.rooms.get(info.room) || []).map(sid => {
        const i = socketInfo[sid];
        return { id: sid, username: i?.username, status: i?.status };
      });
      io.to(info.room).emit("roomUsersUpdate", roomUsers);
      socket.to(info.room).emit("userLeft", { id: socket.id });
    }
  });
});


server.listen(5000, () => console.log("✅ Server running on port 5000"));
