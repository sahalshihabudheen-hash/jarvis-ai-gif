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
let player; // YouTube IFrame API player

// Load YouTube IFrame API
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
document.head.appendChild(tag);

// Create player once API is ready
function onYouTubeIframeAPIReady() {
  player = new YT.Player(PLAYER_IFRAME_ID, {
    height: '0',
    width: '0',
    videoId: '',
    playerVars: {
      autoplay: 0,
      controls: 1,
      rel: 0,
      modestbranding: 1
    },
    events: {
      onStateChange: onPlayerStateChange
    }
  });
}

// Detect play/pause
function onPlayerStateChange(event) {
  if(event.data === YT.PlayerState.PLAYING) {
    isPlaying = true;
    updatePlayButton();
    startProgressSimulation();
    startWaveAnimation();
  } else if(event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
    isPlaying = false;
    updatePlayButton();
    stopProgressSimulation();
    stopWaveAnimation();
  }
}

// Helper to extract YouTube video ID
function extractVideoId(url) {
  if (!url) return null;
  if (url.includes("youtu.be/")) return url.split("youtu.be/")[1].split(/[?&]/)[0];
  if (url.includes("v=")) return url.split("v=")[1].split("&")[0];
  const m = url.match(/\/embed\/([A-Za-z0-9_\-]+)/);
  return m ? m[1] : null;
}

// Set video
function setVideoById(vid) {
  const cover = document.getElementById(COVER_IMG_ID);
  const titleEl = document.getElementById(TITLE_ID);
  const artistEl = document.getElementById(ARTIST_ID);

  if (!vid || !player) return;
  currentVideoId = vid;
  player.loadVideoById(vid);
  
  cover.src = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;

  fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`)
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      titleEl.textContent = data?.title || "YouTube Video";
      artistEl.textContent = data?.author_name || "YouTube";
    }).catch(_ => { titleEl.textContent = `Video: ${vid}`; artistEl.textContent = "YouTube"; });

  setProgress(0);
  initWaveBars();
}

// Play/pause toggle
function togglePlay() {
  if (!player || !currentVideoId) return;
  if (isPlaying) {
    player.pauseVideo();
  } else {
    player.playVideo();
  }
}

function updatePlayButton() {
  document.getElementById(PLAY_BTN_ID).textContent = isPlaying ? "⏸" : "▶";
}

// Progress bar simulation
function setProgress(p) { document.getElementById(PROGRESS_FILL_ID).style.width = `${Math.max(0,Math.min(100,p))}%`; }
function startProgressSimulation() {
  clearInterval(progressInterval);
  progressInterval = setInterval(() => {
    if (!isPlaying || !player) return;
    const duration = player.getDuration();
    const current = player.getCurrentTime();
    if(duration) setProgress((current / duration) * 100);
  },500);
}
function stopProgressSimulation() { clearInterval(progressInterval); }

// Soundwave bars
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
function startWaveAnimation() { waveBars.forEach(bar => bar.style.animationPlayState = "running"); }
function stopWaveAnimation() { waveBars.forEach(bar => bar.style.animationPlayState = "paused"); }

// Load music
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
  } catch (err) { console.error(err); alert("Search failed. Try again."); }
}

// DOM ready
document.addEventListener("DOMContentLoaded", () => {
  initWaveBars();
  document.getElementById(LOAD_BTN_ID).addEventListener("click", loadMusic);
  document.getElementById(PLAY_BTN_ID).addEventListener("click", togglePlay);
  document.getElementById("nextBtn").addEventListener("click", () => alert("Next not implemented"));
  document.getElementById("prevBtn").addEventListener("click", () => alert("Prev not implemented"));
  document.getElementById("rewBtn").addEventListener("click", () => alert("Rewind not precise in iframe"));
  document.getElementById("fwdBtn").addEventListener("click", () => alert("Forward not precise in iframe"));
  document.getElementById(INPUT_ID).addEventListener("keydown", e => { if(e.key==="Enter") loadMusic(); });
});

// Expose for HTML
window.loadMusic = loadMusic;
