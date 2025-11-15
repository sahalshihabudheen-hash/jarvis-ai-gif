function loadMusic() {
  const input = document.getElementById("ytInput").value.trim();
  const player = document.getElementById("ytPlayer");

  if (!input) return;

  // Check if input is a YouTube URL
  const ytRegex = /(youtube\.com|youtu\.be)/i;

  if (ytRegex.test(input)) {
    // Extract video ID
    let videoId = "";

    if (input.includes("youtu.be")) {
      videoId = input.split("youtu.be/")[1].split(/[?&]/)[0];
    } else if (input.includes("v=")) {
      videoId = input.split("v=")[1].split("&")[0];
    }

    player.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    return;
  }

  // Treat input as a search query
  const searchQuery = encodeURIComponent(input);
  player.src = `https://www.youtube.com/embed?listType=search&list=${searchQuery}`;
}
