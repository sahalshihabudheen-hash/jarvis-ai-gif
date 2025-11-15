// music.js — Spotify-style UI integration with soundwave

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
let progressInterval = null;

// helper: extract video id from youtube url
function extractVideoId(url) {
  if (!url) return null;
  if (url.includes("youtu.be/")) return url.split("youtu.be/")[1].split(/[?&]/)[0];
  if (url.includes("v=")) return url.split("v=")[1].split("&")[0];
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
  player.src = `https://www.youtube.com/embed/${vid}?autoplay=1&controls=1&rel=0&modestbranding=1`;
  isPlaying = true;

  cover.src = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;

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

  updatePlayButton();
  setProgress(0);
  startProgressSimulation();
}

// play/pause toggle (fixed not restarting)
function togglePlay() {
  const iframe = document.getElementById(PLAYER_IFRAME_ID);
  if (!currentVideoId) return;

  const playerPlaying = isPlaying;
  if (playerPlaying) {
    // pause by hiding iframe temporarily
    iframe.style.display = "none";
    isPlaying = false;
    updatePlayButton();
    stopProgressSimulation();
    stopWaveAnimation();
  } else {
    // resume by showing iframe
    iframe.style.display = "block";
    isPlaying = true;
    updatePlayButton();
    startProgressSimulation();
    startWaveAnimation();
  }
}

// update play button icon
function updatePlayButton() {
  const btn = document.getElementById(PLAY_BTN_ID);
  btn.textContent = isPlaying ? "⏸" : "▶";
}

// visual progress simulation
function setProgress(p) {
  document.getElementById(PROGRESS_FILL_ID).style.width = `${Math.max(0, Math.min(100, p))}%`;
}

// simulated progress
function startProgressSimulation() {
  clearInterval(progressInterval);
  let val = 0;
  progressInterval = setInterval(() => {
    if (!isPlaying) return;
    val += 0.7;
    if (val > 100) val = 0;
    setProgress(val);
  }, 500);
  startWaveAnimation();
}

function stopProgressSimulation() {
  clearInterval(progressInterval);
  stopWaveAnimation();
}

// soundwave effect
let waveInterval = null;
function startWaveAnimation() {
  const fill = document.getElementById(PROGRESS_FILL_ID);
  waveInterval = setInterval(() => {
    if (!isPlaying) return;
    fill.style.height = `${8 + Math.random() * 6}px`;
  }, 150);
}

function stopWaveAnimation() {
  const fill = document.getElementById(PROGRESS_FILL_ID);
  fill.style.height = "8px";
  clearInterval(waveInterval);
}

// load song (search or direct)
async function loadMusic() {
  const raw = document.getElementById(INPUT_ID).value.trim();
  if (!raw) return alert("Type a song name or paste a YouTube link.");

  const isUrl = /(youtube\.com|youtu\.be)/i.test(raw);
  if (isUrl) {
    const vid = extractVideoId(raw);
    if (!vid) return alert("Could not extract video id from link.");
    setVideoById(vid);
    return;
  }

  try {
    const resp = await fetch(`/api/search?q=${encodeURIComponent(raw)}`);
    const data = await resp.json();
    if (!data.videoId) {
      alert("Search failed. Try a different query or paste a link.");
      return;
    }
    setVideoById(data.videoId);
  } catch (err) {
    console.error("Search error:", err);
    alert("Search failed. Try again.");
  }
}

// next song (best effort)
async function playNext() {
  const raw = document.getElementById(INPUT_ID).value.trim();
  if (!raw) return;
  try {
    const resp = await fetch(`/api/search?q=${encodeURIComponent(raw + " official")}`);
    const data = await resp.json();
    if (data.videoId && data.videoId !== currentVideoId) setVideoById(data.videoId);
    else alert("No next track found.");
  } catch (err) {
    console.error("Next error:", err);
    alert("Could not load next track.");
  }
}

// seek forward/back
function seekBy(seconds) {
  if (!currentVideoId) return;
  const iframe = document.getElementById(PLAYER_IFRAME_ID);
  iframe.src = `https://www.youtube.com/embed/${currentVideoId}?start=${Math.max(0, seconds)}&autoplay=1&controls=1&rel=0&modestbranding=1`;
  isPlaying = true;
  updatePlayButton();
}

// DOM events
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById(INPUT_ID);
  const loadBtn = document.getElementById(LOAD_BTN_ID);
  const playBtn = document.getElementById(PLAY_BTN_ID);
  const nextBtn = document.getElementById("nextBtn");
  const prevBtn = document.getElementById("prevBtn");
  const rewBtn = document.getElementById("rewBtn");
  const fwdBtn = document.getElementById("fwdBtn");

  input?.addEventListener("keydown", e => e.key === "Enter" && loadMusic());
  loadBtn?.addEventListener("click", loadMusic);
  playBtn?.addEventListener("click", togglePlay);
  nextBtn?.addEventListener("click", playNext);
  prevBtn?.addEventListener("click", () => alert("Prev not implemented (use playlist)"));
  rewBtn?.addEventListener("click", () => seekBy(0));
  fwdBtn?.addEventListener("click", () => seekBy(60));
});

window.loadMusic = loadMusic;
