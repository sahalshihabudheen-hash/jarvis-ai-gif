import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());
app.use(express.static("public"));

app.post("/ask", async (req, res) => {
  const question = req.body.message;
  if (!question) return res.json({ reply: "Say something." });

  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: question }]
      },
      { headers: { Authorization: `Bearer ${process.env.GROQ_API}` } }
    );

    res.json({ reply: response.data.choices[0].message.content });
  } catch (err) {
    res.json({ reply: "⚠️ Error processing request." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ JARVIS Running on port ${PORT}`));
