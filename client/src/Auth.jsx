import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { ArrowRight } from "lucide-react";


import { API_BASE } from "./socket";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Username cannot be empty");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await axios.post(`${API_BASE}/login`, {
        username: username.trim()
      });

      if (res.data.token) {
        localStorage.setItem("collab_token", res.data.token);
        localStorage.setItem("collab_username", res.data.username);
        
        const searchParams = new URLSearchParams(location.search);
        const redirectUrl = searchParams.get("redirect");
        
        if (redirectUrl) {
          navigate(redirectUrl);
        } else {
          navigate("/dashboard");
        }
      }
    } catch (err) {
      console.error("Login failed:", err);
      setError(err.response?.data?.message || "Failed to login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen text-gray-900 bg-slate-50 overflow-hidden relative font-sans selection:bg-blue-200 selection:text-blue-900">

      <div className="relative z-10 flex flex-col items-center w-full max-w-[420px] px-6">
        
        <div className="mb-12 flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-8 shadow-xl shadow-blue-500/30">
            <svg className="w-8 h-8 text-white transform rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">CollabSpace</h1>
          <p className="text-gray-500 text-lg mt-3 font-medium tracking-wide text-center">Enter a username to join the workspace</p>
        </div>

        <form onSubmit={handleLogin} className="w-full">
          <div className="relative mb-5 group rounded-xl">
            <input
              type="text"
              placeholder="Ex: John Doe"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) setError("");
              }}
              className="w-full bg-white border-2 border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 text-gray-900 placeholder-gray-400 px-5 py-4 text-lg rounded-xl transition-all duration-200 font-medium shadow-sm"
              autoFocus
            />
          </div>

          {error && <p className="text-red-500 text-sm mb-5 text-center font-semibold">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-5 text-lg rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Continue Environment
                <ArrowRight size={20} className="text-white/90 group-hover:text-white transition-colors" />
              </>
            )}
          </button>
        </form>

        <p className="text-gray-400 text-sm mt-10 text-center px-4 font-medium">
          By continuing, you agree to start a guest session. Your data is stored locally.
        </p>
      </div>
    </div>
  );
}