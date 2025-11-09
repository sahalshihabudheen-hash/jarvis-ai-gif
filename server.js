import express from "express";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());
app.use(express.static("public"));

// Handle chat messages
app.post("/ask", (req, res) => {
  const question = req.body.message;
  if (!question) return res.json({ reply: "Say something.", gif: null });

  const msg = question.toLowerCase(); // normalize for flexible matching
  let reply = "";
  let gifUrl = null; // optional GIF logic later

  // === Custom replies ===
  if (msg.includes("creator") || msg.includes("created you")) {
    reply = "My creator is SAHAL_PRO";
  } else if (msg.includes("api")) {
    reply = "No API, fully developed by SAHAL_PRO";
  } else {
    reply = "I am here to chat with you!";
  }
  // =====================

  res.json({ reply, gif: gifUrl });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ JARVIS Running on port ${PORT}`));
