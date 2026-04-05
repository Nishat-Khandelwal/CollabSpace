import React, { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import socket, { API_BASE } from "./socket";
import {
  Pencil, Eraser, Square, Circle as CircleIcon, Triangle, Star,
  MessageSquare, Users, Send, X, Share2, ArrowLeft, MousePointer2, Mail, Copy, Type, Bot, Undo2, Redo2, StickyNote
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const paragraphs = text.split('\n');
  let currentY = y;

  paragraphs.forEach((paragraph) => {
    const words = paragraph.split(' ');
    let line = '';

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
    currentY += lineHeight;
  });
}

const IDLE_TIMEOUT_MS = 60000;

export default function Whiteboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const roomId = searchParams.get("room") || "default";

  const username = localStorage.getItem("collab_username");

  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const messagesEndRef = useRef(null);
  const idleTimerRef = useRef(null);
  const historyRef = useRef([]);
  const redoStackRef = useRef([]);
  const currentPathRef = useRef(null);
  const remotePathsRef = useRef({});

  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState([
    { role: "ai", text: "Hi! I am your AI assistant. Ask me to change colours of shapes! (eg. 'change circle to red')" }
  ]);
  const aiMessagesEndRef = useRef(null);

  useEffect(() => {
    if (isAiOpen && aiMessagesEndRef.current) {
      aiMessagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [aiMessages, isAiOpen]);

  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#000000"); // Default to black for white bg
  const [size, setSize] = useState(3);
  const [tool, setTool] = useState("brush");
  const [shape, setShape] = useState(null);
  const [startPos, setStartPos] = useState(null);
  const [currPos, setCurrPos] = useState(null); // Added for shape preview
  const [activeTextBox, setActiveTextBox] = useState(null); // Added for Text overlay
  const [toastMessage, setToastMessage] = useState("");
  const [draggingItem, setDraggingItem] = useState(null);
  const [dragOffset, setDragOffset] = useState({x: 0, y: 0});

  const [roomUsers, setRoomUsers] = useState([]);
  const [cursors, setCursors] = useState({});

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [shareLoading, setShareLoading] = useState(false);

  useEffect(() => {
    if (!username) {
      navigate("/");
      return;
    }

    const saved = localStorage.getItem("recent_boards");
    const parsed = saved ? JSON.parse(saved) : [];
    if (!parsed.find(b => b.id === roomId)) {
      const newBoard = { id: roomId, name: "Shared Project", updatedAt: Date.now() };
      localStorage.setItem("recent_boards", JSON.stringify([newBoard, ...parsed]));
    }

    socket.connect();
    socket.emit("joinRoom", { roomId, username });
    socket.emit("requestSync");

    socket.on("provideSync", (targetId) => {
      if (historyRef.current.length > 0) {
        socket.emit("deliverSync", { targetId, history: historyRef.current });
      }
    });

    socket.on("initBoard", (history) => {
      historyRef.current = history;
      redoStackRef.current = [];
      redrawHistory(false);
    });

    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const ctx = canvas.getContext("2d");
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctxRef.current = ctx;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    socket.on("beginPath", ({ id, x, y, color, size, tool }) => {
      const newPath = { type: "path", tool, color, size, points: [{ x, y }], id };
      remotePathsRef.current[id] = newPath;
      historyRef.current.push(newPath);

      const ctx = ctxRef.current;
      if (!ctx) return;

      ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
    });

    socket.on("draw", ({ id, x, y }) => {
      if (id && remotePathsRef.current[id]) {
        remotePathsRef.current[id].points.push({ x, y });
      }
      const ctx = ctxRef.current;
      if (!ctx) return;
      ctx.lineTo(x, y);
      ctx.stroke();
    });

    socket.on("drawShape", (data) => {
      historyRef.current.push({ type: "shape", ...data });
      const { shape, startPos, w, h, color, size, tool } = data;
      const ctx = ctxRef.current;
      if (!ctx) return;

      ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
      ctx.strokeStyle = color;
      ctx.lineWidth = size;

      if (shape === "rectangle") ctx.strokeRect(startPos.x, startPos.y, w, h);
      if (shape === "circle") {
        ctx.beginPath();
        ctx.ellipse(startPos.x + w / 2, startPos.y + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, 2 * Math.PI);
        ctx.stroke();
      }
      if (shape === "triangle") {
        ctx.beginPath();
        ctx.moveTo(startPos.x + w / 2, startPos.y);
        ctx.lineTo(startPos.x, startPos.y + h);
        ctx.lineTo(startPos.x + w, startPos.y + h);
        ctx.closePath();
        ctx.stroke();
      }
      if (shape === "star") drawStar(ctx, startPos.x + w / 2, startPos.y + h / 2, 5, Math.abs(w / 2), Math.abs(w / 4));
    });

    socket.on("drawText", (data) => {
      historyRef.current.push({ type: "text", ...data });
      const { text, x, y, w, h, maxWidth, lineHeight, color, bg, isSticky, fontSize } = data;
      const ctx = ctxRef.current;
      if (!ctx) return;
      
      if (isSticky) {
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.15)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = bg || "#fef08a";
        ctx.fillRect(x - 4, y - 4, w || (maxWidth + 8), h || Math.max(150, lineHeight * 3));
        ctx.restore();
      }
      
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = color;
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textBaseline = "top";
      wrapText(ctx, text, x, y, maxWidth, lineHeight);
    });

    socket.on("clearBoard", () => {
      historyRef.current = [];
      remotePathsRef.current = {};
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });

    socket.on("roomUsersUpdate", (usersList) => {
      setRoomUsers(usersList);
    });

    socket.on("userStatusChange", ({ id, status }) => {
      setRoomUsers(prev => prev.map(u => u.id === id ? { ...u, status } : u));
    });

    socket.on("cursorMove", ({ id, username, x, y }) => {
      setCursors(prev => ({ ...prev, [id]: { username, x, y, lastUpdate: Date.now() } }));
    });

    socket.on("userLeft", ({ id }) => {
      setCursors(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    });

    socket.on("chatMessage", (msg) => {
      setMessages(prev => [...prev, msg]);
      if (!drawerOpen) {
        setUnreadCount(prev => prev + 1);
      }
    });

    socket.on("aiResponse", (data) => {
      const { message, actions } = data;
      setAiMessages(prev => [...prev, { role: "ai", text: message }]);
      
      let changed = false;
      if (actions && actions.length > 0) {
        actions.forEach(act => {
          if (act.action === "delete" && act.id) {
            const initialLen = historyRef.current.length;
            historyRef.current = historyRef.current.filter(i => i.id !== act.id);
            if (initialLen !== historyRef.current.length) changed = true;
          } else if (act.action === "update" && act.id && act.changes) {
            const idx = historyRef.current.findIndex(i => i.id === act.id);
            if (idx !== -1) {
              historyRef.current[idx] = { ...historyRef.current[idx], ...act.changes };
              changed = true;
            }
          } else if (act.action === "drawShape" && act.item) {
             historyRef.current.push(act.item);
             changed = true;
          } else if (act.action === "drawText" && act.item) {
             historyRef.current.push(act.item);
             changed = true;
          } else if (act.action === "clear") {
             historyRef.current = [];
             changed = true;
          }
        });
      }

      if (changed) {
        redrawHistory();
      }
    });

    socket.on("aiShapeCorrection", (data) => {
      const { originalId, shape, startPos, w, h, color, size } = data;
      historyRef.current = historyRef.current.filter(item => item.id !== originalId);
      
      const newShape = {
        type: "shape",
        shape: shape,
        startPos, w, h, color, size,
        tool: "brush",
        id: crypto.randomUUID()
      };
      historyRef.current.push(newShape);
      redrawHistory();
      setToastMessage(`AI auto-corrected to ${shape}!`);
      setTimeout(() => setToastMessage(""), 3000);
      
      // Sync the deletion and new shape with network peers
      socket.emit("askAi", { prompt: "quietly sync", history: historyRef.current }); // Simple trick to not need new network events, wait no, let's just emit explicitly.
      socket.emit("drawShape", { shape, startPos, w, h, color, size, tool: "brush", id: newShape.id });
    });

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      socket.off("beginPath");
      socket.off("draw");
      socket.off("drawShape");
      socket.off("drawText");
      socket.off("clearBoard");
      socket.off("roomUsersUpdate");
      socket.off("userStatusChange");
      socket.off("cursorMove");
      socket.off("userLeft");
      socket.off("chatMessage");
      socket.off("aiResponse");
      socket.disconnect();
    };
  }, [roomId, username, navigate, drawerOpen]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCursors(prev => {
        let changed = false;
        const next = { ...prev };
        for (const [id, cursor] of Object.entries(next)) {
          if (now - cursor.lastUpdate > 5000) {
            delete next[id];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    socket.emit("statusUpdate", "active");

    idleTimerRef.current = setTimeout(() => {
      socket.emit("statusUpdate", "idle");
    }, IDLE_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    resetIdleTimer();
    return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); };
  }, [resetIdleTimer]);

  useEffect(() => {
    if (drawerOpen && activeTab === "chat" && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, drawerOpen, activeTab]);

  useEffect(() => {
    if (drawerOpen && activeTab === "chat") {
      setUnreadCount(0);
    }
  }, [drawerOpen, activeTab]);

  const undo = () => {
    if (historyRef.current.length === 0) return;
    const item = historyRef.current.pop();
    redoStackRef.current.push(item);
    redrawHistory();
  };

  const redo = () => {
    if (redoStackRef.current.length === 0) return;
    const item = redoStackRef.current.pop();
    historyRef.current.push(item);
    redrawHistory();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          redo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMouseMove = (e) => {
    resetIdleTimer();
    const { clientX, clientY } = e;

    if (Math.random() > 0.5) socket.emit("cursorMove", { x: clientX, y: clientY });

    if (!drawing) return;

    if (tool === "select" && draggingItem) {
        if (draggingItem.type === "text") {
            draggingItem.x = clientX - dragOffset.x;
            draggingItem.y = clientY - dragOffset.y;
        } else if (draggingItem.type === "shape") {
            draggingItem.startPos.x = clientX - dragOffset.x;
            draggingItem.startPos.y = clientY - dragOffset.y;
        } else if (draggingItem.type === "path") {
            const dx = clientX - dragOffset.x - draggingItem.originalPoints[0].x;
            const dy = clientY - dragOffset.y - draggingItem.originalPoints[0].y;
            draggingItem.points = draggingItem.originalPoints.map(p => ({ x: p.x + dx, y: p.y + dy }));
        }
        
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        if (!ctx || !canvas) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        historyRef.current.forEach(i => renderItem(i));
        return;
    }

    // Live Shape Preview Support
    if ((tool === "shape" && shape) || tool === "text") {
      setCurrPos({ x: clientX, y: clientY });
      return;
    }

    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.lineTo(clientX, clientY);
    ctx.stroke();

    if (currentPathRef.current && (tool === "brush" || tool === "eraser")) {
      currentPathRef.current.points.push({ x: clientX, y: clientY });
      socket.emit("draw", { id: currentPathRef.current.id, x: clientX, y: clientY });
    } else {
      socket.emit("draw", { x: clientX, y: clientY });
    }
  };

  const startDrawing = (e) => {
    const { clientX, clientY } = e;
    const ctx = ctxRef.current;
    if (!ctx) return;

    if (activeTextBox) {
      finalizeText();
      if (tool === "text") return;
    }

    if (tool === "sticky") {
      setActiveTextBox({ x: clientX - 75, y: clientY - 75, w: 150, h: 150, text: "", color: "#000000", bg: "#fef08a", fontSize: 16, isSticky: true });
      setCurrPos(null);
      setDrawing(false);
      return;
    }

    if (tool === "select") {
       for (let i = historyRef.current.length - 1; i >= 0; i--) {
          const item = historyRef.current[i];
          if (item.type === "text") {
             if (clientX >= item.x && clientX <= item.x + item.maxWidth &&
                 clientY >= item.y && clientY <= item.y + (item.lineHeight * 2)) {
                 setDraggingItem(item);
                 setDragOffset({ x: clientX - item.x, y: clientY - item.y });
                 setDrawing(true);
                 return;
             }
          } else if (item.type === "shape") {
             const minX = Math.min(item.startPos.x, item.startPos.x + item.w);
             const maxX = Math.max(item.startPos.x, item.startPos.x + item.w);
             const minY = Math.min(item.startPos.y, item.startPos.y + item.h);
             const maxY = Math.max(item.startPos.y, item.startPos.y + item.h);
             if (clientX >= minX && clientX <= maxX && clientY >= minY && clientY <= maxY) {
                 setDraggingItem(item);
                 setDragOffset({ x: clientX - item.startPos.x, y: clientY - item.startPos.y });
                 setDrawing(true);
                 return;
             }
          } else if (item.type === "path" && item.points.length > 0) {
             let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
             for(let p of item.points) {
                 if(p.x < minX) minX = p.x;
                 if(p.x > maxX) maxX = p.x;
                 if(p.y < minY) minY = p.y;
                 if(p.y > maxY) maxY = p.y;
             }
             if (clientX >= minX && clientX <= maxX && clientY >= minY && clientY <= maxY) {
                 setDraggingItem({ ...item, originalPoints: JSON.parse(JSON.stringify(item.points)) });
                 setDragOffset({ x: clientX - item.points[0].x, y: clientY - item.points[0].y });
                 setDrawing(true);
                 return;
             }
          }
       }
       return;
    }

    if ((tool === "shape" && shape) || tool === "text") {
      setStartPos({ x: clientX, y: clientY });
      setCurrPos({ x: clientX, y: clientY });
      setDrawing(true);
      return;
    }

    if (tool === "brush" || tool === "eraser") {
      const pathId = crypto.randomUUID();
      currentPathRef.current = { type: "path", tool, color, size, points: [{ x: clientX, y: clientY }], id: pathId };
      historyRef.current.push(currentPathRef.current);
      redoStackRef.current = [];
      socket.emit("beginPath", { id: pathId, x: clientX, y: clientY, color, size, tool });
    } else {
      socket.emit("beginPath", { x: clientX, y: clientY, color, size, tool });
    }

    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";

    ctx.beginPath();
    ctx.moveTo(clientX, clientY);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    setDrawing(true);
  };

  const stopDrawing = (e) => {
    if (!drawing) return;

    if (tool === "select" && draggingItem) {
       if (draggingItem.type === "path") {
           const masterItem = historyRef.current.find(i => i.id === draggingItem.id);
           if (masterItem) masterItem.points = draggingItem.points;
       }
       setDraggingItem(null);
       setDrawing(false);
       redrawHistory();
       return;
    }

    if (currentPathRef.current) {
      // Automatic Shape Recognition
      const points = currentPathRef.current.points;
      if (tool === "brush" && points.length > 20) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let pathLen = 0;
        for (let i = 0; i < points.length; i++) {
          if (points[i].x < minX) minX = points[i].x;
          if (points[i].y < minY) minY = points[i].y;
          if (points[i].x > maxX) maxX = points[i].x;
          if (points[i].y > maxY) maxY = points[i].y;
          if (i > 0) pathLen += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
        }

        const w = maxX - minX;
        const h = maxY - minY;
        const first = points[0];
        const last = points[points.length - 1];
        const gap = Math.hypot(last.x - first.x, last.y - first.y);
        const diag = Math.hypot(w, h);

        // Check if path is relatively closed and large enough
        if (gap < diag * 0.25 && w > 30 && h > 30) {
          const rectPerimeter = 2 * (w + h);
          const circlePerimeter = Math.PI * Math.sqrt((w * w + h * h) / 2);

          const diffRect = Math.abs(pathLen - rectPerimeter) / rectPerimeter;
          const diffCircle = Math.abs(pathLen - circlePerimeter) / circlePerimeter;

          let recognizedShape = null;

          // Enhanced shape recognition based on extreme points + angular variance
          let cornerTL = 0, cornerTR = 0, cornerBL = 0, cornerBR = 0;
          let leftMost = points[0], rightMost = points[0];
          let topMost = points[0], bottomMost = points[0];

          for (let p of points) {
            const nx = (p.x - minX) / w;
            const ny = (p.y - minY) / h;
            if (nx < 0.10 && ny < 0.10) cornerTL = 1;
            if (nx > 0.90 && ny < 0.10) cornerTR = 1;
            if (nx < 0.10 && ny > 0.90) cornerBL = 1;
            if (nx > 0.90 && ny > 0.90) cornerBR = 1;

            if (p.x < leftMost.x) leftMost = p;
            if (p.x > rightMost.x) rightMost = p;
            if (p.y < topMost.y) topMost = p;
            if (p.y > bottomMost.y) bottomMost = p;
          }

          const cornerHits = cornerTL + cornerTR + cornerBL + cornerBR;
          const leftY = (leftMost.y - minY) / h;
          const rightY = (rightMost.y - minY) / h;
          const topX = (topMost.x - minX) / w;

          // Angular variance: measures how sharply direction changes along the path
          // Rectangles have sudden 90° turns → high variance; circles are smooth → low variance
          const step = Math.max(1, Math.floor(points.length / 40));
          const angles = [];
          for (let i = step; i < points.length - step; i += step) {
            const prev = points[i - step];
            const curr = points[i];
            const next = points[i + step];
            const a1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
            const a2 = Math.atan2(next.y - curr.y, next.x - curr.x);
            let diff = Math.abs(a2 - a1);
            if (diff > Math.PI) diff = 2 * Math.PI - diff;
            angles.push(diff);
          }
          const avgAngle = angles.length > 0 ? angles.reduce((a, b) => a + b, 0) / angles.length : 0;
          const angularVariance = angles.length > 0 ? angles.reduce((s, a) => s + (a - avgAngle) ** 2, 0) / angles.length : 0;

          // Count sharp turns (> 45°) — rectangles typically have 4 sharp corners
          const sharpTurns = angles.filter(a => a > Math.PI / 4).length;

          // Prioritized shape recognition
          if (diffCircle < 0.22 && angularVariance < 0.05 && sharpTurns <= 2 && cornerHits <= 1) {
            recognizedShape = "circle";
          } else if (sharpTurns >= 2 && cornerHits <= 2 && cornerTL === 0 && cornerTR === 0 && topX > 0.2 && topX < 0.8 && (cornerBL === 1 || cornerBR === 1 || (leftY >= 0.60 && rightY >= 0.60))) {
            recognizedShape = "triangle";
          } else if (cornerHits <= 2 && sharpTurns >= 4 && topX > 0.3 && topX < 0.7 && leftY >= 0.2 && leftY <= 0.6 && rightY >= 0.2 && rightY <= 0.6) {
            recognizedShape = "star";
          } else if (cornerHits >= 3 || (cornerHits >= 2 && diffRect < 0.25 && angularVariance > 0.04) || (diffRect < 0.20 && sharpTurns >= 3)) {
            recognizedShape = "rectangle";
          }

          if (recognizedShape) {
            const currentId = currentPathRef.current.id;
            const strokeColor = currentPathRef.current.color;
            const strokeSize = currentPathRef.current.size;

            // Re-render over existing paths cleanly
            setTimeout(() => {
              historyRef.current = historyRef.current.filter(item => item.id !== currentId);
              historyRef.current.push({
                type: "shape",
                shape: recognizedShape,
                startPos: { x: minX, y: minY },
                w, h,
                color: strokeColor,
                size: strokeSize,
                tool: "brush",
                id: crypto.randomUUID()
              });
              redrawHistory();
              setToastMessage(`Auto-corrected to ${recognizedShape}!`);
              setTimeout(() => setToastMessage(""), 3000);
            }, 10);
          }
        }
      }
      currentPathRef.current = null;
    }

    if ((tool === "text" || tool === "sticky") && startPos) {
      const { clientX, clientY } = e;
      const w = clientX - startPos.x;
      const h = clientY - startPos.y;

      const x = Math.min(startPos.x, clientX);
      const y = Math.min(startPos.y, clientY);
      const absW = Math.max(100, Math.abs(w)); // Min width
      const absH = Math.max(40, Math.abs(h));  // Min height

      setActiveTextBox({ 
          x, y, w: absW, h: absH, text: "", color: color, 
          fontSize: Math.max(14, size * 2), 
          isSticky: tool === "sticky", 
          bg: tool === "sticky" ? "#fef08a" : "transparent" 
      });
      setCurrPos(null);
      setDrawing(false);
      return;
    }

    if (tool === "shape" && shape && startPos) {
      const { clientX, clientY } = e;
      const ctx = ctxRef.current;
      const w = clientX - startPos.x;
      const h = clientY - startPos.y;

      ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
      ctx.strokeStyle = color;
      ctx.lineWidth = size;

      if (shape === "rectangle") ctx.strokeRect(startPos.x, startPos.y, w, h);
      if (shape === "circle") {
        ctx.beginPath();
        ctx.ellipse(startPos.x + w / 2, startPos.y + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, 2 * Math.PI);
        ctx.stroke();
      }
      if (shape === "triangle") {
        ctx.beginPath();
        ctx.moveTo(startPos.x + w / 2, startPos.y);
        ctx.lineTo(startPos.x, startPos.y + h);
        ctx.lineTo(startPos.x + w, startPos.y + h);
        ctx.closePath();
        ctx.stroke();
      }
      if (shape === "star") drawStar(ctx, startPos.x + w / 2, startPos.y + h / 2, 5, Math.abs(w / 2), Math.abs(w / 4));

      const shapeData = { shape, startPos, w, h, color, size, tool, id: crypto.randomUUID() };
      historyRef.current.push({ type: "shape", ...shapeData });
      redoStackRef.current = [];
      socket.emit("drawShape", shapeData);
      setCurrPos(null);
    }

    setDrawing(false);
  };

  const finalizeText = () => {
    if (!activeTextBox) return;
    if (activeTextBox.text.trim()) {
      const ctx = ctxRef.current;
      if (!ctx) return;

      const fontSize = activeTextBox.fontSize;
      const fontColor = activeTextBox.color;

      const textarea = document.getElementById("active-text-box");
      const finalW = textarea ? textarea.clientWidth : activeTextBox.w;
      const finalH = textarea ? textarea.clientHeight : activeTextBox.h;

      const textData = {
        text: activeTextBox.text,
        x: activeTextBox.x + 4,
        y: activeTextBox.y + 4,
        w: finalW,
        h: finalH,
        maxWidth: finalW - 8,
        lineHeight: fontSize * 1.2,
        color: fontColor,
        bg: activeTextBox.bg,
        isSticky: activeTextBox.isSticky,
        fontSize,
        id: crypto.randomUUID()
      };

      if (activeTextBox.isSticky) {
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.15)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = activeTextBox.bg || "#fef08a";
        ctx.fillRect(textData.x - 4, textData.y - 4, textData.w, textData.h);
        ctx.restore();
      }

      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = fontColor;
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textBaseline = "top";
      wrapText(ctx, textData.text, textData.x, textData.y, textData.maxWidth, textData.lineHeight);

      historyRef.current.push({ type: "text", ...textData });
      redoStackRef.current = [];
      socket.emit("drawText", textData);
    }
    setActiveTextBox(null);
  };

  const renderItem = (item) => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.globalCompositeOperation = item.tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = item.color;
    ctx.fillStyle = item.color;
    ctx.lineWidth = item.size;

    if (item.type === "path") {
      ctx.beginPath();
      if (item.points.length > 0) {
        ctx.moveTo(item.points[0].x, item.points[0].y);
        for (let i = 1; i < item.points.length; i++) {
          ctx.lineTo(item.points[i].x, item.points[i].y);
        }
      }
      ctx.stroke();
    } else if (item.type === "shape") {
      const { shape, startPos, w, h } = item;
      if (shape === "rectangle") ctx.strokeRect(startPos.x, startPos.y, w, h);
      if (shape === "circle") {
        ctx.beginPath();
        ctx.ellipse(startPos.x + w / 2, startPos.y + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, 2 * Math.PI);
        ctx.stroke();
      }
      if (shape === "triangle") {
        ctx.beginPath();
        ctx.moveTo(startPos.x + w / 2, startPos.y);
        ctx.lineTo(startPos.x, startPos.y + h);
        ctx.lineTo(startPos.x + w, startPos.y + h);
        ctx.closePath();
        ctx.stroke();
      }
      if (shape === "star") drawStar(ctx, startPos.x + w / 2, startPos.y + h / 2, 5, Math.abs(w / 2), Math.abs(w / 4));
    } else if (item.type === "text") {
      if (item.isSticky) {
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.15)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = item.bg || "#fef08a";
        ctx.fillRect(item.x - 4, item.y - 4, item.w || (item.maxWidth + 8), item.h || Math.max(150, item.lineHeight * 3));
        ctx.restore();
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = item.color;
      ctx.font = `${item.fontSize}px sans-serif`;
      ctx.textBaseline = "top";
      wrapText(ctx, item.text, item.x, item.y, item.maxWidth, item.lineHeight);
    }
  };

  const redrawHistory = (syncToPeers = true) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    // Take a snapshot so mutations during iteration can't cause ghost items
    const snapshot = [...historyRef.current];
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    snapshot.forEach(item => renderItem(item));

    if (syncToPeers) {
      // Sync remote peers
      socket.emit("clearBoard");
      snapshot.forEach(item => {
        if (item.type === "path" && item.points?.length > 0) {
          socket.emit("beginPath", { id: item.id, x: item.points[0].x, y: item.points[0].y, color: item.color, size: item.size, tool: item.tool });
          for (let i = 1; i < item.points.length; i++) {
            socket.emit("draw", { id: item.id, x: item.points[i].x, y: item.points[i].y });
          }
        } else if (item.type === "shape") {
          socket.emit("drawShape", { shape: item.shape, startPos: item.startPos, w: item.w, h: item.h, color: item.color, size: item.size, tool: item.tool });
        } else if (item.type === "text") {
          socket.emit("drawText", { 
             text: item.text, x: item.x, y: item.y, w: item.w, h: item.h, 
             maxWidth: item.maxWidth, lineHeight: item.lineHeight, 
             color: item.color, bg: item.bg, isSticky: item.isSticky, fontSize: item.fontSize 
          });
        }
      });
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    historyRef.current = [];
    redoStackRef.current = [];
    remotePathsRef.current = {};
    currentPathRef.current = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit("clearBoard");
  };

  const drawStar = (ctx, cx, cy, spikes, outerRadius, innerRadius) => {
    let rot = (Math.PI / 2) * 3;
    let step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.stroke();
  };

  const sendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const msg = {
      id: crypto.randomUUID(),
      sender: username,
      text: chatInput.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, msg]);
    socket.emit("chatMessage", msg);
    setChatInput("");
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setToastMessage("Link copied! Share with your team.");
    setTimeout(() => setToastMessage(""), 3000);
  };

  const sendAiMessage = (e) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    const userMsg = { role: "user", text: aiInput.trim() };
    setAiMessages(prev => [...prev, userMsg]);
    
    // Emit to backend for Gemini processing
    socket.emit("askAi", { prompt: aiInput.trim(), history: historyRef.current });
    
    setAiInput("");
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 text-black relative font-sans selection:bg-blue-100 selection:text-blue-900">

      {/* Light mode dotted grid background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{ backgroundImage: `radial-gradient(rgba(0,0,0,0.1) 1px, transparent 1px)`, backgroundSize: '32px 32px' }}
      />

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className={cn(
          "absolute inset-0 z-10 touch-none",
          tool === "brush" ? "cursor-pencil" :
            tool === "eraser" ? "cursor-eraser" :
              "cursor-crosshair"
        )}
        onMouseDown={startDrawing}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />

      {/* Shape/Text Preview Layer */}
      {drawing && startPos && currPos && (
        <svg className="absolute inset-0 pointer-events-none z-10" width="100%" height="100%">
          {tool === "text" && (
            <rect
              x={Math.min(startPos.x, currPos.x)}
              y={Math.min(startPos.y, currPos.y)}
              width={Math.max(100, Math.abs(currPos.x - startPos.x))}
              height={Math.max(40, Math.abs(currPos.y - startPos.y))}
              fill="none" stroke={color} strokeWidth={2} strokeDasharray="5,5"
            />
          )}
          {tool === "shape" && shape === "rectangle" && (
            <rect
              x={Math.min(startPos.x, currPos.x)}
              y={Math.min(startPos.y, currPos.y)}
              width={Math.abs(currPos.x - startPos.x)}
              height={Math.abs(currPos.y - startPos.y)}
              fill="none" stroke={color} strokeWidth={size}
            />
          )}
          {tool === "shape" && shape === "circle" && (
            <ellipse
              cx={startPos.x + (currPos.x - startPos.x) / 2}
              cy={startPos.y + (currPos.y - startPos.y) / 2}
              rx={Math.abs((currPos.x - startPos.x) / 2)}
              ry={Math.abs((currPos.y - startPos.y) / 2)}
              fill="none" stroke={color} strokeWidth={size}
            />
          )}
          {tool === "shape" && shape === "triangle" && (
            <polygon
              points={`
                ${startPos.x + (currPos.x - startPos.x) / 2},${startPos.y} 
                ${startPos.x},${currPos.y} 
                ${currPos.x},${currPos.y}
              `}
              fill="none" stroke={color} strokeLinejoin="round" strokeWidth={size}
            />
          )}
          {tool === "shape" && shape === "star" && (
            <path
              d={(() => {
                const w = currPos.x - startPos.x;
                const h = currPos.y - startPos.y;
                let rot = (Math.PI / 2) * 3;
                let step = Math.PI / 5;
                const cx = startPos.x + w / 2;
                const cy = startPos.y + h / 2;
                const outerRadius = Math.abs(w / 2);
                const innerRadius = Math.abs(w / 4);
                let path = `M ${cx} ${cy - outerRadius}`;
                for (let i = 0; i < 5; i++) {
                  path += ` L ${cx + Math.cos(rot) * outerRadius} ${cy + Math.sin(rot) * outerRadius}`;
                  rot += step;
                  path += ` L ${cx + Math.cos(rot) * innerRadius} ${cy + Math.sin(rot) * innerRadius}`;
                  rot += step;
                }
                path += " Z";
                return path;
              })()}
              fill="none" stroke={color} strokeLinejoin="round" strokeWidth={size}
            />
          )}
        </svg>
      )}

      {/* Active Text Box Overlay */}
      {activeTextBox && (
        <>
          {/* Text Box Options Menu */}
          <div
            className="absolute z-50 flex items-center gap-3 bg-white border border-gray-200 shadow-xl rounded-xl p-2 animate-in fade-in zoom-in duration-200"
            style={{
              left: activeTextBox.x,
              top: Math.max(10, activeTextBox.y - 85),
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">Color</span>
              <div className="relative w-8 h-8 rounded-full border border-gray-300 shadow-sm cursor-pointer mx-auto" style={{ backgroundColor: activeTextBox.color }}>
                <input
                  type="color"
                  value={activeTextBox.color}
                  onChange={(e) => setActiveTextBox({ ...activeTextBox, color: e.target.value })}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>

            <div className="h-8 w-[1px] bg-gray-200" />

            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">Size</span>
              <div className="flex items-center gap-2 px-1">
                <input
                  type="range"
                  min="12"
                  max="96"
                  value={activeTextBox.fontSize}
                  onChange={(e) => setActiveTextBox({ ...activeTextBox, fontSize: Number(e.target.value) })}
                  className="w-24 accent-blue-600 cursor-pointer h-2 bg-gray-200 rounded-full appearance-none outline-none"
                />
                <span className="text-sm font-bold w-6 text-center text-gray-700">{activeTextBox.fontSize}</span>
              </div>
            </div>

            {activeTextBox.isSticky && (
               <>
                 <div className="h-8 w-[1px] bg-gray-200" />
                 <div className="flex flex-col">
                   <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">Note Base</span>
                   <div className="relative w-8 h-8 rounded-md border border-gray-300 shadow-sm cursor-pointer mx-auto" style={{ backgroundColor: activeTextBox.bg }}>
                     <input
                       type="color"
                       value={activeTextBox.bg}
                       onChange={(e) => setActiveTextBox({ ...activeTextBox, bg: e.target.value })}
                       className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                     />
                   </div>
                 </div>
               </>
            )}

            <div className="h-8 w-[1px] bg-gray-200" />
            <button
              onClick={() => finalizeText()}
              className="bg-black text-white text-sm font-bold px-5 py-2 rounded-lg hover:bg-gray-800 transition-colors shadow-md ml-1"
            >
              Done
            </button>
          </div>

          <textarea
            id="active-text-box"
            autoFocus
            className="absolute bg-transparent outline-none overflow-hidden z-40 custom-scrollbar"
            style={{
              left: activeTextBox.x,
              top: activeTextBox.y,
              width: activeTextBox.w,
              height: activeTextBox.h,
              color: activeTextBox.color,
              backgroundColor: activeTextBox.bg || "transparent",
              fontSize: `${activeTextBox.fontSize}px`,
              fontFamily: "sans-serif",
              border: activeTextBox.isSticky ? "none" : `2px dashed ${activeTextBox.color}`,
              boxShadow: activeTextBox.isSticky ? "0 4px 10px rgba(0,0,0,0.15)" : "0 0 0 2px rgba(255,255,255,0.5)",
              padding: "4px",
              resize: "both",
              minWidth: "100px",
              minHeight: "40px",
            }}
            value={activeTextBox.text}
            onChange={(e) => setActiveTextBox({ ...activeTextBox, text: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                finalizeText();
              }
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          />
        </>
      )}

      {/* Cursors */}
      {Object.entries(cursors).map(([id, cur]) => (
        <div
          key={id}
          className="absolute z-20 pointer-events-none transition-transform duration-75 ease-linear flex flex-col items-center"
          style={{ transform: `translate(${cur.x}px, ${cur.y}px)` }}
        >
          <MousePointer2 className="w-5 h-5 absolute -top-1 -left-1 text-black fill-black drop-shadow-md" />
          <div className="bg-black/90 text-white text-[10px] font-bold px-2 py-0.5 rounded mt-5 whitespace-nowrap shadow-sm tracking-wide">
            {cur.username}
          </div>
        </div>
      ))}

      {/* Top Floating Action Bar */}
      <div className="absolute top-6 left-6 z-30 flex items-center gap-3">
        <button
          onClick={() => navigate("/dashboard")}
          className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all duration-200"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-bold">Projects</span>
        </button>
      </div>

      <div className="absolute top-6 right-6 z-30 flex items-center gap-3">
        {roomUsers.length > 1 && (
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all duration-200 relative group"
          >
            <MessageSquare size={18} />
            <span className="text-sm font-bold">Chat</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full animate-bounce shadow-md">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        )}
        <button
          onClick={() => setIsAiOpen(true)}
          className={cn("bg-white hover:bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all duration-200", isAiOpen ? "ring-2 ring-purple-500 text-purple-600" : "text-gray-800")}
        >
          <Bot size={18} className={isAiOpen ? "text-purple-600 animate-bounce" : "text-purple-600"} />
          <span className="text-sm font-bold text-purple-600">AI</span>
        </button>
        <button
          onClick={() => setIsShareModalOpen(true)}
          className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-2 transition-all duration-200"
        >
          <Share2 size={18} />
          <span className="text-sm font-bold">Share</span>
        </button>
      </div>

      {/* Core Toolbar - Centered Bottom */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-white/95 backdrop-blur-md shadow-2xl border border-gray-200 rounded-2xl p-2 select-none touch-none">

        <ToolButton icon={<MousePointer2 size={20} />} label="Select" active={tool === "select"} onClick={() => { setTool("select"); setShape(null); }} />
        <ToolButton icon={<Pencil size={20} />} label="Brush" active={tool === "brush"} onClick={() => { setTool("brush"); setShape(null); }} />
        <ToolButton icon={<Eraser size={20} />} label="Eraser" active={tool === "eraser"} onClick={() => { setTool("eraser"); setShape(null); }} />
        <ToolButton icon={<Type size={20} />} label="Text" active={tool === "text"} onClick={() => { setTool("text"); setShape(null); }} />
        <ToolButton icon={<StickyNote size={20} />} label="Sticky" active={tool === "sticky"} onClick={() => { setTool("sticky"); setShape(null); }} />

        <div className="h-8 w-[1px] bg-gray-200 mx-2" />

        <div className="relative group">
          <ToolButton icon={<Square size={20} />} label="Shapes" active={tool === "shape"} onClick={() => { setTool("shape"); if (!shape) setShape("rectangle"); }} />
          {/* Using after:absolute inside popup to reliably bridge the hover gap */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:flex bg-white border border-gray-200 rounded-xl shadow-2xl p-1 gap-1 after:absolute after:h-5 after:w-full after:-bottom-5 after:left-0">
            <ShapeButton icon={<Square size={18} />} active={shape === "rectangle"} onClick={() => { setTool("shape"); setShape("rectangle"); }} />
            <ShapeButton icon={<CircleIcon size={18} />} active={shape === "circle"} onClick={() => { setTool("shape"); setShape("circle"); }} />
            <ShapeButton icon={<Triangle size={18} />} active={shape === "triangle"} onClick={() => { setTool("shape"); setShape("triangle"); }} />
            <ShapeButton icon={<Star size={18} />} active={shape === "star"} onClick={() => { setTool("shape"); setShape("star"); }} />
          </div>
        </div>

        <div className="h-8 w-[1px] bg-gray-200 mx-2" />

        <div className="flex items-center gap-4 px-3">
          <div className="relative w-7 h-7 rounded-full border border-gray-300 shadow-sm cursor-pointer" style={{ backgroundColor: color }}>
            {/* Removed overflow-hidden and made absolute inset to ensure it's easily clicked everywhere */}
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          </div>
          <input type="range" min="1" max="24" value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-24 accent-black cursor-pointer h-1.5 bg-gray-200 rounded-full appearance-none outline-none" />
        </div>

        <div className="h-8 w-[1px] bg-gray-200 mx-2" />

        <ToolButton icon={<Undo2 size={20} />} label="Undo (Ctrl+Z)" active={false} onClick={undo} />
        <ToolButton icon={<Redo2 size={20} />} label="Redo (Ctrl+Y)" active={false} onClick={redo} />

        <div className="h-8 w-[1px] bg-gray-200 mx-2" />

        <button onClick={clearCanvas} className="text-sm font-bold text-red-500 hover:text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl transition-colors">
          Clear
        </button>

      </div>

      {/* Integrated Chat Drawer - Light Theme */}
      <div className={cn("absolute top-0 right-0 h-full w-[400px] bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]", drawerOpen ? 'translate-x-0' : 'translate-x-full')}>

        {/* Drawer Header */}
        <div className="h-20 px-6 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex gap-6">
            <button onClick={() => setActiveTab("chat")} className={cn("text-base font-bold transition-colors relative pb-6 top-3.5", activeTab === "chat" ? "text-black" : "text-gray-400 hover:text-gray-600")}>
              Chat
              {activeTab === "chat" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black rounded-t-full" />}
            </button>
            <button onClick={() => setActiveTab("people")} className={cn("text-base font-bold transition-colors relative pb-6 top-3.5 flex items-center gap-2", activeTab === "people" ? "text-black" : "text-gray-400 hover:text-gray-600")}>
              People <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">{roomUsers.length}</span>
              {activeTab === "people" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black rounded-t-full" />}
            </button>
          </div>
          <button onClick={() => setDrawerOpen(false)} className="text-gray-400 hover:text-black hover:bg-gray-100 p-2 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden relative bg-gray-50/50">

          {/* Chat Tab */}
          <div className={cn("absolute inset-0 flex flex-col transition-opacity duration-200", activeTab === "chat" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none")}>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm gap-3">
                  <MessageSquare size={32} className="opacity-50" />
                  <p className="font-medium">No messages yet.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender === username;
                  return (
                    <div key={msg.id} className={cn("flex flex-col max-w-[85%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
                      <div className="flex items-center gap-2 mb-1.5 pr-1">
                        <span className="text-xs font-bold text-gray-500">{isMe ? "You" : msg.sender}</span>
                        <span className="text-[10px] font-medium text-gray-400">{format(msg.timestamp, 'HH:mm')}</span>
                      </div>
                      <div className={cn("px-4 py-3 rounded-2xl text-[14px] leading-relaxed shadow-sm", isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border border-gray-200 text-gray-900 rounded-tl-sm')}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendChatMessage} className="p-5 border-t border-gray-100 bg-white shrink-0">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 focus-within:border-gray-400 focus-within:bg-white focus-within:shadow-sm rounded-xl pl-4 pr-1.5 py-1.5 transition-all">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent border-none focus:outline-none text-[14px] text-black placeholder-gray-400 font-medium"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="p-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-black transition-colors flex items-center justify-center shadow-sm"
                >
                  <Send size={16} className="ml-0.5" />
                </button>
              </div>
            </form>
          </div>

          {/* People Tab */}
          <div className={cn("absolute inset-0 flex flex-col overflow-y-auto p-6 transition-opacity duration-200", activeTab === "people" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none")}>
            <div className="flex items-center gap-2 mb-6 ml-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Online Now</span>
            </div>
            <div className="space-y-3">
              {roomUsers.map((u) => {
                const isMe = u.username === username;
                const isIdle = u.status === "idle";
                return (
                  <div key={u.id} className="flex items-center justify-between bg-white border border-gray-100 hover:border-gray-200 shadow-sm p-4 rounded-xl transition-all">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm", isMe ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700')}>
                          {u.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div className={cn("absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[3px] border-white shadow-sm", isIdle ? 'bg-amber-400' : 'bg-green-500')} title={isIdle ? 'Idle' : 'Active'} />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[15px] font-bold text-gray-900">
                          {u.username} {isMe && <span className="text-gray-400 font-medium text-xs ml-1">(You)</span>}
                        </span>
                        <span className="text-xs font-medium text-gray-500">
                          {isIdle ? 'Away' : 'Active'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col transform transition-all">
            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Share2 size={20} className="text-blue-500" /> Share Project
              </h2>
              <button onClick={() => setIsShareModalOpen(false)} className="text-gray-400 hover:text-black hover:bg-gray-100 p-2 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 text-left">
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-700 block">Share via Email</label>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!shareEmail.trim() || shareLoading) return;
                    setShareLoading(true);
                    try {
                      const res = await fetch(`${API_BASE}/api/share-email`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          email: shareEmail.trim(),
                          link: window.location.href,
                          senderName: username,
                        }),
                      });
                      const data = await res.json();
                      if (res.ok) {
                        setShareEmail("");
                        setIsShareModalOpen(false);
                        setToastMessage("Invitation email sent!");
                      } else {
                        setToastMessage(data.message || "Failed to send email.");
                      }
                    } catch (err) {
                      setToastMessage("Could not reach the server.");
                    } finally {
                      setShareLoading(false);
                      setTimeout(() => setToastMessage(""), 3000);
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="email"
                    required
                    placeholder="Enter Gmail ID..."
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm font-medium text-black placeholder-gray-400"
                  />
                  <button
                    type="submit"
                    disabled={shareLoading}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl shadow-md font-bold text-sm transition-all duration-200 flex items-center gap-2"
                  >
                    {shareLoading ? (
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                    ) : (
                      <Mail size={16} />
                    )}
                    {shareLoading ? "Sending..." : "Send"}
                  </button>
                </form>
              </div>

              <div className="h-px bg-gray-100 w-full" />

              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-700 block">Get Link</label>
                <div className="flex gap-2">
                  <div className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden text-ellipsis whitespace-nowrap text-sm text-gray-500 font-mono select-all">
                    {window.location.href}
                  </div>
                  <button
                    onClick={() => {
                      copyShareLink();
                      setIsShareModalOpen(false);
                    }}
                    className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl shadow-md font-bold text-sm transition-all duration-200 flex items-center gap-2"
                  >
                    <Copy size={16} /> Copy
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Copy Link Toast (Vercel Style) */}
      <div className={cn("absolute bottom-8 right-8 bg-black text-white px-5 py-4 rounded-xl shadow-2xl font-bold text-sm transition-all duration-300 z-[60] flex items-center gap-3", toastMessage ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none")}>
        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        </div>
        {toastMessage}
      </div>

      {/* AI Chatbox Overlay */}
      <div className={cn("absolute bottom-6 right-6 w-[340px] bg-white border border-gray-200 shadow-2xl rounded-2xl flex flex-col transition-all duration-300 z-[100] overflow-hidden origin-bottom-right", isAiOpen ? "h-[450px] opacity-100 scale-100" : "h-0 opacity-0 scale-95 pointer-events-none")}>
        <div className="bg-purple-600 px-4 py-3 flex items-center justify-between text-white shadow-sm shrink-0">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Bot size={18} /> Whiteboard AI
          </div>
          <button onClick={() => setIsAiOpen(false)} className="hover:bg-purple-700 p-1.5 rounded-lg transition-colors text-white">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50">
          {aiMessages.map((msg, i) => (
            <div key={i} className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm leading-relaxed", msg.role === "ai" ? "bg-white border border-gray-100 text-gray-800 mr-auto rounded-tl-sm" : "bg-purple-600 text-white ml-auto rounded-tr-sm")}>
              {msg.text}
            </div>
          ))}
          <div ref={aiMessagesEndRef} />
        </div>

        <form onSubmit={sendAiMessage} className="p-4 border-t border-gray-100 bg-white shrink-0">
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-purple-500/30 focus-within:bg-white focus-within:border-purple-300 transition-all p-1">
            <input
              type="text"
              className="flex-1 bg-transparent border-none text-[14px] px-3 py-1.5 focus:outline-none placeholder-gray-400 font-medium"
              placeholder="E.g. change circle to red"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
            />
            <button type="submit" disabled={!aiInput.trim()} className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-purple-600 shadow-sm flex items-center justify-center">
              <Send size={15} className="ml-0.5" />
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}

// Minimal tool buttons - Light Mode
function ToolButton({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn("p-2.5 rounded-xl transition-all duration-200", active ? 'bg-gray-100 text-black shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-black')}
      title={label}
    >
      {icon}
    </button>
  );
}

function ShapeButton({ icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn("p-2 rounded-lg transition-all duration-200", active ? 'bg-gray-100 text-black shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-black')}
    >
      {icon}
    </button>
  );
}