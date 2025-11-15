// music.js — upgraded: soundwaves, Next Up queue, restart-on-play behavior
// Keeps using your server /api/search and direct YouTube links

const INPUT_ID = "ytInput";
const LOAD_BTN_ID = "loadBtn";
const PLAYER_IFRAME_ID = "ytPlayer";
const COVER_IMG_ID = "coverImg";
const TITLE_ID = "trackTitle";
const ARTIST_ID = "trackArtist";
const PLAY_BTN_ID = "playBtn";
const PROGRESS_BAR_ID = "progressBar";
const PROGRESS_FILL_ID = "progressFill";

let currentVideoId = null;
let isPlaying = false;
let queue = []; // queue of { videoId, title, author }
let waveContainer = null; // will hold soundwave bars

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

// Ensure Next Up UI is present (creates DOM nodes if missing)
function ensureNextUpUI() {
  // nextUp wrapper (placed below progress bar)
  let nextUp = document.getElementById("__next_up_wrapper");
  if (nextUp) return nextUp;

  const playerCard = document.querySelector(".player-card") || document.body;
  nextUp = document.createElement("div");
  nextUp.id = "__next_up_wrapper";
  nextUp.style.marginTop = "10px";
  nextUp.style.display = "flex";
  nextUp.style.flexDirection = "column";
  nextUp.style.gap = "8px";

  // next up text
  const nextText = document.createElement("div");
  nextText.id = "__next_up_text";
  nextText.style.color = "rgba(255,255,255,0.85)";
  nextText.style.fontSize = "14px";
  nextText.style.fontWeight = "600";
  nextText.textContent = "Next Up: (none)";

  // queue list
  const qList = document.createElement("div");
  qList.id = "__queue_list";
  qList.style.display = "flex";
  qList.style.flexDirection = "column";
  qList.style.gap = "6px";

  // soundwaves container (below next up)
  const waves = document.createElement("div");
  waves.id = "__sound_waves";
  waves.style.display = "flex";
  waves.style.gap = "6px";
  waves.style.alignItems = "end";
  waves.style.justifyContent = "center";
  waves.style.height = "48px";
  waves.style.marginTop = "6px";

  nextUp.appendChild(nextText);
  nextUp.appendChild(qList);
  nextUp.appendChild(waves);

  // Insert after progress bar if exists, otherwise at end of meta
  const progress = document.getElementById(PROGRESS_BAR_ID);
  if (progress && progress.parentNode) {
    progress.parentNode.insertBefore(nextUp, progress.nextSibling);
  } else {
    // fallback: append to first .meta element
    const meta = document.querySelector(".meta") || playerCard;
    meta.appendChild(nextUp);
  }

  return nextUp;
}

// build animated soundwaves (bars)
function buildSoundWaves(barCount = 12) {
  const nextUp = ensureNextUpUI();
  const waves = document.getElementById("__sound_waves");
  if (!waves) return;
  waves.innerHTML = ""; // reset

  // CSS animation via style element (only once)
  if (!document.getElementById("__wave_styles")) {
    const style = document.createElement("style");
    style.id = "__wave_styles";
    style.innerHTML = `
      @keyframes waveScale {
        0% { transform: scaleY(0.2); opacity:0.6 }
        50% { transform: scaleY(1.0); opacity:1 }
        100% { transform: scaleY(0.2); opacity:0.6 }
      }
      .__wave_bar {
        width:8px;
        background: linear-gradient(180deg, rgba(255,255,255,0.9), rgba(0,255,180,0.9));
        border-radius:4px;
        transform-origin: bottom center;
        animation-name: waveScale;
        animation-timing-function: ease-in-out;
        animation-iteration-count: infinite;
      }
      .__wave_paused { animation-play-state: paused !important; opacity:0.5; }
    `;
    document.head.appendChild(style);
  }

  for (let i = 0; i < barCount; i++) {
    const bar = document.createElement("div");
    bar.className = "__wave_bar __wave_paused";
    // random base height
    const base = 8 + Math.floor(Math.random() * 36); // px
    bar.style.height = `${base}px`;
    // stagger animation durations & delay for organic effect
    const dur = 800 + Math.floor(Math.random() * 800); // ms
    const delay = Math.floor(Math.random() * 400); // ms
    bar.style.animationDuration = `${dur}ms`;
    bar.style.animationDelay = `${delay}ms`;
    waves.appendChild(bar);
  }

  waveContainer = waves;
}

