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
let currentPlaylist = null;
let isPlaying = false;
let progressInterval = null;
let waveBars = [];
let playlists = {};
let currentTrackIndex = 0;

const STORAGE_KEY = "jarvis_playlists";

function loadPlaylists() {
  const stored = localStorage.getItem(STORAGE_KEY);
  playlists = stored ? JSON.parse(stored) : {};
  renderSidebar();
  renderPlaylistArea();
}

function savePlaylists() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
}

function renderSidebar() {
  const container = document.getElementById("sidebarPlaylists");
  container.innerHTML = "";
  Object.keys(playlists).forEach(name => {
    const btn = document.createElement("button");
    btn.className = "pl-btn";
    const count = playlists[name].length;
    btn.innerHTML = `<span>${name}</span><span style="color: #1db954; font-size: 11px;">${count}</span>`;
    btn.addEventListener("click", () => selectPlaylist(name));
    container.appendChild(btn);
  });
}

function renderPlaylistArea() {
  const container = document.getElementById("playlistArea");
  container.innerHTML = "";
  Object.keys(playlists).forEach(name => {
    const div = document.createElement("div");
    div.style.cssText = "padding: 8px; border-radius: 6px; background: rgba(29,185,84,0.08); border: 1px solid rgba(29,185,84,0.2); font-size: 12px; cursor: pointer; transition: all 0.2s;";
    div.innerHTML = `<strong>${name}</strong> <span style="color: #1db954;">(${playlists[name].length})</span>`;
    div.addEventListener("click", () => selectPlaylist(name));
    div.addEventListener("mouseenter", () => {
      div.style.background = "rgba(29,185,84,0.15)";
      div.style.borderColor = "rgba(29,185,84,0.4)";
    });
    div.addEventListener("mouseleave", () => {
      div.style.background = "rgba(29,185,84,0.08)";
      div.style.borderColor = "rgba(29,185,84,0.2)";
    });
    container.appendChild(div);
  });
}

function selectPlaylist(name) {
  currentPlaylist = name;
  currentTrackIndex = 0;
  if (playlists[name].length > 0) {
    const track = playlists[name][0];
    setVideoById(track.id, track.title, track.artist);
  }
  alert(`Playing playlist: ${name}`);
}

function createPlaylist() {
  const name = prompt("Playlist name:");
  if (!name || name.trim() === "") return;
  if (playlists[name]) return alert("Playlist already exists");
  playlists[name] = [];
  savePlaylists();
  loadPlaylists();
}

function addToPlaylist(videoId, title, artist) {
  const plNames = Object.keys(playlists);
  if (plNames.length === 0) return alert("No playlists. Create one first!");

  const selected = prompt(`Add "${title}" to which playlist?\n\n${plNames.join(", ")}`);
  if (!selected || !playlists[selected]) return alert("Playlist not found");

  const track = { id: videoId, title, artist, cover: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` };
  if (!playlists[selected].some(t => t.id === videoId)) {
    playlists[selected].push(track);
    savePlaylists();
    loadPlaylists();
    alert(`Added to "${selected}"`);
  } else {
    alert("Already in playlist");
  }
}

function extractVideoId(url) {
  if (!url) return null;
  if (url.includes("youtu.be/")) return url.split("youtu.be/")[1].split(/[?&]/)[0];
  if (url.includes("v=")) return url.split("v=")[1].split("&")[0];
  const m = url.match(/\/embed\/([A-Za-z0-9_\-]+)/);
  return m ? m[1] : null;
}

function setVideoById(vid, customTitle = null, customArtist = null) {
  const player = document.getElementById(PLAYER_IFRAME_ID);
  const cover = document.getElementById(COVER_IMG_ID);
  const titleEls = document.querySelectorAll(`#${TITLE_ID}`);
  const artistEls = document.querySelectorAll(`#${ARTIST_ID}`);

  if (!vid) return;
  currentVideoId = vid;
  player.src = `https://www.youtube.com/embed/${vid}?autoplay=1&controls=1&rel=0&modestbranding=1`;
  isPlaying = true;

  cover.src = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
  const miniCover = document.getElementById("miniCover");
  if (miniCover) miniCover.src = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;

  if (customTitle && customArtist) {
    titleEls.forEach(el => el.textContent = customTitle);
    artistEls.forEach(el => el.textContent = customArtist);
  } else {
    fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const title = data?.title || "YouTube Video";
        const artist = data?.author_name || "YouTube";
        titleEls.forEach(el => el.textContent = title);
        artistEls.forEach(el => el.textContent = artist);
      })
      .catch(_ => {
        titleEls.forEach(el => el.textContent = `Video: ${vid}`);
        artistEls.forEach(el => el.textContent = "YouTube");
      });
  }

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
    if (val > 100) {
      val = 0;
      playNext();
    }
    setProgress(val);
  }, 500);
}

