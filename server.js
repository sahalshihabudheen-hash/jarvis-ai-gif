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
    // Hardcoded custom replies first
    let aiReply;
    if (/who created you/i.test(question)) {
      aiReply = "I was fully trained by Sahal Shihabudheen ðŸ¤–";
    } else {
      // GORQ API call for general responses
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: question }]
        },
        { headers: { Authorization: `Bearer ${process.env.GROQ_API}` } }
      );
      aiReply = response.data.choices[0]?.message?.content || "Hmm, I don't know ðŸ¤”";
    }

    // Tenor GIF search (optional)
    let gifUrl = null;
    try {
      const tenorRes = await axios.get("https://g.tenor.com/v1/search", {
        params: {
          q: question,           // searching using user message
          key: process.env.TENOR_API,
          limit: 1
        }
      });
      gifUrl = tenorRes.data.results?.[0]?.media?.[0]?.gif?.url || null;
    } catch (gifErr) {
      gifUrl = null; // don't break if GIF fails
    }

    res.json({ reply: aiReply, gif: gifUrl });
  } catch (err) {
    console.error(err);
    res.json({ reply: "âš ï¸ Error processing request.", gif: null });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`âœ… JARVIS Running on port ${PORT}`));