// control soundwaves animation state
function setWavesPlaying(shouldPlay) {
  if (!waveContainer) buildSoundWaves();
  const bars = document.querySelectorAll("#__sound_waves .__wave_bar");
  bars.forEach((b, i) => {
    if (shouldPlay) {
      b.classList.remove("__wave_paused");
      // slightly vary height while playing
      const min = 12, max = 80;
      const newH = min + Math.floor(Math.random() * (max - min));
      b.style.height = `${newH}px`;
    } else {
      b.classList.add("__wave_paused");
    }
  });
}

// set UI for next up and queue list
function refreshQueueUI() {
  const nextUpWrapper = ensureNextUpUI();
  const nextText = document.getElementById("__next_up_text");
  const qList = document.getElementById("__queue_list");

  if (!nextText || !qList) return;
  if (queue.length === 0) {
    nextText.textContent = "Next Up: (none)";
    qList.innerHTML = "";
    return;
  }

  // next up is first in queue
  const next = queue[0];
  nextText.textContent = `Next Up: ${next.title || "(queued)"}${next.author ? " — " + next.author : ""}`;

  // list remaining queue (show up to 6)
  qList.innerHTML = "";
  queue.slice(0, 6).forEach((it, idx) => {
    const item = document.createElement("div");
    item.className = "q-item";
    item.style.display = "flex";
    item.style.justifyContent = "space-between";
    item.style.alignItems = "center";
    item.style.padding = "6px 8px";

    const left = document.createElement("div");
    left.textContent = it.title || it.query || "Unknown";
    left.style.fontSize = "13px";
    left.style.color = "rgba(255,255,255,0.9)";

    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.gap = "8px";

    const playNow = document.createElement("button");
    playNow.textContent = "Play";
    playNow.className = "btn";
    playNow.style.padding = "6px";
    playNow.style.fontSize = "12px";
    playNow.onclick = () => {
      // play this queued item now (remove it from queue)
      queue = queue.filter(q => q !== it);
      setVideoById(it.videoId);
      refreshQueueUI();
      startWaveSim();
    };

    right.appendChild(playNow);
    item.appendChild(left);
    item.appendChild(right);
    qList.appendChild(item);
  });
}

// play a video id immediately (resets iframe & UI)
function setVideoById(vid, meta = {}) {
  const player = document.getElementById(PLAYER_IFRAME_ID);
  const cover = document.getElementById(COVER_IMG_ID);
  const titleEl = document.getElementById(TITLE_ID);
  const artistEl = document.getElementById(ARTIST_ID);

  if (!vid) return;

  currentVideoId = vid;

  // load into iframe (this will start from start)
  player.src = `https://www.youtube.com/embed/${vid}?autoplay=1&controls=1&rel=0&modestbranding=1`;

  // update UI
  isPlaying = true;
  updatePlayButton();

  // thumbnail
  if (cover) cover.src = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;

  // fill title/artist via oembed best-effort
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

  // when we start a new immediate video, if queue had this item at front, remove it
  if (queue.length && queue[0] && queue[0].videoId === vid) {
    queue.shift();
    refreshQueueUI();
  }

  // start wave animation
  setWavesPlaying(true);
}

// toggle play/pause — pause will stop playback, play will restart from beginning (per request)
function togglePlay() {
  const player = document.getElementById(PLAYER_IFRAME_ID);
  if (!currentVideoId) return;

  if (isPlaying) {
    // pause: clear iframe src to stop playback and freeze waves
    player.src = "";
    isPlaying = false;
    setWavesPlaying(false);
    updatePlayButton();
    stopWaveSim();
  } else {
    // play -> restart from beginning (reload iframe)
    player.src = `https://www.youtube.com/embed/${currentVideoId}?autoplay=1&controls=1&rel=0&modestbranding=1`;
    isPlaying = true;
    setWavesPlaying(true);
    updatePlayButton();
    startWaveSim();
  }
}

// when current ends (we cannot detect end reliably without the iframe API), but we still provide manual next
function playNextFromQueue() {
  if (queue.length === 0) {
    // nothing queued
    // stop waves & UI
    isPlaying = false;
    setWavesPlaying(false);
    updatePlayButton();
    return;
  }
  const next = queue.shift();
  setVideoById(next.videoId, next);
  refreshQueueUI();
}

