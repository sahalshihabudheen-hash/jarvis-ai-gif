const chatBox = document.getElementById("chat-box");
const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

sendBtn.onclick = sendMessage;
input.addEventListener("keyup", e => { if (e.key === "Enter") sendMessage(); });

function sendMessage() {
  const msg = input.value.trim();
  if (!msg) return;

  addMessage("You", msg, "user");
  input.value = "";

  fetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: msg })
  })
  .then(res => res.json())
  .then(data => addMessage("JARVIS", data.reply, "bot"));
}

function addMessage(sender, text, cls) {
  const div = document.createElement("div");
  div.className = `message ${cls}`;
  div.innerHTML = `<strong>${sender}:</strong> ${text}`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}
