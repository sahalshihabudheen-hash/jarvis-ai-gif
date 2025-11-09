const chatBox = document.getElementById("chat-box");
const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

// Event listeners
sendBtn.onclick = sendMessage;
input.addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});

// Add message to chat
function addMessage(sender, text, isGif = false) {
  const bubble = document.createElement("div");
  bubble.classList.add("message");
  bubble.classList.add(sender === "You" ? "user" : "ai");

  if (isGif) {
    const img = document.createElement("img");
    img.src = text;
    bubble.appendChild(img);
  } else {
    bubble.textContent = text;
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

  // Send message to backend
  const res = await fetch("/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });

  const data = await res.json();

  // If AI wants to send GIF
  if (data.gif) {
    addMessage("JARVIS", data.gif, true); // display GIF
  } else {
    addMessage("JARVIS", data.reply);
  }
}
