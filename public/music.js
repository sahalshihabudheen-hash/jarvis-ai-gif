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
  if (!container) return;
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
  if (!container) return;
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

function getYoutubeThumbnail(videoId) {
  return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
}

function setVideoById(vid, customTitle = null, customArtist = null) {
  const player = document.getElementById(PLAYER_IFRAME_ID);
  const cover = document.getElementById(COVER_IMG_ID);
  const titleEls = document.querySelectorAll(`#${TITLE_ID}`);
  const artistEls = document.querySelectorAll(`#${ARTIST_ID}`);

  if (!vid) return;
  currentVideoId = vid;

  if (player) {
    player.src = `https://www.youtube.com/embed/${vid}?autoplay=1&controls=1&rel=0&modestbranding=1`;
  }
  isPlaying = true;

  if (cover) {
    cover.src = getYoutubeThumbnail(vid);
  }

  const miniCover = document.getElementById("miniCover");
  if (miniCover) {
    miniCover.src = getYoutubeThumbnail(vid);
  }

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
    if (iframe) iframe.src = "";
    isPlaying = false;
    updatePlayButton();
    stopProgressSimulation();
    stopWaveAnimation();
  } else {
    if (iframe) {
      iframe.src = `https://www.youtube.com/embed/${currentVideoId}?autoplay=1&controls=1&rel=0&modestbranding=1`;
    }
    isPlaying = true;
    updatePlayButton();
    startProgressSimulation();
    startWaveAnimation();
  }
}

function updatePlayButton() {
  const btn = document.getElementById(PLAY_BTN_ID);
  if (btn) {
    btn.textContent = isPlaying ? "⏸" : "▶";
  }
}

function setProgress(p) {
  const fill = document.getElementById(PROGRESS_FILL_ID);
  if (fill) {
    fill.style.width = `${Math.max(0, Math.min(100, p))}%`;
  }
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
  if (!container) return;
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
  const input = document.getElementById(INPUT_ID);
  const raw = input ? input.value.trim() : "";
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
      alert("Search feature requires backend API. Try pasting a YouTube link instead!");
    }
  } catch (err) {
    alert("Search feature requires backend API. Try pasting a YouTube link instead!");
  }
}

function openPlaylistModal() {
  const modal = document.getElementById("playlistModal");
  if (!modal) return;
  modal.style.display = "flex";
}

function closePlaylistModal() {
  const modal = document.getElementById("playlistModal");
  if (!modal) return;
  modal.style.display = "none";
}

function submitPlaylist() {
  const input = document.getElementById("playlistNameInput");
  if (!input) return;
  const name = input.value.trim();
  if (!name) {
    alert("Please enter a playlist name");
    return;
  }
  if (playlists[name]) {
    alert("Playlist already exists");
    return;
  }
  playlists[name] = [];
  savePlaylists();
  loadPlaylists();
  input.value = "";
  closePlaylistModal();
}

document.addEventListener("DOMContentLoaded", () => {
  loadPlaylists();
  initWaveBars();

  const loadBtn = document.getElementById(LOAD_BTN_ID);
  if (loadBtn) {
    loadBtn.addEventListener("click", loadMusic);
  }

  const playBtn = document.getElementById(PLAY_BTN_ID);
  if (playBtn) {
    playBtn.addEventListener("click", togglePlay);
  }

  const createBtn = document.getElementById("createPlaylistBtn");
  if (createBtn) {
    createBtn.addEventListener("click", createPlaylist);
  }

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

  const nextBtn = document.getElementById("nextBtn");
  if (nextBtn) {
    nextBtn.addEventListener("click", playNext);
  }

  const prevBtn = document.getElementById("prevBtn");
  if (prevBtn) {
    prevBtn.addEventListener("click", playPrev);
  }

  const rewBtn = document.getElementById("rewBtn");
  if (rewBtn) {
    rewBtn.addEventListener("click", () => alert("Rewind not precise in iframe player"));
  }

  const fwdBtn = document.getElementById("fwdBtn");
  if (fwdBtn) {
    fwdBtn.addEventListener("click", () => alert("Forward not precise in iframe player"));
  }

  const input = document.getElementById(INPUT_ID);
  if (input) {
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") loadMusic();
    });
  }

  const progressBar = document.querySelector(".progress");
  progressBar?.addEventListener("click", (e) => {
    const rect = progressBar.getBoundingClientRect();
    const percent = ((e.clientX - rect.left) / rect.width) * 100;
    setProgress(Math.min(100, Math.max(0, percent)));
  });

  const playlistModal = document.getElementById("playlistModal");
  if (playlistModal) {
    playlistModal.addEventListener("click", (e) => {
      if (e.target === playlistModal) {
        closePlaylistModal();
      }
    });
  }

  const submitBtn = document.getElementById("submitPlaylistBtn");
  if (submitBtn) {
    submitBtn.addEventListener("click", submitPlaylist);
  }

  const closeBtn = document.getElementById("closePlaylistBtn");
  if (closeBtn) {
    closeBtn.addEventListener("click", closePlaylistModal);
  }

  const nameInput = document.getElementById("playlistNameInput");
  if (nameInput) {
    nameInput.addEventListener("keydown", e => {
      if (e.key === "Enter") submitPlaylist();
    });
  }

  const addToPlaylistBtn = document.getElementById("addToPlaylistBtn");
  if (addToPlaylistBtn) {
    addToPlaylistBtn.addEventListener("click", () => {
      const plNames = Object.keys(playlists);
      if (plNames.length === 0) {
        alert("No playlists. Create one first!");
        return;
      }
      const selected = prompt(`Add current track to which playlist?\n\n${plNames.join(", ")}`);
      if (selected && playlists[selected] && currentVideoId) {
        const titleEls = document.querySelectorAll(`#${TITLE_ID}`);
        const artistEls = document.querySelectorAll(`#${ARTIST_ID}`);
        const title = titleEls[0]?.textContent || "Unknown";
        const artist = artistEls[0]?.textContent || "Unknown";
        const track = { id: currentVideoId, title, artist, cover: getYoutubeThumbnail(currentVideoId) };
        if (!playlists[selected].some(t => t.id === currentVideoId)) {
          playlists[selected].push(track);
          savePlaylists();
          loadPlaylists();
          alert(`Added to "${selected}"`);
        } else {
          alert("Already in playlist");
        }
      }
    });
  }
});

window.loadMusic = loadMusic;
window.togglePlay = togglePlay;
window.playNext = playNext;
window.playPrev = playPrev;
window.createPlaylist = createPlaylist;
window.openPlaylistModal = openPlaylistModal;
window.closePlaylistModal = closePlaylistModal;
window.submitPlaylist = submitPlaylist;
