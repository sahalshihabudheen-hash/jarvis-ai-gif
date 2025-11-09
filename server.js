import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

async function getGif(query){
  const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=LIVDSRZULELA&limit=1`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.results?.[0]?.media_formats?.gif?.url || null;
  } catch {
    return null;
  }
}

app.post("/api/chat", async (req,res)=>{
  const msg = (req.body.message || "").toLowerCase();
  let reply = "";
  let gif = "";

  if(msg.includes("developer")){
    reply = "My developer is Sahal Shihabudheen ✅";
    gif = await getGif("developer");
  } else if(msg.includes("api")){
    reply = "No API — fully trained by Sahal 😎";
    gif = await getGif("programmer");
  } else {
    reply = "JARVIS says: Here’s something fun!";
    gif = await getGif(msg || "funny");
  }

  res.json({ reply, gif });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));
