import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Runware } from "@runware/sdk-js"; // ✅ Correct import
import Replicate from "replicate";

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

// ⭐ FIX: Make ALL HTML pages inside public work (bots.html, image.html, etc)
app.get("/:page", (req, res) => {
  res.sendFile(path.join(__dirname, "public", req.params.page));
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
      // GROQ API normal chat
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama-3.1-8b-instant",
          messages: conversationMemory,
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
          limit: 1,
        },
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

// ====== RUNWARE IMAGE GENERATION ENDPOINT ======
app.post("/generate-image", async (req, res) => {
  const prompt = req.body.prompt;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    const runware = new Runware({
      apiKey: process.env.RUNWARE_API,
      shouldReconnect: true,
    });

    const images = await runware.requestImages({
      positivePrompt: prompt,
      model: "runware:101@1",
      width: 1024,
      height: 1024,
    });

    const imageURL = images?.[0]?.imageURL || null;
    if (!imageURL) return res.status(500).json({ error: "Failed to generate image" });

    res.json({ imageURL });
  } catch (err) {
    console.error("❌ Image generation error:", err.message);
    res.status(500).json({ error: "Error generating image" });
  }
});

// ====== REPLICATE AI VIDEO GENERATION ENDPOINT ======
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

app.post("/generate-video", async (req, res) => {
  const prompt = req.body.prompt;
  if (!prompt) return res.status(400).json({ error: "Prompt is required" });

  try {
    const output = await replicate.run("wan-video/wan-2.5-t2v-fast", {
      input: { prompt },
    });

    // output is an array, get the first video URL
    const videoURL = output[0]?.url;
    if (!videoURL) return res.status(500).json({ error: "Failed to generate video" });

    res.json({ url: videoURL });
  } catch (err) {
    console.error("❌ Video generation error:", err.message);
    res.status(500).json({ error: "Error generating video" });
  }
});

// ====== START SERVER ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ JARVIS Running on port ${PORT}`));
