async function loadMusic() {
  const input = document.getElementById("ytInput").value.trim();
  const player = document.getElementById("ytPlayer");

  if (!input) return;

  // Check if input is a YouTube URL
  const ytRegex = /(youtube\.com|youtu\.be)/i;

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

  // If not URL → treat as SEARCH query
  const query = encodeURIComponent(input);

  try {
    // Free Piped API (no key required)
    const res = await fetch(`https://piped.video/api/v1/search?q=${query}`);

    const results = await res.json();

    if (!results || results.length === 0) {
      alert("No results found!");
      return;
    }

    // Get first video ID
    const videoId = results[0].url.replace("/watch?v=", "");

    player.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  } catch (error) {
    alert("Search failed. Try again.");
  }
}
