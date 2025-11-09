import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Your Keys
const GORQ_API_KEY = process.env.GORQ_API_KEY || "YOUR_GORQ_KEY";
const TENOR_API_KEY = process.env.TENOR_API_KEY || "YOUR_TENOR_KEY";

// ✅ Chat Route
app.post("/api/chat", async (req, res) => {
  try {
    const userMessage = (req.body.message || "").toLowerCase();

    // ✅ Creator info detection
    const creatorKeywords = [
      "who created you",
      "who made you",
      "your creator",
      "your owner",
      "who trained you"
    ];

    if (creatorKeywords.some(word => userMessage.includes(word))) {
      return res.json({ reply: "I was created by **Sahal Shihabudheen** ⚡." });
    }

    // ✅ GIF Request Detection
    if (userMessage.includes("gif")) {
      const searchTerm = userMessage.replace("gif", "").trim();
      const gifRes = await fetch(
        `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(searchTerm)}&key=${TENOR_API_KEY}&limit=1`
      );
      const gifData = await gifRes.json();

      if (gifData.results?.length > 0) {
        return res.json({ reply: gifData.results[0].media_formats.gif.url });
      }
    }

    // ✅ GORQ Chat API
    const gorqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GORQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.2-90b-vision-preview",
        messages: [{ role: "user", content: req.body.message }],
      }),
    });

    const data = await gorqResponse.json();
    const reply = data?.choices?.[0]?.message?.content || "⚠️ No reply received.";

    return res.json({ reply });

  } catch (err) {
    console.log("Server Error:", err);
    return res.json({ reply: "⚠️ Server Error. Try again later." });
  }
});

// ✅ Port fix for Render (MUST!)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server Running on http://localhost:${PORT}`));
