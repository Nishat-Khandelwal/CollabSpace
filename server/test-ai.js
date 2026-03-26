const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: "AIzaSyB8j6hrF4YRG3cr7DCazJpDpAaU1NHJfcA" });

async function test() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "say hi",
    });
    console.log("Response text property:", response.text);
    console.log("Response text function?", typeof response.text === "function");
  } catch (err) {
    console.error("error", err);
  }
}
test();
