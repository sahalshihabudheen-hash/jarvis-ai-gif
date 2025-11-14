const chatBox = document.getElementById("chat-box");
const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

// ====== JARVIS Name Login Box Feature ======
let userName = localStorage.getItem('jarvisName');
const nameBox = document.createElement('div');
nameBox.id = 'nameBox';
nameBox.style = `
  position: fixed; 
  top:0; left:0; width:100%; height:100%; 
  background: rgba(0,0,0,0.85); 
  display:flex; justify-content:center; align-items:center; z-index:1000;
`;

const nameContent = document.createElement('div');
nameContent.style = `
  background: linear-gradient(135deg, #00b3ff, #a86bff, #ffaa40); 
  padding:40px; border-radius:15px; text-align:center; 
  color:white; font-family:'Segoe UI', sans-serif;
  box-shadow: 0 5px 20px rgba(0,0,0,0.4);
`;
nameContent.innerHTML = `
  <h2 style="margin-bottom:15px;">Hi! What should JARVIS call you?</h2>
  <input id="nameInput" type="text" placeholder="Enter your name" style="padding:10px; width:200px; border-radius:6px; border:none; margin-bottom:15px;">
  <br>
  <button id="nameSubmit" style="padding:8px 20px; border:none; border-radius:6px; background:#fff; color:#333; cursor:pointer;">Submit</button>
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

// ====== Submit Name & Fade Out ======
nameSubmit.addEventListener('click', () => {
  const name = nameInput.value.trim();
  if (name) {
    userName = name;
    localStorage.setItem('jarvisName', userName);

    // Smooth fade-out
    nameBox.style.transition = "opacity 0.5s ease";
    nameBox.style.opacity = "0";
    setTimeout(() => {
      nameBox.style.display = "none";
    }, 500);
  }
});

nameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    nameSubmit.click();
  }
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
  // JARVIS just speaks text; no prepending name
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
    addMessage("JARVIS", "⚠️ Error sending request.", null);
  }
}
