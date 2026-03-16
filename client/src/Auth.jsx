import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { app } from "./firebase"; 
import socket from "./socket"; 

export default function Auth() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState(null);

  const auth = getAuth(app);
  const googleProvider = new GoogleAuthProvider();


  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);

      const user = result.user;
      const basename =
        user?.displayName ||
        user?.phoneNumber ||
        user?.email ||
        "User"
      const nameToJoin = `${baseName}-${Math.floor(Math.random() * 10000)}`;
        

    
      socket.emit("join", nameToJoin);

      navigate("/dashboard");
    } catch (err) {
      console.error("Google login error:", err);
    }
  };

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: () => console.log("Recaptcha verified"),
      });
    }
  };

  //Send OTP
  const handlePhoneLogin = async () => {
    setupRecaptcha();
    try {
      const confirmationResult = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
      setConfirmation(confirmationResult);
    } catch (error) {
      console.error("Phone login error:", error);
    }
  };

  //Verify OTP
  const verifyOtp = async () => {
    try {
      await confirmation.confirm(otp);


      const user = auth.currentUser;
      
      const baseName =
       user?.displayName ||
       user?.phoneNumber ||
       user?.email ||
       "User";

      const nameToJoin = `${baseName}-${Math.floor(Math.random() * 10000)}`;



      //Announce join to socket server
      socket.emit("join", nameToJoin);

      navigate("/dashboard");
    } catch (error) {
      console.error("OTP verification failed:", error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-[--color-sky-200] to-[--color-purple-300]">
      <div className="flex flex-col items-center bg-white bg-opacity-70 p-8 rounded-2xl shadow-xl w-96 text-center">
        <h1 className="text-5xl font-extrabold mb-8 text-gray-800 drop-shadow-lg tracking-wide">
  Welcome to <span className="text-blue-600">CollabSpace</span>
</h1>

        {/*Google Login */}
        <button
          onClick={handleGoogleLogin}
          className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-800 px-6 py-3 rounded-lg mb-4 w-full shadow-sm hover:bg-gray-50 transition-all"
        >
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            className="w-5 h-5"
          />
          Continue with Google
        </button>

        <p className="text-gray-500 text-sm mb-3">— or —</p>

        {/*Phone Login */}
        <input
          type="text"
          placeholder="Enter Number : +91 99999 99999"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="border border-gray-300 rounded-md p-2 w-full mb-4 text-center"
        />

        {!confirmation ? (
          <button
            onClick={handlePhoneLogin}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg w-full hover:bg-blue-700 transition-all mt-2"
          >
            Send OTP
          </button>
        ) : (
          <>
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="border border-gray-300 rounded-md p-2 w-full mb-4 text-center"
            />
            <button
              onClick={verifyOtp}
              className="bg-green-600 text-white px-6 py-3 rounded-lg w-full hover:bg-green-700 transition-all"
            >
              Verify OTP
            </button>
          </>
        )}

        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
}

 