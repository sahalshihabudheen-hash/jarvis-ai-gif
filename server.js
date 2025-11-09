import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());
app.use(express.static("public"));

app.post("/ask", async (req, res) => {
  const question = req.body.message;
  if (!question) return res.json({ reply: "Say something.", gif: null });

  try {
    let aiReply;

    // ===== Custom replies =====
    if (/who created you/i.test(question) || /who is your creator/i.test(question)) {
      aiReply = "My creator is SAHAL_PRO 🧠";
    } else if (/who is your developer/i.test(question)) {
      aiReply = "No API, fully trained by me";
    } else if (/which api/i.test(question)) {
      aiReply = "No API, fully developed by SAHAL_PRO";
    } else {
      // ===== GORQ API call for general responses =====
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: question }]
        },
        { headers: { Authorization: `Bearer ${process.env.GROQ_API}` } }
      );

      aiReply = response.data.choices[0]?.message?.content || "Hmm, I don't know 🤔";
    }

    // ===== Tenor GIF for every message =====
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ JARVIS Running on port ${PORT}`));
