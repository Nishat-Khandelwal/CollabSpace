import { BrowserRouter, Routes, Route } from "react-router-dom";
import Whiteboard from "./whiteboard";
import Auth from "./Auth";
import Dashboard from "./Dashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/whiteboard" element={<Whiteboard />} />
      </Routes>
    </BrowserRouter>
  );
}
