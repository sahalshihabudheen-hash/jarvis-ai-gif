import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

app.post("/ask", async (req, res) => {
  const userMessage = req.body.message;

  try {
    const response = await fetch("https://api-inference.huggingface.co/models/gpt2", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.HF_TOKEN}` },
      body: JSON.stringify({ inputs: userMessage })
    });
    
    const data = await response.json();
    const reply = data[0].generated_text;

    res.json({ reply });
  } catch (err) {
    res.json({ reply: "⚠️ Error processing request." });
  }
});

app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/public/index.html");
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Server running on port ${port}`));
