import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { ArrowRight } from "lucide-react";
import TiltedCard from "./components/TiltedCard";
import Particles from "./components/Particles";

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
    <div className="flex items-center justify-center min-h-screen text-gray-900 bg-slate-950 overflow-hidden relative font-sans selection:bg-blue-200 selection:text-blue-900">
      
      {/* Background Particles for the entire screen */}
      <div className="absolute inset-0 z-0 pointer-events-auto">
        <Particles
          particleColors={["#ffffff", "#60a5fa", "#3b82f6"]}
          particleCount={250}
          particleSpread={10}
          speed={0.1}
          particleBaseSize={100}
          moveParticlesOnHover={true}
          alphaParticles={false}
          disableRotation={false}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-[460px] px-6 pointer-events-none">
        
        <div className="pointer-events-auto w-full">
          <TiltedCard
            imageSrc=""
            customBackground={
              <div className="w-full h-full bg-white absolute inset-0 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-gray-100">
              </div>
            }
            altText="Login Card"
            containerHeight="540px"
            containerWidth="100%"
            imageHeight="100%"
            imageWidth="100%"
            rotateAmplitude={12}
            scaleOnHover={1.02}
            showMobileWarning={false}
            showTooltip={false}
            displayOverlayContent={true}
            overlayContent={
              <div className="w-full h-full flex flex-col items-center justify-center px-10 py-6 bg-white/80 backdrop-blur-md rounded-3xl border border-gray-200 shadow-inner pointer-events-auto">
                <div className="mb-10 flex flex-col items-center">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-blue-500/30">
                    <svg className="w-8 h-8 text-white transform rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight text-gray-900">CollabSpace</h1>
                  <p className="text-gray-500 text-base mt-2 font-medium tracking-wide text-center">Enter a username to join the workspace</p>
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
                      className="w-full bg-gray-50 border-2 border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 text-gray-900 placeholder-gray-400 px-5 py-3 text-lg rounded-xl transition-all duration-200 font-medium shadow-sm"
                      autoFocus
                    />
                  </div>

                  {error && <p className="text-red-500 text-sm mb-4 text-center font-semibold">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 text-lg rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30"
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

                <p className="text-gray-400 text-xs mt-6 text-center px-4 font-medium">
                  By continuing, you agree to start a guest session. Your data is stored locally.
                </p>
              </div>
            }
          />
        </div>

      </div>
    </div>
  );
}