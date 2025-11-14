const chatBox = document.getElementById("chat-box");
const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

// ====== JARVIS Name Login Box Feature ======
let userName = localStorage.getItem('jarvisName');
const nameBox = document.createElement('div');
nameBox.id = 'nameBox';
nameBox.style = "position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); display:flex; justify-content:center; align-items:center; z-index:1000;";

const nameContent = document.createElement('div');
nameContent.style = "background: linear-gradient(135deg, #0ff, #f0f, #ff0); padding:30px; border-radius:12px; text-align:center; color:white; box-shadow:0 0 20px rgba(0,255,255,0.4);";
nameContent.innerHTML = `
  <h2>Hi! What should JARVIS call you?</h2>
  <input id="nameInput" type="text" placeholder="Enter your name" style="padding:10px; width:200px; border-radius:6px; border:none; margin-top:10px;">
  <br>
  <button id="nameSubmit" style="margin-top:15px; padding:8px 20px; border:none; border-radius:6px; background:#00b3ff; color:white; cursor:pointer;">Submit</button>
`;
nameBox.appendChild(nameContent);
document.body.appendChild(nameBox);

const nameInput = document.getElementById('nameInput');
const nameSubmit = document.getElementById('nameSubmit');

if (userName) {
  nameBox.style.display = 'none';
} else {
  nameBox.style.display = 'flex';
}

// Submit button click or Enter key
nameSubmit.addEventListener('click', () => {
  const name = nameInput.value.trim();
  if (name) {
    userName = name;
    localStorage.setItem('jarvisName', userName);
    nameBox.style.display = 'none';
  }
});

nameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') nameSubmit.click();
});

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

  // Include name occasionally (~50% chance) only in friendly messages
  const includeName = sender === "JARVIS" && userName && Math.random() < 0.5 && !text.startsWith("⚠️") && !text.includes("SAHAL_PRO");
  textEl.textContent = includeName ? `${userName}, ${text}` : text;

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
    customReply = "My creator is SAHAL_PRO 🧠";
  } else if (apiPatterns.some(p => p.test(message))) {
    customReply = "Fully trained by SAHAL_PRO";
  }

  if (customReply) {
    addMessage("JARVIS", customReply, customGif); // always without name
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
    addMessage("JARVIS", data.reply, data.gif); // random name inclusion handled inside addMessage
  } catch (err) {
    addMessage("JARVIS", "⚠️ Error sending request.", null);
  }
}
