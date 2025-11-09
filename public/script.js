const chatBox = document.getElementById("chat-box");
const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

// Send message on click or Enter
sendBtn.onclick = sendMessage;
input.addEventListener("keydown", e => { if (e.key === "Enter") sendMessage(); });

// Add message bubble
function addMessage(sender, text, gifUrl = null) {
  const bubble = document.createElement("div");
  bubble.classList.add("message", sender === "You" ? "user" : "ai");

  // AI or user text
  const textEl = document.createElement("div");
  textEl.textContent = text;
  bubble.appendChild(textEl);

  // GIF if exists
  if (gifUrl) {
    const img = document.createElement("img");
    img.src = gifUrl;
    bubble.appendChild(img);
  }

  chatBox.appendChild(bubble);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Send message
async function sendMessage() {
  const message = input.value.trim();
  if (!message) return;

  addMessage("You", message);
  input.value = "";

  try {
    const res = await fetch("/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });

    const data = await res.json();
    addMessage("JARVIS", data.reply, data.gif);
  } catch (err) {
    addMessage("JARVIS", "⚠️ Error sending request.", null);
  }
}
