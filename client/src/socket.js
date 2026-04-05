
import { io } from "socket.io-client";

export const API_BASE = import.meta.env.PROD 
  ? window.location.origin 
  : (import.meta.env.VITE_SOCKET_URL || "http://localhost:5000");

const socket = io(API_BASE, {
  transports: ["websocket", "polling"],
  autoConnect: true,
});

export default socket;