function stopProgressSimulation() {
  clearInterval(progressInterval);
}

function initWaveBars() {
  const container = document.getElementById(WAVE_CONTAINER_ID);
  container.innerHTML = "";
  waveBars = [];
  for (let i = 0; i < NUM_BARS; i++) {
    const bar = document.createElement("div");
    bar.className = "wave-bar";
    bar.style.setProperty("--scale", Math.random());
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

function playNext() {
  if (!currentPlaylist || playlists[currentPlaylist].length === 0) return;
  currentTrackIndex = (currentTrackIndex + 1) % playlists[currentPlaylist].length;
  const track = playlists[currentPlaylist][currentTrackIndex];
  setVideoById(track.id, track.title, track.artist);
}

function playPrev() {
  if (!currentPlaylist || playlists[currentPlaylist].length === 0) return;
  currentTrackIndex = (currentTrackIndex - 1 + playlists[currentPlaylist].length) % playlists[currentPlaylist].length;
  const track = playlists[currentPlaylist][currentTrackIndex];
  setVideoById(track.id, track.title, track.artist);
}

async function loadMusic() {
  const raw = document.getElementById(INPUT_ID).value.trim();
  if (!raw) return alert("Type a song name or paste a YouTube link.");

  const isUrl = /(youtube\.com|youtu\.be)/i.test(raw);
  if (isUrl) {
    const vid = extractVideoId(raw);
    if (!vid) return alert("Could not extract video ID from link.");
    setVideoById(vid);
    return;
  }

  try {
    const resp = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ&format=json`);
    if (resp.ok) {
      const data = await resp.json();
      alert("Search feature requires backend API. Try pasting a YouTube link instead!");
    }
  } catch (err) {
    alert("Search feature requires backend API. Try pasting a YouTube link instead!");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadPlaylists();
  initWaveBars();

  document.getElementById(LOAD_BTN_ID).addEventListener("click", loadMusic);
  document.getElementById(PLAY_BTN_ID).addEventListener("click", togglePlay);
  document.getElementById("createPlaylistBtn").addEventListener("click", createPlaylist);

  const songCards = document.querySelectorAll(".song-card");
  songCards.forEach(card => {
    card.addEventListener("click", () => {
      const vid = card.dataset.id;
      const title = card.dataset.title;
      const artist = card.dataset.artist;
      setVideoById(vid, title, artist);
    });

    const addBtn = card.querySelector(".add-to-pl-btn");
    addBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      const vid = card.dataset.id;
      const title = card.dataset.title;
      const artist = card.dataset.artist;
      addToPlaylist(vid, title, artist);
    });
  });

  document.getElementById("nextBtn").addEventListener("click", playNext);
  document.getElementById("prevBtn").addEventListener("click", playPrev);
  document.getElementById("rewBtn").addEventListener("click", () => alert("Rewind not precise in iframe player"));
  document.getElementById("fwdBtn").addEventListener("click", () => alert("Forward not precise in iframe player"));

  document.getElementById(INPUT_ID).addEventListener("keydown", e => {
    if (e.key === "Enter") loadMusic();
  });

  const progressBar = document.querySelector(".progress");
  progressBar?.addEventListener("click", (e) => {
    const rect = progressBar.getBoundingClientRect();
    const percent = ((e.clientX - rect.left) / rect.width) * 100;
    setProgress(Math.min(100, Math.max(0, percent)));
  });
});

window.loadMusic = loadMusic;
