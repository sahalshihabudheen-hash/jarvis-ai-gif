let currentVideoId = null;
let currentPlaylist = null;
let isPlaying = false;
let progressInterval = null;
let waveBars = [];
let playlists = {};
let currentTrackIndex = 0;

const STORAGE_KEY = "jarvis_playlists";
const NUM_BARS = 20;

// Load playlists from localStorage
function loadPlaylists() {
  const stored = localStorage.getItem(STORAGE_KEY);
  playlists = stored ? JSON.parse(stored) : {};
  renderSidebar();
  renderPlaylistArea();
}

// Save playlists to localStorage
function savePlaylists() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
}

// Render sidebar playlists
function renderSidebar() {
  const container = document.getElementById("sidebarPlaylists");
  container.innerHTML = "";
  Object.keys(playlists).forEach(name => {
    const btn = document.createElement("button");
    btn.className = "pl-btn";
    const count = playlists[name].length;
    btn.innerHTML = `<span>${name}</span><span style="color: #1db954;">${count}</span>`;
    btn.addEventListener("click", () => selectPlaylist(name));
    container.appendChild(btn);
  });
}

// Render playlist area in right panel
function renderPlaylistArea() {
  const container = document.getElementById("playlistArea");
  container.innerHTML = "";
  Object.keys(playlists).forEach(name => {
    const div = document.createElement("div");
    div.className = "playlist-item";
    div.innerHTML = `<strong>${name}</strong> <span style="color: #1db954;">(${playlists[name].length})</span>`;
    div.addEventListener("click", () => selectPlaylist(name));
    container.appendChild(div);
  });
}

// Select and play playlist
function selectPlaylist(name) {
  currentPlaylist = name;
  currentTrackIndex = 0;
  if (playlists[name].length > 0) {
    const track = playlists[name][0];
    setVideoById(track.id, track.title, track.artist);
  }
}

// Create new playlist
function createPlaylist() {
  const name = prompt("Enter playlist name:");
  if (!name || name.trim() === "") return;
  if (playlists[name]) return alert("Playlist already exists");
  playlists[name] = [];
  savePlaylists();
  loadPlaylists();
}

// Add track to playlist
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

// Extract video ID from YouTube URL
function extractVideoId(url) {
  if (!url) return null;
  if (url.includes("youtu.be/")) return url.split("youtu.be/")[1].split(/[?&]/)[0];
  if (url.includes("v=")) return url.split("v=")[1].split("&")[0];
  const m = url.match(/\/embed\/([A-Za-z0-9_\-]+)/);
  return m ? m[1] : null;
}

// Set video by ID - FIXED VERSION
function setVideoById(vid, customTitle = null, customArtist = null) {
  const player = document.getElementById("ytPlayer");
  const cover = document.getElementById("coverImg");
  const miniCover = document.getElementById("miniCover");
  const trackTitle = document.getElementById("trackTitle");
  const trackArtist = document.getElementById("trackArtist");
  const playerTrackTitle = document.getElementById("playerTrackTitle");
  const playerTrackArtist = document.getElementById("playerTrackArtist");

  if (!vid) {
    alert("Invalid video ID");
    return;
  }
  
  currentVideoId = vid;
  player.src = `https://www.youtube.com/embed/${vid}?autoplay=1&controls=0&rel=0&modestbranding=1`;
  isPlaying = true;

  const coverUrl = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
  cover.src = coverUrl;
  miniCover.src = coverUrl;

  if (customTitle && customArtist) {
    trackTitle.textContent = customTitle;
    trackArtist.textContent = customArtist;
    playerTrackTitle.textContent = customTitle;
    playerTrackArtist.textContent = customArtist;
  } else {
    // Fetch metadata from YouTube
    fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const title = data?.title || "YouTube Video";
        const artist = data?.author_name || "YouTube";
        trackTitle.textContent = title;
        trackArtist.textContent = artist;
        playerTrackTitle.textContent = title;
        playerTrackArtist.textContent = artist;
      })
      .catch(() => {
        trackTitle.textContent = `Video: ${vid}`;
        trackArtist.textContent = "YouTube";
        playerTrackTitle.textContent = `Video: ${vid}`;
        playerTrackArtist.textContent = "YouTube";
      });
  }

  updatePlayButton();
  setProgress(0);
  startProgressSimulation();
  startWaveAnimation();
}

// Toggle play/pause
function togglePlay() {
  const iframe = document.getElementById("ytPlayer");
  if (!currentVideoId) {
    alert("No track loaded. Search for a song first!");
    return;
  }
  
  if (isPlaying) {
    iframe.src = "";
    isPlaying = false;
    updatePlayButton();
    stopProgressSimulation();
    stopWaveAnimation();
  } else {
    iframe.src = `https://www.youtube.com/embed/${currentVideoId}?autoplay=1&controls=0&rel=0&modestbranding=1`;
    isPlaying = true;
    updatePlayButton();
    startProgressSimulation();
    startWaveAnimation();
  }
}

// Update play button text
function updatePlayButton() {
  document.getElementById("playBtn").textContent = isPlaying ? "⏸" : "▶";
}

// Set progress bar
function setProgress(p) {
  document.getElementById("progressFill").style.width = `${Math.max(0, Math.min(100, p))}%`;
}

// Start progress simulation
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

// Stop progress simulation
function stopProgressSimulation() {
  clearInterval(progressInterval);
}

// Initialize wave bars
function initWaveBars() {
  const container = document.getElementById("waveContainer");
  container.innerHTML = "";
  waveBars = [];
  for (let i = 0; i < NUM_BARS; i++) {
    const bar = document.createElement("div");
    bar.className = "wave-bar";
    bar.style.animationDelay = `${Math.random() * 0.5}s`;
    container.appendChild(bar);
    waveBars.push(bar);
  }
}

