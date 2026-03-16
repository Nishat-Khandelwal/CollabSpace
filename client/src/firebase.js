// client/src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBaV6NnWKwue4UBDVU3_cjfVMX5Ud_uw3k",
  authDomain: "whiteboard-chat-app-d6929.firebaseapp.com",
  projectId: "whiteboard-chat-app-d6929",
  storageBucket: "whiteboard-chat-app-d6929.firebasestorage.app",
  messagingSenderId: "91025923195",
  appId: "1:91025923195:web:bf177eeca59bb6660056de",
  measurementId: "G-17CCDX9J0S",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export { app };
