const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const TENOR_KEY = process.env.TENOR_API_KEY;
const GORQ_KEY = process.env.GORQ_API_KEY;

// ✅ JARVIS AI Respond Route
app.post("/api/message", async (req, res) => {
  try {
    const userMessage = req.body.message;

    // Request AI reply from GORQ
    const aiResponse = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: "You are JARVIS, a futuristic AI trained personally by Sahal." },
          { role: "user", content: userMessage }
        ]
      },
      {
        headers: {
          "Authorization": `Bearer ${GORQ_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const replyText = aiResponse.data.choices[0].message.content;

    // Request GIF from Tenor
    const gifResponse = await axios.get(
      `https://g.tenor.com/v2/search?q=${encodeURIComponent(userMessage)}&key=${TENOR_KEY}&limit=1`
    );

    const gifUrl = gifResponse.data.results[0]?.media_formats?.gif?.url || "";

    res.json({ reply: replyText, gif: gifUrl });

  } catch (err) {
    console.error("ERROR:", err.message);
    res.json({ reply: "⚠️ JARVIS SYSTEM ERROR", gif: "" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ JARVIS Online on port ${PORT}`));
