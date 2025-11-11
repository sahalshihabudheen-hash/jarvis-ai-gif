import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(express.json());

// ====== Path Fix for Serving HTML Files ======
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve everything inside "public"
app.use(express.static(path.join(__dirname, "public")));

// ====== PAGE ROUTES ======
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/about", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "about.html"));
});

app.get("/music", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "music.html"));
});

// ====== CHAT AI + GIF ENDPOINT ======
let conversationMemory = [];

app.post("/ask", async (req, res) => {
  const question = req.body.message;
  if (!question) return res.json({ reply: "Say something.", gif: null });

  try {
    let aiReply;

    conversationMemory.push({ role: "user", content: question });

    // Custom replies
    if (/who created you/i.test(question) || /who is your creator/i.test(question)) {
      aiReply = "My creator is SAHAL_PRO 🧠";
    } else if (/who is your developer/i.test(question)) {
      aiReply = "Fully developed by SAHAL_PRO";
    } else if (/which api/i.test(question)) {
      aiReply = "No API, fully self trained by SAHAL_PRO";
    } else {
      // GORQ API normal chat
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama-3.1-8b-instant",
          messages: conversationMemory
        },
        { headers: { Authorization: `Bearer ${process.env.GROQ_API}` } }
      );

      aiReply = response.data.choices[0]?.message?.content || "Hmm, I don't know 🤔";
    }

    conversationMemory.push({ role: "assistant", content: aiReply });

    // Tenor GIF
    let gifUrl = null;
    try {
      const tenorRes = await axios.get("https://g.tenor.com/v1/search", {
        params: {
          q: question,
          key: process.env.TENOR_API,
          limit: 1
        }
      });
      gifUrl = tenorRes.data.results?.[0]?.media?.[0]?.gif?.url || null;
    } catch {
      gifUrl = null;
    }

    res.json({ reply: aiReply, gif: gifUrl });
  } catch (err) {
    console.error(err);
    res.json({ reply: "⚠️ Error processing request.", gif: null });
  }
});

// ====== FREEPIK IMAGE GENERATION ENDPOINT ======
app.post("/generate-image", async (req, res) => {
  const prompt = req.body.prompt;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    const response = await axios.post(
      "https://api.freepik.com/v1/images/generate",
      { prompt: prompt, size: "512x512", n: 1 }, // adjust based on Freepik API docs
      { headers: { Authorization: `Bearer ${process.env.FREEPIK_API}` } }
    );

    // Adjust based on actual response structure from Freepik
    const imageURL = response.data.data?.[0]?.url || null;

    if (!imageURL) return res.status(500).json({ error: "Failed to generate image" });

    res.json({ imageURL });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Error generating image" });
  }
});

// ====== START SERVER ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ JARVIS Running on port ${PORT}`));
