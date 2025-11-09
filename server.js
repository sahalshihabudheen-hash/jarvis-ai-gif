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
    // Hardcoded custom responses
    let aiReply;
    if (/who created you/i.test(question)) {
      aiReply = "I was fully trained by Sahal Shihabudheen 🤖";
    } else if (/hello|hi/i.test(question)) {
      aiReply = "Hello! How can I assist you today?";
    } else {
      // Call GORQ API for general AI text
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: question }]
        },
        { headers: { Authorization: `Bearer ${process.env.GROQ_API}` } }
      );
      aiReply = response.data.choices[0].message.content;
    }

    // Tenor GIF search based on question or AI reply
    const searchQuery = question; // you can also use aiReply for variety
    let gifUrl = null;
    try {
      const tenorRes = await axios.get("https://g.tenor.com/v1/search", {
        params: { q: searchQuery, key: process.env.TENOR_API, limit: 1 }
      });
      gifUrl = tenorRes.data.results?.[0]?.media?.[0]?.gif?.url || null;
    } catch (gifErr) {
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