// small simulation to animate wave heights slightly over time
let waveSimInterval = null;
function startWaveSim() {
  stopWaveSim();
  waveSimInterval = setInterval(() => {
    // randomize bar heights a little
    const bars = document.querySelectorAll("#__sound_waves .__wave_bar");
    bars.forEach(b => {
      const min = 12, max = 72;
      const newH = min + Math.floor(Math.random() * (max - min));
      b.style.height = `${newH}px`;
    });
  }, 450);
}
function stopWaveSim() {
  if (waveSimInterval) clearInterval(waveSimInterval);
  waveSimInterval = null;
}

// Update play button icon
function updatePlayButton() {
  const btn = document.getElementById(PLAY_BTN_ID);
  if (!btn) return;
  btn.textContent = isPlaying ? "⏸" : "▶";
}

// main load function (search or direct link)
// - If a song is playing and user searches a new song, we push new song to queue and show Next Up
// - If nothing is playing, load immediately
async function loadMusic() {
  const raw = document.getElementById(INPUT_ID).value.trim();
  if (!raw) return alert("Type a song name or paste a YouTube link.");

  const isUrl = /(youtube\.com|youtu\.be)/i.test(raw);

  // direct link -> extract id and either play or queue
  if (isUrl) {
    const vid = extractVideoId(raw);
    if (!vid) return alert("Could not extract video id from link.");

    // if playing => queue
    if (isPlaying && currentVideoId) {
      // try get metadata for display
      let title = raw;
      let author = "";
      try {
        const o = await (await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`)).json();
        title = o.title || raw;
        author = o.author_name || "";
      } catch {}
      queue.push({ videoId: vid, title, author, query: raw });
      refreshQueueUI();
      return;
    }

    // otherwise play immediately
    setVideoById(vid);
    startWaveSim();
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

    // if something is playing -> push to queue and show Next Up
    if (isPlaying && currentVideoId) {
      // get title via oembed
      let title = raw;
      let author = "";
      try {
        const o = await (await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${data.videoId}&format=json`)).json();
        title = o.title || raw;
        author = o.author_name || "";
      } catch {}
      queue.push({ videoId: data.videoId, title, author, query: raw });
      refreshQueueUI();
      return;
    }

    // else play now
    setVideoById(data.videoId);
    startWaveSim();
  } catch (err) {
    console.error("Search error:", err);
    alert("Search failed. Try again.");
  }
}

// Rewind / Forward helpers: reload with start param (not precise but works)
function seekBy(seconds) {
  if (!currentVideoId) return;
  const iframe = document.getElementById(PLAYER_IFRAME_ID);
  iframe.src = `https://www.youtube.com/embed/${currentVideoId}?start=${Math.max(0, seconds)}&autoplay=1&controls=1&rel=0&modestbranding=1`;
  isPlaying = true;
  updatePlayButton();
  setWavesPlaying(true);
  startWaveSim();
}

// hookup events once DOM loaded
document.addEventListener("DOMContentLoaded", () => {
  // ensure UI elements exist
  buildSoundWaves(14); // create waves (default 14 bars)
  refreshQueueUI();

  const input = document.getElementById(INPUT_ID);
  const loadBtn = document.getElementById(LOAD_BTN_ID);
  const playBtn = document.getElementById(PLAY_BTN_ID);
  const nextBtn = document.getElementById("nextBtn");
  const prevBtn = document.getElementById("prevBtn");
  const rewBtn = document.getElementById("rewBtn");
  const fwdBtn = document.getElementById("fwdBtn");

  if (input) input.addEventListener("keydown", (e) => { if (e.key === "Enter") loadMusic(); });
  if (loadBtn) loadBtn.addEventListener("click", loadMusic);
  if (playBtn) playBtn.addEventListener("click", togglePlay);
  if (nextBtn) nextBtn.addEventListener("click", () => { playNextFromQueue(); });
  if (prevBtn) prevBtn.addEventListener("click", () => { alert("Prev not implemented (use queue)"); });
  if (rewBtn) rewBtn.addEventListener("click", () => seekBy(0)); // go start
  if (fwdBtn) fwdBtn.addEventListener("click", () => seekBy(60)); // jump 60s

  // make sure waves are paused initially
  setWavesPlaying(false);
});

// expose loadMusic as global (HTML uses onclick in some versions)
window.loadMusic = loadMusic;
