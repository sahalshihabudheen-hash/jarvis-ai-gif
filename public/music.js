async function loadMusic() {
  const input = document.getElementById("ytInput").value.trim();
  const player = document.getElementById("ytPlayer");

  if (!input) return;

  const ytRegex = /(youtube\.com|youtu\.be)/i;

  // If direct link
  if (ytRegex.test(input)) {
    let videoId = "";

    if (input.includes("youtu.be")) {
      videoId = input.split("youtu.be/")[1].split(/[?&]/)[0];
    } else if (input.includes("v=")) {
      videoId = input.split("v=")[1].split("&")[0];
    }

    player.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    return;
  }

  // Search via your server
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(input)}`);
    const data = await res.json();

    if (!data.videoId) {
      alert("Search failed. Try again.");
      return;
    }

    player.src = `https://www.youtube.com/embed/${data.videoId}?autoplay=1`;
  } catch (err) {
    alert("Search failed. Try again.");
  }
}
