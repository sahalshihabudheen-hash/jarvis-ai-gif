const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const chatBox = document.getElementById("chat-box");

async function sendMessage() {
  const message = input.value.trim();
  if (!message) return;

  appendMessage("You", message);
  input.value = "";

  const res = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });

  const data = await res.json();
  const reply = data.reply;

  // ✅ If reply is a GIF URL, show image
  if (reply.includes("http") && reply.includes("gif")) {
    appendGIF("JARVIS", reply);
  } else {
    appendMessage("JARVIS", reply);
  }
}

function appendMessage(sender, text) {
  chatBox.innerHTML += `<p><b>${sender}:</b> ${text}</p>`;
  chatBox.scrollTop = chatBox.scrollHeight;
}

function appendGIF(sender, url) {
  chatBox.innerHTML += `<p><b>${sender}:</b><br><img src="${url}" class="gif"></p>`;
  chatBox.scrollTop = chatBox.scrollHeight;
}

sendBtn.onclick = sendMessage;
input.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); });
