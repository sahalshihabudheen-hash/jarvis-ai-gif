// music.js — Spotify-style UI integration
// Uses your server /api/search for queries and supports direct YouTube links

const INPUT_ID = "ytInput";
const LOAD_BTN_ID = "loadBtn";
const PLAYER_IFRAME_ID = "ytPlayer";
const COVER_IMG_ID = "coverImg";
const TITLE_ID = "trackTitle";
const ARTIST_ID = "trackArtist";
const PLAY_BTN_ID = "playBtn";
const PROGRESS_FILL_ID = "progressFill";

let currentVideoId = null;
let isPlaying = false;

// helper: extract video id from youtube url
function extractVideoId(url) {
  if (!url) return null;
  if (url.includes("youtu.be/")) {
    return url.split("youtu.be/")[1].split(/[?&]/)[0];
  }
  if (url.includes("v=")) {
    return url.split("v=")[1].split("&")[0];
  }
  const m = url.match(/\/embed\/([A-Za-z0-9_\-]+)/);
  return m ? m[1] : null;
}

// play a video id
function setVideoById(vid) {
  const player = document.getElementById(PLAYER_IFRAME_ID);
  const cover = document.getElementById(COVER_IMG_ID);
  const titleEl = document.getElementById(TITLE_ID);
  const artistEl = document.getElementById(ARTIST_ID);

  if (!vid) return;

  currentVideoId = vid;
  // set iframe
  player.src = `https://www.youtube.com/embed/${vid}?autoplay=1&controls=1&rel=0&modestbranding=1`;
  isPlaying = true;
  // update cover art (fallback to hqdefault)
  cover.src = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
  // try to fill title/artist via oembed (best-effort)
  fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`)
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data) {
        titleEl.textContent = data.title || "YouTube Video";
        artistEl.textContent = data.author_name || "YouTube";
      } else {
        titleEl.textContent = `Video: ${vid}`;
        artistEl.textContent = "YouTube";
      }
    })
    .catch(_ => {
      titleEl.textContent = `Video: ${vid}`;
      artistEl.textContent = "YouTube";
    });

  // update play button icon
  updatePlayButton();
  // reset progress bar (we don't have precise progress because iframe doesn't expose playback; visual only)
  setProgress(0);
}

// Update play/pause button UI
function updatePlayButton() {
  const btn = document.getElementById(PLAY_BTN_ID);
  btn.textContent = isPlaying ? "⏸" : "▶";
}

// visual progress (simulated while playing)
let progressInterval = null;
function setProgress(p) {
  document.getElementById(PROGRESS_FILL_ID).style.width = `${Math.max(0, Math.min(100, p))}%`;
}
function startProgressSimulation() {
  clearInterval(progressInterval);
  let val = 0;
  progressInterval = setInterval(() => {
    if (!isPlaying) return;
    val += 0.7; // simulation speed
    if (val > 100) val = 0;
    setProgress(val);
  }, 500);
}
function stopProgressSimulation() {
  clearInterval(progressInterval);
}

// main load function (search or direct link)
async function loadMusic() {
  const raw = document.getElementById(INPUT_ID).value.trim();
  if (!raw) return alert("Type a song name or paste a YouTube link.");

  const iframe = document.getElementById(PLAYER_IFRAME_ID);

  // direct link?
  const isUrl = /(youtube\.com|youtu\.be)/i.test(raw);
  if (isUrl) {
    const vid = extractVideoId(raw);
    if (!vid) return alert("Could not extract video id from link.");
    setVideoById(vid);
    startProgressSimulation();
    return;
  }

  // treat as search -> call server API you already have
  try {
    const resp = await fetch(`/api/search?q=${encodeURIComponent(raw)}`);
    const data = await resp.json();
    if (!data.videoId) {
      alert("Search failed. Try a different query or paste a link.");
      return;
    }
    setVideoById(data.videoId);
    startProgressSimulation();
  } catch (err) {
    console.error("Search error:", err);
    alert("Search failed. Try again.");
  }
}

// play/pause toggle (since iframe is used, we toggle playback by reloading with autoplay param or stopping)
function togglePlay() {
  const iframe = document.getElementById(PLAYER_IFRAME_ID);
  if (!currentVideoId) return;
  if (isPlaying) {
    // pause: replace src with empty then set flag (keeps cover)
    iframe.src = "";
    isPlaying = false;
    updatePlayButton();
    stopProgressSimulation();
  } else {
    // resume: reload iframe
    iframe.src = `https://www.youtube.com/embed/${currentVideoId}?autoplay=1&controls=1&rel=0&modestbranding=1`;
    isPlaying = true;
    updatePlayButton();
    startProgressSimulation();
  }
}

// Next: try to get the next video from youtube search results (best-effort)
// This calls the same server route but asks for the next result if available.
// For simplicity we attempt one additional fetch with an appended "official" hint.
async function playNext() {
  const raw = document.getElementById(INPUT_ID).value.trim();
  if (!raw) return;
  try {
    // try slightly modified query for next result
    const resp = await fetch(`/api/search?q=${encodeURIComponent(raw + " official")}`);
    const data = await resp.json();
    if (data.videoId && data.videoId !== currentVideoId) {
      setVideoById(data.videoId);
    } else {
      alert("No next track found.");
    }
  } catch (err) {
    console.error("Next error:", err);
    alert("Could not load next track.");
  }
}

// Rewind / Forward: since iframe is sandboxed, we can't access player API without additional lib.
// We'll provide a rough UX: reload with start time param for forward/rewind (note: not precise).
function seekBy(seconds) {
  if (!currentVideoId) return;
  // Use start time param (start=)
  // Not perfect since we don't know current time; this is a simple UX helper.
  const iframe = document.getElementById(PLAYER_IFRAME_ID);
  // attempt to jump to seconds
  iframe.src = `https://www.youtube.com/embed/${currentVideoId}?start=${Math.max(0, seconds)}&autoplay=1&controls=1&rel=0&modestbranding=1`;
  isPlaying = true;
  updatePlayButton();
}

// hookup events once DOM loaded
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById(INPUT_ID);
  const loadBtn = document.getElementById(LOAD_BTN_ID);
  const playBtn = document.getElementById(PLAY_BTN_ID);
  const nextBtn = document.getElementById("nextBtn");
  const prevBtn = document.getElementById("prevBtn");
  const rewBtn = document.getElementById("rewBtn");
  const fwdBtn = document.getElementById("fwdBtn");

  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") loadMusic();
    });
  }
  if (loadBtn) loadBtn.addEventListener("click", loadMusic);
  if (playBtn) playBtn.addEventListener("click", togglePlay);
  if (nextBtn) nextBtn.addEventListener("click", playNext);
  if (prevBtn) prevBtn.addEventListener("click", () => alert("Prev not implemented (use playlist)"));
  if (rewBtn) rewBtn.addEventListener("click", () => {
    // rough rewind: start at 0
    seekBy( Math.max(0, 0) );
  });
  if (fwdBtn) fwdBtn.addEventListener("click", () => {
    // rough forward: jump to 60s
    seekBy(60);
  });
});

// expose loadMusic as global (HTML uses onclick in some versions)
window.loadMusic = loadMusic;
