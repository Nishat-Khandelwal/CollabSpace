require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function testAskAi() {
  try {
    const history = [];
    const prompt = "Draw red circle";

    const systemInstruction = `You are an intelligent AI assistant in a collaborative whiteboard app. Your goal is to interpret the user's prompt and modify their whiteboard accordingly.
The whiteboard supports freehand drawings (type="path"), shapes (type="shape", shape="rectangle"|"circle"|"triangle"|"star"), and text boxes (type="text").
Each item on the whiteboard has a unique 'id', 'color', 'size', and positioning ('w', 'h', 'startPos' etc). Check 'history' given below.

Here is the current whiteboard state (JSON array):
${JSON.stringify(history)}

The user will provide a prompt (e.g., "draw a red circle", "delete the star", "make the blue square big"). Determine their intent. If they are asking a regular question, answer it in 'message' and return empty 'actions'.
If they want to change the whiteboard, return a structured list of commands in 'actions'. 
You MUST return STRICTLY a SINGLE JSON object, NO markdown, NO text outside the JSON. Schema:
{
  "message": "<Conversational response summarizing what you did or answering a question>",
  "actions": [
    { "action": "delete", "id": "<id_of_existing_item>" },
    { "action": "update", "id": "<id_of_existing_item>", "changes": { "color": "red" } },
    { "action": "drawShape", "item": { "type": "shape", "shape": "circle", "startPos": { "x": 500, "y": 300 }, "w": 200, "h": 200, "color": "red", "size": 3, "tool": "brush", "id": "gen_uuid_1" } },
    { "action": "drawText", "item": { "type": "text", "text": "Hello User!", "x": 500, "y": 300, "maxWidth": 200, "lineHeight": 24, "color": "black", "fontSize": 20, "id": "gen_uuid_2" } },
    { "action": "clear" }
  ]
}

When drawing new things, invent realistic visual parameters around the center (x: 500, y: 300). Strongly invent unique random UUIDs for 'id'.
When updating or deleting, FIND the 'id' of the element in the history matching the requested color or shape.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      }
    });

    const responseText = response.text;
    console.log("Response:", responseText);

    let parsed = JSON.parse(responseText);
    console.log("Parsed JSON:", parsed);

  } catch (err) {
    console.error("AI Generation error:", err);
  }
}
testAskAi();
