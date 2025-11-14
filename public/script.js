const chatBox = document.getElementById("chat-box");
const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

// Get or ask for user's name
let userName = localStorage.getItem('jarvisName');
if (!userName) {
  userName = prompt("Hi! What should JARVIS call you?");
  localStorage.setItem('jarvisName', userName);
}

// Send message on button click or Enter key
sendBtn.onclick = sendMessage;
input.addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});

// Function to add a message bubble with animation
function addMessage(sender, text, gifUrl = null) {
  const bubble = document.createElement("div");
  bubble.classList.add("message", sender === "You" ? "user" : "ai");

  const textEl = document.createElement("div");
  if(sender === "JARVIS") {
    textEl.textContent = `${userName}: ${text}`;
  } else {
    textEl.textContent = text;
  }
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

  // Floating/scale animation
  bubble.style.transform = "scale(0.9)";
  bubble.style.opacity = "0";
  bubble.style.transition = "transform 0.3s ease, opacity 0.3s ease";
  chatBox.appendChild(bubble);
  chatBox.scrollTop = chatBox.scrollHeight;

  setTimeout(() => {
    bubble.style.transform = "scale(1)";
    bubble.style.opacity = "1";
  }, 10);
}

// Send message
async function sendMessage() {
  const message = input.value.trim();
  if (!message) return;

  addMessage("You", message);
  input.value = "";

  // Custom responses first
  let customReply = null;
  let customGif = null;

  // Multiple patterns for creator/developer
  const creatorPatterns = [/who is your creator/i, /who is your developer/i, /who made you/i];
  const apiPatterns = [/which api/i, /which ai/i, /what api/i];

  if (creatorPatterns.some(p => p.test(message))) {
    customReply = "My creator is SAHAL_PRO ðŸ¤–";
  } else if (apiPatterns.some(p => p.test(message))) {
    customReply = "Fully trained by SAHAL_PRO";
  }

  if (customReply) {
    addMessage("JARVIS", customReply, customGif);
    return; // skip backend call
  }

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
    addMessage("JARVIS", "âš ï¸ Error sending request.", null);
  }
}
