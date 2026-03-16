// src/Login.jsx

import { useState } from "react";
import { auth, googleProvider, db, RecaptchaVerifier, signInWithPhoneNumber } from "./firebase";
import { signInWithPopup } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { CardBody, CardContainer, CardItem } from "./components/ui/3d-card";
import FloatingTools from "./components/FloatingTools";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const navigate = useNavigate();

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
          size: "invisible",
          callback: () => console.log("reCAPTCHA solved"),
        }
      );
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      await setDoc(doc(db, "users", user.uid), {
        name: user.displayName,
        email: user.email,
        uid: user.uid,
        photoURL: user.photoURL,
        provider: "google",
      });

      navigate("/dashboard");
    } catch (error) {
      console.error(error);
    }
  };

  const handlePhoneLogin = async () => {
    setupRecaptcha();

    try {
      const confirmation = await signInWithPhoneNumber(
        auth,
        phone,
        window.recaptchaVerifier
      );

      setConfirmationResult(confirmation);
    } catch (error) {
      console.error("SMS not sent:", error);
    }
  };

  const verifyOtp = async () => {
    try {
      const result = await confirmationResult.confirm(otp);
      const user = result.user;

      await setDoc(doc(db, "users", user.uid), {
        phone: user.phoneNumber,
        uid: user.uid,
        provider: "phone",
      });

      navigate("/dashboard");
    } catch (error) {
      console.error("Invalid OTP", error);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-500">
      
      <CardContainer containerClassName="w-full h-screen flex items-center justify-center">
        <CardBody className="bg-white text-gray-800 p-8 rounded-2xl shadow-2xl w-96 transform-3d">

          <CardItem translateZ="50">
            <h1 className="text-3xl font-extrabold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
              Welcome to CollabSpace
            </h1>
          </CardItem>

          <CardItem translateZ="60" className="w-full">
            <button
              onClick={handleGoogleLogin}
              className="bg-red-500 hover:bg-red-600 text-white w-full py-2 rounded-lg font-semibold mb-4 transition-all duration-300"
            >
              Continue with Google
            </button>
          </CardItem>

          <CardItem translateZ="40">
            <div className="flex items-center justify-center my-4">
              <div className="h-px bg-gray-300 w-1/3" />
              <p className="text-gray-400 mx-2 text-sm">or</p>
              <div className="h-px bg-gray-300 w-1/3" />
            </div>
          </CardItem>

          <CardItem translateZ="50" className="w-full">
            <input
              type="text"
              placeholder="+91 99999 99999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </CardItem>

          {!confirmationResult ? (
            <CardItem translateZ="60" className="w-full">
              <button
                onClick={handlePhoneLogin}
                className="bg-green-500 hover:bg-green-600 text-white w-full py-2 rounded-lg font-semibold transition-all duration-300"
              >
                Send OTP
              </button>
            </CardItem>
          ) : (
            <>
              <CardItem translateZ="50" className="w-full">
                <input
                  type="text"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </CardItem>

              <CardItem translateZ="60" className="w-full">
                <button
                  onClick={verifyOtp}
                  className="bg-blue-600 hover:bg-blue-700 text-white w-full py-2 rounded-lg font-semibold transition-all duration-300"
                >
                  Verify OTP
                </button>
              </CardItem>
            </>
          )}

        </CardBody>
      </CardContainer>

      <div id="recaptcha-container"></div>
    </div>
  );
}

