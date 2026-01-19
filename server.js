import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import path from "path";
import { fileURLToPath } from "url";

import {
  canUseAI,
  markAIUnavailable,
  isQuotaError
} from "./aiState.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

/* ---------------- Health ---------------- */

app.get("/api/health", (req, res) => {
  res.json({ status: "healthy" });
});

/* ---------------- Gemini Status ---------------- */

app.get("/api/status", (req, res) => {
  res.json({ ai_available: canUseAI() });
});

/* ---------------- Gemini Breakdown ---------------- */

app.post("/api/breakdown", async (req, res) => {
  if (!canUseAI()) {
    return res.status(429).json({ error: "AI_UNAVAILABLE" });
  }

  const { task } = req.body;

const prompt = `
You must output a study plan in EXACTLY the following structure.

Output rules:
- Output plain text only.
- Do not include explanations or extra text.
- Follow the structure exactly as shown in the example.

STRUCTURE EXAMPLE (this is a valid output):

Study Plan Title
# Module One
- Subtask one
- Subtask two
# Module Two
- Subtask one
- Subtask two

STRUCTURE RULES:
- First line: title only (no markdown, no symbols)
- Each module starts with "# Module Name"
- Each module contains only "-" subtasks
- No blank lines inside a module
- No other markdown symbols allowed

Now generate a study plan for the following task:
${task}
`;


  try {
    const result = await model.generateContent(prompt);
    res.json({ text: result.response.text() });
  } catch (err) {
    if (isQuotaError(err)) {
      markAIUnavailable();
      return res.status(429).json({ error: "AI_UNAVAILABLE" });
    }

    console.error(err);
    res.status(500).json({ error: "gemini error" });
  }
});

/* ---------------- Server ---------------- */

app.use(express.static(path.join(__dirname, "Frontend")));

app.listen(3000, () =>
  console.log("Server running on port 3000")
);
