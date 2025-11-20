const INPUT_ID = "ytInput";
const LOAD_BTN_ID = "loadBtn";
const PLAYER_IFRAME_ID = "ytPlayer";
const COVER_IMG_ID = "coverImg";
const TITLE_ID = "trackTitle";
const ARTIST_ID = "trackArtist";
const PLAY_BTN_ID = "playBtn";
const PROGRESS_FILL_ID = "progressFill";
const WAVE_CONTAINER_ID = "waveContainer";
const NUM_BARS = 20;

let currentVideoId = null;
let isPlaying = false;
let progressInterval = null;
let waveBars = [];

function extractVideoId(url) {
  if (!url) return null;
  if (url.includes("youtu.be/")) return url.split("youtu.be/")[1].split(/[?&]/)[0];
  if (url.includes("v=")) return url.split("v=")[1].split("&")[0];
  const m = url.match(/\/embed\/([A-Za-z0-9_\-]+)/);
  return m ? m[1] : null;
}

function setVideoById(vid) {
  const player = document.getElementById(PLAYER_IFRAME_ID);
  const cover = document.getElementById(COVER_IMG_ID);
  const titleEl = document.querySelectorAll(`#${TITLE_ID}`);
  const artistEl = document.querySelectorAll(`#${ARTIST_ID}`);

  if (!vid) return;
  currentVideoId = vid;
  player.src = `https://www.youtube.com/embed/${vid}?autoplay=1&controls=1&rel=0&modestbranding=1`;
  isPlaying = true;

  cover.src = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;

  const miniCover = document.getElementById("miniCover");
  if (miniCover) miniCover.src = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;

  fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`)
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      const title = data?.title || "YouTube Video";
      const artist = data?.author_name || "YouTube";
      titleEl.forEach(el => el.textContent = title);
      artistEl.forEach(el => el.textContent = artist);
    }).catch(_ => {
      titleEl.forEach(el => el.textContent = `Video: ${vid}`);
      artistEl.forEach(el => el.textContent = "YouTube");
    });

  updatePlayButton();
  setProgress(0);
  startProgressSimulation();
  startWaveAnimation();
}

function togglePlay() {
  const iframe = document.getElementById(PLAYER_IFRAME_ID);
  if (!currentVideoId) return;
  if (isPlaying) {
    iframe.src = "";
    isPlaying = false;
    updatePlayButton();
    stopProgressSimulation();
    stopWaveAnimation();
  } else {
    iframe.src = `https://www.youtube.com/embed/${currentVideoId}?autoplay=1&controls=1&rel=0&modestbranding=1`;
    isPlaying = true;
    updatePlayButton();
    startProgressSimulation();
    startWaveAnimation();
  }
}

function updatePlayButton() {
  document.getElementById(PLAY_BTN_ID).textContent = isPlaying ? "⏸" : "▶";
}

function setProgress(p) {
  document.getElementById(PROGRESS_FILL_ID).style.width = `${Math.max(0, Math.min(100, p))}%`;
}

function startProgressSimulation() {
  clearInterval(progressInterval);
  let val = 0;
  progressInterval = setInterval(() => {
    if (!isPlaying) return;
    val += 0.7;
    if (val > 100) val = 0;
    setProgress(val);
  }, 500);
}

function stopProgressSimulation() {
  clearInterval(progressInterval);
}

function initWaveBars() {
  const container = document.getElementById(WAVE_CONTAINER_ID);
  container.innerHTML = '';
  waveBars = [];
  for (let i = 0; i < NUM_BARS; i++) {
    const bar = document.createElement('div');
    bar.classList.add('wave-bar');
    bar.style.setProperty('--scale', Math.random());
    container.appendChild(bar);
    waveBars.push(bar);
  }
}

function startWaveAnimation() {
  waveBars.forEach(bar => bar.style.animationPlayState = "running");
}

function stopWaveAnimation() {
  waveBars.forEach(bar => bar.style.animationPlayState = "paused");
}

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
    if (!data.videoId) return alert("Search failed. Try a different query or paste a link.");
    setVideoById(data.videoId);
  } catch (err) {
    console.error(err);
    alert("Search failed. Try again.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initWaveBars();

  document.getElementById(LOAD_BTN_ID).addEventListener("click", loadMusic);
  document.getElementById(PLAY_BTN_ID).addEventListener("click", togglePlay);

  const songCards = document.querySelectorAll('.song-card');
  songCards.forEach(card => {
    card.addEventListener('click', () => {
      const vid = card.dataset.id;
      const title = card.dataset.title;
      const artist = card.dataset.artist;
      setVideoById(vid);
    });
  });

  document.getElementById("nextBtn").addEventListener("click", () => alert("Next not implemented"));
  document.getElementById("prevBtn").addEventListener("click", () => alert("Prev not implemented"));
  document.getElementById("rewBtn").addEventListener("click", () => alert("Rewind not precise in iframe"));
  document.getElementById("fwdBtn").addEventListener("click", () => alert("Forward not precise in iframe"));

  document.getElementById(INPUT_ID).addEventListener("keydown", e => {
    if (e.key === "Enter") loadMusic();
  });
});

window.loadMusic = loadMusic;
