async function loadMusic() {
  const input = document.getElementById("ytInput").value.trim();
  const player = document.getElementById("ytPlayer");

  if (!input) return;

  const ytRegex = /(youtube\.com|youtu\.be)/i;

  // If direct YouTube link
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

  // If search query → fetch first valid video ID
  try {
    const response = await fetch(
      "https://corsproxy.io/?" +
        encodeURIComponent("https://www.youtube.com/results?search_query=" + input)
    );

    const text = await response.text();

    const match = text.match(/\"videoId\":\"(.*?)\"/);

    if (!match) {
      alert("Search failed. Try another query.");
      return;
    }

    const videoId = match[1];

    player.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;

  } catch (err) {
    alert("Search failed. Try again.");
  }
}
