import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import { GoogleGenerativeAI } from "@google/generative-ai"
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express()
app.use(cors())
app.use(express.json())

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "Frontend")));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({model: "gemini-2.5-flash-lite"});

app.get("/api/health", (req, res) => {
    res.json({status : "healthy"})
})


app.post("/api/breakdown", async (req, res) => {
    const { task } = req.body;
    const prompt = `
You are formatting a study plan.

STRICT FORMAT RULES (NO EXCEPTIONS):
1. First line: ONLY the title of the entire study plan.
   - No markdown symbols.
   - No extra text.

2. Use ONLY these markdown symbols:
   - '#' for module headings
   - '-' for subtasks

3. DO NOT use:
   - '##', '###', or any other heading levels
   - paragraphs
   - explanations
   - blank lines between subtasks
   - any text outside the defined structure

4. Each module MUST be:
   # Module Name
   - Subtask
   - Subtask

5. Subtopics MUST be converted into subtasks (NOT headings).

Task:
${task}
`;


    try{
        const result = await model.generateContent(prompt)
        res.json({text : result.response.text()})
    } catch (err){
        res.status(500).json({error: "gemini error"})
    }

})

app.listen(3000, ()=> console.log("Server running on port 3000"))