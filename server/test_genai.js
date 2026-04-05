const fs = require("fs");
try {
  require('dotenv').config();
  const { GoogleGenAI } = require('@google/genai');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  ai.models.generateContent({ model: 'gemini-2.5-flash', contents: 'Hello' })
    .then(res => fs.writeFileSync("out.txt", "SUCCESS: " + res.text))
    .catch(err => fs.writeFileSync("out.txt", "ERROR1: " + (err.stack || err.toString())));
} catch (err) {
  fs.writeFileSync("out.txt", "ERROR2: " + (err.stack || err.toString()));
}