// Start wave animation
function startWaveAnimation() {
  waveBars.forEach(bar => bar.style.animationPlayState = "running");
}

// Stop wave animation
function stopWaveAnimation() {
  waveBars.forEach(bar => bar.style.animationPlayState = "paused");
}

// Play next track
function playNext() {
  if (!currentPlaylist || playlists[currentPlaylist].length === 0) {
    alert("No playlist selected or playlist is empty");
    return;
  }
  currentTrackIndex = (currentTrackIndex + 1) % playlists[currentPlaylist].length;
  const track = playlists[currentPlaylist][currentTrackIndex];
  setVideoById(track.id, track.title, track.artist);
}

// Play previous track
function playPrev() {
  if (!currentPlaylist || playlists[currentPlaylist].length === 0) {
    alert("No playlist selected or playlist is empty");
    return;
  }
  currentTrackIndex = (currentTrackIndex - 1 + playlists[currentPlaylist].length) % playlists[currentPlaylist].length;
  const track = playlists[currentPlaylist][currentTrackIndex];
  setVideoById(track.id, track.title, track.artist);
}

// FIXED: Search YouTube - Improved version
async function searchYouTube(query) {
  try {
    const response = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
    const html = await response.text();

    // Try multiple patterns to extract video ID
    // Pattern 1: Look for videoId in JSON data
    const videoIdMatches = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/g);
    if (videoIdMatches && videoIdMatches.length > 0) {
      const firstMatch = videoIdMatches[0].match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
      if (firstMatch) return firstMatch[1];
    }

    // Pattern 2: Look for watch URLs
    const watchMatch = html.match(/watch\?v=([a-zA-Z0-9_-]{11})/);
    if (watchMatch) return watchMatch[1];

    // Pattern 3: Look for video renderer
    const rendererMatch = html.match(/videoRenderer.*?"videoId":"([a-zA-Z0-9_-]{11})"/);
    if (rendererMatch) return rendererMatch[1];

    return null;
  } catch (err) {
    console.error("Search error:", err);
    return null;
  }
}

// FIXED: Load music - Better error handling
async function loadMusic() {
  const raw = document.getElementById("ytInput").value.trim();
  if (!raw) {
    alert("Please enter a song name or YouTube link");
    return;
  }

  const isUrl = /(youtube\.com|youtu\.be)/i.test(raw);
  
  if (isUrl) {
    const vid = extractVideoId(raw);
    if (!vid) {
      alert("Could not extract video ID from URL");
      return;
    }
    setVideoById(vid);
    document.getElementById("ytInput").value = "";
    return;
  }

  // Search for song
  const btn = document.getElementById("loadBtn");
  const origText = btn.textContent;
  btn.textContent = "Searching...";
  btn.disabled = true;

  try {
    const vid = await searchYouTube(raw);
    btn.textContent = origText;
    btn.disabled = false;

    if (vid) {
      setVideoById(vid);
      document.getElementById("ytInput").value = "";
      alert("Track found and playing!");
    } else {
      alert("Song not found. Try another search or paste a YouTube link!");
    }
  } catch (error) {
    btn.textContent = origText;
    btn.disabled = false;
    alert("Search failed. Please try again or paste a YouTube link.");
    console.error("Load music error:", error);
  }
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  loadPlaylists();
  initWaveBars();

  document.getElementById("loadBtn").addEventListener("click", loadMusic);
  document.getElementById("playBtn").addEventListener("click", togglePlay);
  document.getElementById("createPlaylistBtn").addEventListener("click", createPlaylist);
  document.getElementById("nextBtn").addEventListener("click", playNext);
  document.getElementById("prevBtn").addEventListener("click", playPrev);
  
  document.getElementById("rewBtn").addEventListener("click", () => {
    alert("Rewind not available with iframe player");
  });
  
  document.getElementById("fwdBtn").addEventListener("click", () => {
    alert("Forward not available with iframe player");
  });

  document.getElementById("ytInput").addEventListener("keydown", e => {
    if (e.key === "Enter") loadMusic();
  });

  // Player bar add to playlist button
  document.getElementById("playerAddToPlaylistBtn")?.addEventListener("click", () => {
    if (!currentVideoId) {
      alert("No track playing");
      return;
    }
    const title = document.getElementById("trackTitle").textContent;
    const artist = document.getElementById("trackArtist").textContent;
    if (title === "Not Playing") {
      alert("No track playing");
      return;
    }
    addToPlaylist(currentVideoId, title, artist);
  });

  // Song card clicks
  const songCards = document.querySelectorAll(".song-card");
  songCards.forEach(card => {
    card.addEventListener("click", (e) => {
      if (e.target.classList.contains("add-btn")) return;
      const vid = card.dataset.id;
      const title = card.dataset.title;
      const artist = card.dataset.artist;
      setVideoById(vid, title, artist);
    });

    const addBtn = card.querySelector(".add-btn");
    addBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      const vid = card.dataset.id;
      const title = card.dataset.title;
      const artist = card.dataset.artist;
      addToPlaylist(vid, title, artist);
    });
  });

  // Progress bar click
  const progressBar = document.querySelector(".progress-bar");
  progressBar?.addEventListener("click", (e) => {
    const rect = progressBar.getBoundingClientRect();
    const percent = ((e.clientX - rect.left) / rect.width) * 100;
    setProgress(Math.min(100, Math.max(0, percent)));
  });
});
