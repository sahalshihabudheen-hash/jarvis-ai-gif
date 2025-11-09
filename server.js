const express = require("express");
const axios = require("axios");
const app = express();

app.use(express.json());
app.use(express.static("public"));

app.post("/chat", async (req, res) => {
  const userMsg = req.body.message;
  try {
    const aiRes = await axios.post("https://api.groq.com/openai/v1/chat/completions", {
      model: "llama3-8b-8192",
      messages: [{ role: "user", content: userMsg }]
    }, {
      headers: { Authorization: `Bearer ${process.env.GORQ_API_KEY}` }
    });

    const textReply = aiRes.data.choices[0].message.content;

    const gifRes = await axios.get(`https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(userMsg)}&key=${process.env.TENOR_API_KEY}&limit=1`);
    const gif = gifRes.data.results?.[0]?.media_formats?.gif?.url || "";

    res.json({ reply: `${textReply}<br><img src="${gif}" width="200">` });

  } catch (err) {
    res.json({ reply: "⚠️ Error processing request." });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("✅ JARVIS WEB SERVER RUNNING"));
