import React, { useEffect, useRef, useState } from "react";
import socket from "./socket";

export default function Whiteboard() {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(3);
  const [tool, setTool] = useState("brush");

  const [shape, setShape] = useState(null);
  const [startPos, setStartPos] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight - 60;

      const ctx = canvas.getContext("2d");
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctxRef.current = ctx;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    socket.on("beginPath", ({ x, y, color, size, tool }) => {
      const ctx = ctxRef.current;
      if (!ctx) return;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
      ctx.lineWidth = tool === "eraser" ? 20 : size;
    });

    socket.on("draw", ({ x, y }) => {
      const ctx = ctxRef.current;
      if (!ctx) return;

      ctx.lineTo(x, y);
      ctx.stroke();
    });

    socket.on("drawShape", ({ shape, startPos, w, h, color, size }) => {
      const ctx = ctxRef.current;
      if (!ctx) return;

      ctx.strokeStyle = color;
      ctx.lineWidth = size;

      if (shape === "rectangle") {
        ctx.strokeRect(startPos.x, startPos.y, w, h);
      }

      if (shape === "circle") {
        ctx.beginPath();
        ctx.ellipse(
          startPos.x + w / 2,
          startPos.y + h / 2,
          Math.abs(w / 2),
          Math.abs(h / 2),
          0,
          0,
          2 * Math.PI
        );
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

      if (shape === "star") {
        drawStar(ctx, startPos.x + w / 2, startPos.y + h / 2, 5, Math.abs(w / 2), Math.abs(w / 4));
      }
    });

    socket.on("clearBoard", () => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      socket.off("beginPath");
      socket.off("draw");
      socket.off("drawShape");
      socket.off("clearBoard");
    };
  }, []);

  const startDrawing = (e) => {
    const { offsetX, offsetY } = e.nativeEvent;

    const ctx = ctxRef.current;
    if (!ctx) return;

    if (tool === "shape" && shape) {
      setStartPos({ x: offsetX, y: offsetY });
      setDrawing(true);
      return;
    }

    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.lineWidth = tool === "eraser" ? 20 : size;

    setDrawing(true);

    socket.emit("beginPath", {
      x: offsetX,
      y: offsetY,
      color,
      size,
      tool,
    });
  };

  const draw = (e) => {
    if (!drawing) return;
    if (tool === "shape") return;

    const { offsetX, offsetY } = e.nativeEvent;
    const ctx = ctxRef.current;
    if (!ctx) return;

    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();

    socket.emit("draw", { x: offsetX, y: offsetY });
  };

  const stopDrawing = (e) => {
    if (!drawing) return;

    if (tool === "shape" && shape && startPos) {
      const { offsetX, offsetY } = e.nativeEvent;

      const ctx = ctxRef.current;
      const w = offsetX - startPos.x;
      const h = offsetY - startPos.y;

      ctx.strokeStyle = color;
      ctx.lineWidth = size;

      if (shape === "rectangle") {
        ctx.strokeRect(startPos.x, startPos.y, w, h);
      }

      if (shape === "circle") {
        ctx.beginPath();
        ctx.ellipse(
          startPos.x + w / 2,
          startPos.y + h / 2,
          Math.abs(w / 2),
          Math.abs(h / 2),
          0,
          0,
          2 * Math.PI
        );
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

      if (shape === "star") {
        drawStar(ctx, startPos.x + w / 2, startPos.y + h / 2, 5, Math.abs(w / 2), Math.abs(w / 4));
      }

      socket.emit("drawShape", { shape, startPos, w, h, color, size });
    }

    setDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;

    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit("clearBoard");
  };

  const drawStar = (ctx, cx, cy, spikes, outerRadius, innerRadius) => {
    let rot = (Math.PI / 2) * 3;
    let step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(
        cx + Math.cos(rot) * outerRadius,
        cy + Math.sin(rot) * outerRadius
      );
      rot += step;

      ctx.lineTo(
        cx + Math.cos(rot) * innerRadius,
        cy + Math.sin(rot) * innerRadius
      );
      rot += step;
    }

    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.stroke();
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gradient-to-br from-sky-200 to-purple-300">

      <div className="h-14 bg-white/80 backdrop-blur shadow flex items-center gap-4 px-6 relative z-40">

        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />

        <input type="range" min="1" max="20" value={size} onChange={(e) => setSize(e.target.value)} />

        <button onClick={() => setTool("brush")} className="px-3 py-1 rounded bg-blue-600 text-white">
          Brush
        </button>

        <button onClick={() => setTool("eraser")} className="px-3 py-1 rounded bg-gray-300">
          Eraser
        </button>

        <div className="relative">
          <button onClick={() => setTool("shape")} className="px-3 py-1 rounded bg-purple-600 text-white">
            Shapes
          </button>

          {tool === "shape" && (
            <div className="absolute top-10 left-0 bg-white shadow rounded p-2 flex flex-col gap-1 z-50">
              <button onClick={() => setShape("rectangle")} className="hover:bg-gray-100 px-2 py-1">Rectangle</button>
              <button onClick={() => setShape("circle")} className="hover:bg-gray-100 px-2 py-1">Circle</button>
              <button onClick={() => setShape("triangle")} className="hover:bg-gray-100 px-2 py-1">Triangle</button>
              <button onClick={() => setShape("star")} className="hover:bg-gray-100 px-2 py-1">Star</button>
            </div>
          )}
        </div>

        <button onClick={clearCanvas} className="px-3 py-1 rounded bg-red-600 text-white">
          Clear
        </button>

      </div>

      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 bg-white cursor-crosshair z-0"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
      </div>

    </div>
  );
}