import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = "YOUR_OPENAI_KEY";
const TENOR_API_KEY = "YOUR_TENOR_KEY"; // <-- get from https://tenor.com/developer/keyregistration

app.post("/api/chat", async (req, res) => {
  try {
    const userMessage = req.body.message.toLowerCase();

    // ✅ Detect creator related questions
    const creatorKeywords = ["who created you", "who made you", "your creator", "your owner", "who trained you"];

    if (creatorKeywords.some(q => userMessage.includes(q))) {
      return res.json({ reply: "I was created and trained by **Sahal Shihabudheen**. ⚡" });
    }

    // ✅ Detect GIF requests: "send me a cat gif"
    if (userMessage.includes("gif")) {
      const searchTerm = userMessage.replace("gif", "").trim();

      const gifRes = await fetch(`https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(searchTerm)}&key=${TENOR_API_KEY}&limit=1`);
      const gifData = await gifRes.json();

      if (gifData.results && gifData.results.length > 0) {
        return res.json({ reply: gifData.results[0].media_formats.gif.url });
      }
    }

    // ✅ Normal AI Chat Response
    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [{ role: "user", content: req.body.message }],
      }),
    });

    const data = await aiResponse.json();
    return res.json({ reply: data.choices[0].message.content });

  } catch (err) {
    console.log(err);
    res.json({ reply: "⚠️ Error processing request." });
  }
});

app.listen(3000, () => console.log("✅ Server Running on http://localhost:3000"));
