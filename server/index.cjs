const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

const usersDB = {};
const JWT_SECRET = "mySuperSecretKey123"; 


app.post("/signup", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ message: "Username and password required" });

  if (usersDB[username])
    return res.status(400).json({ message: "User already exists" });

  const hashed = await bcrypt.hash(password, 10);
  usersDB[username] = { username, password: hashed };

  console.log("New user signed up:", username);
  res.json({ message: "Signup successful" });
});


app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = usersDB[username];
  if (!user) return res.status(400).json({ message: "User not found" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "1h" });

  console.log("User logged in:", username);
  res.json({ token, username });
});


const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Track users and their sockets
const users = {};
const sockets = {};

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // When a user joins
  socket.on("join", (name) => {
    users[name] = socket.id;
    sockets[socket.id] = name;
    console.log(`${name} joined`);
    io.emit("onlineUsers", Object.keys(users));
  });

 
  socket.on("privateMessage", (msg) => {
  const targetSocket = users[msg.to];

  if (targetSocket) {
    io.to(targetSocket).emit("privateMessage", msg); 
  }

  io.to(socket.id).emit("privateMessage", msg); 
});

  
  socket.on("chatMessage", (msg) => {
    console.log("Message received:", msg);
    io.emit("chatMessage", msg); 
  });

  
  socket.on("beginPath", (data) => {
    socket.broadcast.emit("beginPath", data);
  });


  socket.on("draw", (data) => {
    socket.broadcast.emit("draw", data);
  });

  socket.on("drawShape", (data) => {
  socket.broadcast.emit("drawShape", data);
});

  
  socket.on("clearBoard", () => {
    socket.broadcast.emit("clearBoard");
  });

  
  socket.on("disconnect", () => {
    const name = sockets[socket.id];
    if (name) {
      delete users[name];
      delete sockets[socket.id];
      console.log(`${name} disconnected`);
      io.emit("onlineUsers", Object.keys(users));
    }
  });
});


server.listen(5000, () => console.log("✅ Server running on port 5000"));
