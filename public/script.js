const chatBox = document.getElementById("chat-box");
const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

// Send message on button click or Enter key
sendBtn.onclick = sendMessage;
input.addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});

// Function to add a message bubble
function addMessage(sender, text, gifUrl = null) {
  const bubble = document.createElement("div");
  bubble.classList.add("message", sender === "You" ? "user" : "ai");

  const textEl = document.createElement("div");
  textEl.textContent = text;
  bubble.appendChild(textEl);

  if (gifUrl) {
    const img = document.createElement("img");
    img.src = gifUrl;
    img.style.marginTop = "10px";
    img.style.borderRadius = "12px";
    img.style.maxHeight = "250px";
    img.style.width = "auto";
    bubble.appendChild(img);
  }

  chatBox.appendChild(bubble);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Send message to server or handle custom frontend responses
async function sendMessage() {
  const message = input.value.trim();
  if (!message) return;

  addMessage("You", message);
  input.value = "";

  // === Custom frontend responses ===
  const msg = message.toLowerCase();
  let customReply = null;

  if (msg.includes("creator") || msg.includes("created you")) {
    customReply = "My creator is SAHAL_PRO";
  } else if (msg.includes("api")) {
    customReply = "No API, fully developed by SAHAL_PRO";
  }

  if (customReply) {
    addMessage("JARVIS", customReply);
    return; // Skip server call
  }
  // ========================

  // Send to backend if no custom reply
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
