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

  let reply = "";
  let gifUrl = null; // Optional: Add GIF logic later

  // === Custom replies ===
  if (/who is your creator/i.test(question) || /who created you/i.test(question)) {
    reply = "My creator is SAHAL_PRO";
  } else if (/which api/i.test(question)) {
    reply = "No API, fully developed by SAHAL_PRO";
  } else {
    // Default generic response
    reply = "I am here to chat with you!";
  }
  // =====================

  res.json({ reply, gif: gifUrl });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ JARVIS Running on port ${PORT}`));
