function loadMusic() {
  const input = document.getElementById("ytInput").value.trim();
  const player = document.getElementById("ytPlayer");

  if (!input) return;

  const ytRegex = /(youtube\.com|youtu\.be)/i;

  // Direct YouTube URL
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

  // Auto-expand weak/blocked searches (like "faded")
  let search = input;

  // If only 1 word → expand the query
  if (input.split(" ").length === 1) {
    search = `${input} official music video audio`;
  }

  // Special case: if they type "faded"
  if (input.toLowerCase() === "faded") {
    search = "alan walker faded official music video";
  }

  const searchQuery = encodeURIComponent(search);

  player.src = `https://www.youtube.com/embed?autoplay=1&listType=search&list=${searchQuery}`;
}
