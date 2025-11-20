// JARVIS Music Player - Vanilla JS
// Features: Playlists, Search, YouTube, Auto-next

const STORAGE_KEY = "jarvis_playlists";
const NUM_BARS = 20;

// State
let playlists = {};
let currentPlaylist = null;
let currentTrackIndex = 0;
let currentSong = null;
let isPlaying = false;
let waveBars = [];
let audioPlayer = null;

// Song Library with MP3 file paths
const songLibrary = [
  { id: "fHI8X4OXluQ", title: "Blinding Lights", artist: "The Weeknd", url: "blinding-lights.mp3" },
  { id: "34Na4j8AVgA", title: "Starboy", artist: "The Weeknd", url: "starboy.mp3" },
  { id: "XXYlFuWEuKI", title: "Save Your Tears", artist: "The Weeknd", url: "save-your-tears.mp3" },
  { id: "mRD0-GxqHVo", title: "Heat Waves", artist: "Glass Animals", url: "heat-waves.mp3" },
  { id: "TEpZyoLhK9M", title: "Unholy", artist: "Sam Smith", url: "unholy.mp3" },
  { id: "kJQP7kiw9Fk", title: "As It Was", artist: "Harry Styles", url: "as-it-was.mp3" },
  { id: "60ItHLz5WEA", title: "Faded", artist: "Alan Walker", url: "faded.mp3" },
  { id: "RgKAFK5djSk", title: "Wasted Summers", artist: "juju", url: "wasted-summers.mp3" },
  { id: "FM7MFYoylVs", title: "Shape of You", artist: "Ed Sheeran", url: "shape-of-you.mp3" },
  { id: "CevxZvSJLk8", title: "Rockstar", artist: "Post Malone", url: "rockstar.mp3" }
];

// ====== INITIALIZATION ======
document.addEventListener("DOMContentLoaded", () => {
  audioPlayer = document.getElementById("audioPlayer");
  loadPlaylists();
  renderSongGrid();
  initWaveBars();
  setupEventListeners();
  setupAudioPlayerEvents();
  setupHamburger();
});

// ====== PLAYLIST MANAGEMENT ======
function loadPlaylists() {
  const stored = localStorage.getItem(STORAGE_KEY);
  playlists = stored ? JSON.parse(stored) : {};
  renderSidebarPlaylists();
}

function savePlaylists() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
  renderSidebarPlaylists();
}

function renderSidebarPlaylists() {
  const container = document.getElementById("sidebarPlaylists");
  container.innerHTML = "";
  
  Object.keys(playlists).forEach(name => {
    const btn = document.createElement("button");
    btn.className = "pl-btn";
    if (currentPlaylist === name) btn.classList.add("active");
    
    const count = playlists[name].length;
    btn.innerHTML = `<span>${name}</span><span style="color: #1db954; font-size: 11px;">${count} songs</span>`;
    
    btn.addEventListener("click", () => selectPlaylist(name));
    container.appendChild(btn);
  });
}

function selectPlaylist(name) {
  currentPlaylist = name;
  currentTrackIndex = 0;
  renderSidebarPlaylists();
  renderPlaylistSongs();
  
  if (playlists[name].length > 0) {
    const track = playlists[name][0];
    playSong(track.id, track.title, track.artist, track.url);
  }
  
  document.getElementById("currentPlaylistName").textContent = name;
}

function renderPlaylistSongs() {
  const container = document.getElementById("playlistSongs");
  container.innerHTML = "";
  
  if (!currentPlaylist || !playlists[currentPlaylist]) return;
  
  playlists[currentPlaylist].forEach((song, index) => {
    const item = document.createElement("div");
    item.className = "playlist-song-item";
    
    item.innerHTML = `
      <img src="${getThumbnail(song.id)}" alt="${song.title}" />
      <div class="playlist-song-info">
        <div class="title">${song.title}</div>
        <div class="artist">${song.artist}</div>
      </div>
      <button class="remove-song-btn" data-index="${index}">×</button>
    `;
    
    item.addEventListener("click", (e) => {
      if (!e.target.classList.contains("remove-song-btn")) {
        currentTrackIndex = index;
        playSong(song.id, song.title, song.artist, song.url);
      }
    });
    
    const removeBtn = item.querySelector(".remove-song-btn");
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      removeSongFromPlaylist(currentPlaylist, index);
    });
    
    container.appendChild(item);
  });
}

function removeSongFromPlaylist(playlistName, index) {
  if (!playlists[playlistName]) return;
  playlists[playlistName].splice(index, 1);
  savePlaylists();
  renderPlaylistSongs();
}

function createPlaylist() {
  const popup = document.getElementById("createPlaylistPopup");
  const input = document.getElementById("playlistNameInput");
  input.value = "";
  popup.classList.add("show");
  input.focus();
}

function confirmCreatePlaylist() {
  const input = document.getElementById("playlistNameInput");
  const name = input.value.trim();
  
  if (!name) return alert("Please enter a playlist name");
  if (playlists[name]) return alert("Playlist already exists");
  
  playlists[name] = [];
  savePlaylists();
  closePopup("createPlaylistPopup");
}

function showAddToPlaylistPopup() {
  if (!currentSong) return alert("No song is currently playing");
  
  const plNames = Object.keys(playlists);
  if (plNames.length === 0) return alert("No playlists! Create one first.");
  
  const container = document.getElementById("playlistOptions");
  container.innerHTML = "";
  
  plNames.forEach(name => {
    const option = document.createElement("div");
    option.className = "playlist-option";
    option.textContent = `${name} (${playlists[name].length} songs)`;
    option.addEventListener("click", () => addCurrentSongToPlaylist(name));
    container.appendChild(option);
  });
  
  document.getElementById("addToPlaylistPopup").classList.add("show");
}

function addCurrentSongToPlaylist(playlistName) {
  if (!currentSong) return;
  
  const exists = playlists[playlistName].some(s => s.id === currentSong.id);
  if (exists) {
    alert("Song already in playlist");
    return;
  }
  
  // Get URL for current song
  const song = songLibrary.find(s => s.id === currentSong.id);
  const url = song ? song.url : null;
  
  playlists[playlistName].push({
    id: currentSong.id,
    title: currentSong.title,
    artist: currentSong.artist,
    url: url
  });
  
  savePlaylists();
  if (currentPlaylist === playlistName) renderPlaylistSongs();
  closePopup("addToPlaylistPopup");
  showToast(`Added to "${playlistName}"`);
}

function addSongToPlaylist(videoId, title, artist, url = null) {
  const plNames = Object.keys(playlists);
  if (plNames.length === 0) return alert("No playlists! Create one first.");
  
  const container = document.getElementById("playlistOptions");
  container.innerHTML = "";
  
  // Get URL if not provided
  if (!url) {
    const song = songLibrary.find(s => s.id === videoId);
    url = song ? song.url : null;
  }
  
  plNames.forEach(name => {
    const option = document.createElement("div");
    option.className = "playlist-option";
    option.textContent = `${name} (${playlists[name].length} songs)`;
    option.addEventListener("click", () => {
      const exists = playlists[name].some(s => s.id === videoId);
      if (exists) {
        alert("Song already in playlist");
        return;
      }
      
      playlists[name].push({ id: videoId, title, artist, url });
      savePlaylists();
      if (currentPlaylist === name) renderPlaylistSongs();
      closePopup("addToPlaylistPopup");
      showToast(`Added to "${name}"`);
    });
    container.appendChild(option);
  });
  
  document.getElementById("addToPlaylistPopup").classList.add("show");
}

function closePopup(popupId) {
  document.getElementById(popupId).classList.remove("show");
}

// ====== SONG RENDERING ======
function renderSongGrid() {
  const grid = document.getElementById("songGrid");
  grid.innerHTML = "";
  
  songLibrary.forEach(song => {
    const card = document.createElement("div");
    card.className = "song-card";
    card.dataset.id = song.id;
    card.dataset.title = song.title;
    card.dataset.artist = song.artist;
    
    card.innerHTML = `
      <img class="song-cover" src="${getThumbnail(song.id)}" alt="${song.title}">
      <div class="song-meta">
        <div class="title">${song.title}</div>
        <div class="artist muted">${song.artist}</div>
      </div>
      <button class="add-to-pl-btn" title="Add to playlist">+</button>
    `;
    
    card.addEventListener("click", (e) => {
      if (!e.target.classList.contains("add-to-pl-btn")) {
        playSong(song.id, song.title, song.artist, song.url);
      }
    });
    
    const addBtn = card.querySelector(".add-to-pl-btn");
    addBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      addSongToPlaylist(song.id, song.title, song.artist, song.url);
    });
    
    grid.appendChild(card);
  });
}

// ====== TOAST NOTIFICATION ======
function showToast(message, isError = false) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 120px;
    right: 20px;
    padding: 12px 20px;
    background: ${isError ? 'rgba(220, 38, 38, 0.9)' : 'rgba(29, 185, 84, 0.9)'};
    color: white;
    border-radius: 8px;
    backdrop-filter: blur(10px);
    border: 1px solid ${isError ? 'rgba(220, 38, 38, 0.5)' : 'rgba(29, 185, 84, 0.5)'};
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    font-weight: 600;
    animation: slideIn 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ====== AUDIO FILE PATH RESOLUTION ======
function getAudioPaths(filename) {
  // Try multiple paths for static site hosting
  return [
    filename,                    // Same folder as HTML
    `music/${filename}`,         // /music folder
    `songs/${filename}`,         // /songs folder
    `/music/${filename}`,        // Absolute /music
    `/songs/${filename}`,        // Absolute /songs
    `./music/${filename}`,       // Relative ./music
    `./songs/${filename}`        // Relative ./songs
  ];
}

async function tryLoadAudio(url) {
  return new Promise((resolve, reject) => {
    const testAudio = new Audio();
    testAudio.addEventListener('canplaythrough', () => resolve(url), { once: true });
    testAudio.addEventListener('error', () => reject(), { once: true });
    testAudio.src = url;
  });
}

async function findWorkingAudioPath(filename) {
  // If it's a full URL, use it directly
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename;
  }
  
  const paths = getAudioPaths(filename);
  
  for (const path of paths) {
    try {
      const workingUrl = await tryLoadAudio(path);
      return workingUrl;
    } catch (e) {
      continue;
    }
  }
  
  return null;
}

// ====== PLAYER CONTROLS ======
async function playSong(videoId, title, artist, url = null) {
  currentSong = { id: videoId, title, artist };
  
  // Update UI first
  updateNowPlaying(videoId, title, artist);
  
  // Find song URL
  let audioUrl = url;
  if (!audioUrl) {
    const song = songLibrary.find(s => s.id === videoId);
    audioUrl = song ? song.url : null;
  }
  
  if (!audioUrl) {
    showToast("No audio file specified", true);
    return;
  }
  
  // Try to find working audio path
  const workingPath = await findWorkingAudioPath(audioUrl);
  
  if (!workingPath) {
    showToast("Audio failed to load. Check file path or URL", true);
    isPlaying = false;
    updatePlayButton();
    stopWaveAnimation();
    return;
  }
  
  // Load and play audio
  audioPlayer.src = workingPath;
  audioPlayer.load();
  
  try {
    await audioPlayer.play();
    isPlaying = true;
    updatePlayButton();
    startWaveAnimation();
    console.log(`Playing: ${title} by ${artist}`);
  } catch (e) {
    showToast("Failed to play audio", true);
    isPlaying = false;
    updatePlayButton();
    stopWaveAnimation();
    console.error("Play error:", e);
  }
}

function updateNowPlaying(videoId, title, artist) {
  const thumbnail = getThumbnail(videoId);
  
  // Update all title/artist elements
  document.getElementById("trackTitle").textContent = title;
  document.getElementById("trackArtist").textContent = artist;
  document.getElementById("playerTitle").textContent = title;
  document.getElementById("playerArtist").textContent = artist;
  
  // Update covers
  document.getElementById("coverImg").src = thumbnail;
  document.getElementById("miniCover").src = thumbnail;
}

function togglePlay() {
  if (!currentSong) return alert("No song selected");
  
  isPlaying = !isPlaying;
  updatePlayButton();
  
  if (isPlaying) {
    audioPlayer.play().catch(e => console.log("Audio play error:", e));
    startWaveAnimation();
  } else {
    audioPlayer.pause();
    stopWaveAnimation();
  }
}

function updatePlayButton() {
  document.getElementById("playBtn").textContent = isPlaying ? "⏸" : "▶";
}

function playNext() {
  if (!currentPlaylist || !playlists[currentPlaylist] || playlists[currentPlaylist].length === 0) {
    // Try playing next song from library if no playlist
    if (!currentSong) return;
    const currentIndex = songLibrary.findIndex(s => s.id === currentSong.id);
    if (currentIndex >= 0 && currentIndex < songLibrary.length - 1) {
      const nextSong = songLibrary[currentIndex + 1];
      playSong(nextSong.id, nextSong.title, nextSong.artist, nextSong.url);
    }
    return;
  }
  
  currentTrackIndex = (currentTrackIndex + 1) % playlists[currentPlaylist].length;
  const track = playlists[currentPlaylist][currentTrackIndex];
  playSong(track.id, track.title, track.artist, track.url);
}

function playPrev() {
  if (!currentPlaylist || !playlists[currentPlaylist] || playlists[currentPlaylist].length === 0) {
    // Try playing previous song from library if no playlist
    if (!currentSong) return;
    const currentIndex = songLibrary.findIndex(s => s.id === currentSong.id);
    if (currentIndex > 0) {
      const prevSong = songLibrary[currentIndex - 1];
      playSong(prevSong.id, prevSong.title, prevSong.artist, prevSong.url);
    }
    return;
  }
  
  currentTrackIndex = (currentTrackIndex - 1 + playlists[currentPlaylist].length) % playlists[currentPlaylist].length;
  const track = playlists[currentPlaylist][currentTrackIndex];
  playSong(track.id, track.title, track.artist, track.url);
}

function seekForward() {
  if (audioPlayer.src) {
    audioPlayer.currentTime = Math.min(audioPlayer.duration, audioPlayer.currentTime + 10);
  }
}

function seekBackward() {
  if (audioPlayer.src) {
    audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 10);
  }
}

// ====== AUDIO PLAYER EVENTS ======
function setupAudioPlayerEvents() {
  if (!audioPlayer) return;
  
  audioPlayer.addEventListener("ended", () => {
    console.log("Song ended, playing next...");
    playNext();
  });
  
  audioPlayer.addEventListener("timeupdate", () => {
    if (audioPlayer.duration) {
      const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
      document.getElementById("progressFill").style.width = `${percent}%`;
    }
  });
  
  audioPlayer.addEventListener("play", () => {
    isPlaying = true;
    updatePlayButton();
    startWaveAnimation();
  });
  
  audioPlayer.addEventListener("pause", () => {
    isPlaying = false;
    updatePlayButton();
    stopWaveAnimation();
  });
}

// ====== SEARCH ======
function searchAndPlay() {
  const input = document.getElementById("ytInput").value.trim();
  if (!input) return showToast("Enter a song name or YouTube link", true);
  
  // Check if it's a YouTube URL
  const videoId = extractVideoId(input);
  if (videoId) {
    // Extract title from URL or use generic
    playSong(videoId, "YouTube Video", "YouTube");
    return;
  }
  
  // Search in song library
  const query = input.toLowerCase();
  const found = songLibrary.find(song => 
    song.title.toLowerCase().includes(query) || 
    song.artist.toLowerCase().includes(query)
  );
  
  if (found) {
    playSong(found.id, found.title, found.artist);
  } else {
    alert(`No song found for "${input}". Try adding the full YouTube link or choose from the grid.`);
  }
}

function extractVideoId(url) {
  if (!url) return null;
  
  // youtu.be format
  if (url.includes("youtu.be/")) {
    return url.split("youtu.be/")[1].split(/[?&]/)[0];
  }
  
  // youtube.com/watch?v= format
  if (url.includes("youtube.com/watch?v=")) {
    return url.split("v=")[1].split("&")[0];
  }
  
  // youtube.com/embed/ format
  if (url.includes("youtube.com/embed/")) {
    return url.split("embed/")[1].split(/[?&]/)[0];
  }
  
  // Direct video ID (11 characters)
  if (/^[A-Za-z0-9_-]{11}$/.test(url)) {
    return url;
  }
  
  return null;
}

function getThumbnail(videoId) {
  // Try maxresdefault first, fallback to hqdefault
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

// ====== WAVE ANIMATION ======
function initWaveBars() {
  const container = document.getElementById("waveContainer");
  container.innerHTML = "";
  waveBars = [];
  
  for (let i = 0; i < NUM_BARS; i++) {
    const bar = document.createElement("div");
    bar.className = "wave-bar";
    bar.style.setProperty("--scale", Math.random());
    bar.style.animationDelay = `${Math.random() * 0.6}s`;
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

// ====== EVENT LISTENERS ======
function setupEventListeners() {
  // Create playlist
  document.getElementById("createPlaylistBtn").addEventListener("click", createPlaylist);
  document.getElementById("confirmCreatePlaylist").addEventListener("click", confirmCreatePlaylist);
  document.getElementById("cancelCreatePlaylist").addEventListener("click", () => closePopup("createPlaylistPopup"));
  
  // Add to playlist
  document.getElementById("addToPlaylistBtn").addEventListener("click", showAddToPlaylistPopup);
  document.getElementById("cancelAddToPlaylist").addEventListener("click", () => closePopup("addToPlaylistPopup"));
  
  // Player controls
  document.getElementById("playBtn").addEventListener("click", togglePlay);
  document.getElementById("nextBtn").addEventListener("click", playNext);
  document.getElementById("prevBtn").addEventListener("click", playPrev);
  document.getElementById("fwdBtn").addEventListener("click", seekForward);
  document.getElementById("rewBtn").addEventListener("click", seekBackward);
  
  // Search
  document.getElementById("loadBtn").addEventListener("click", searchAndPlay);
  document.getElementById("ytInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") searchAndPlay();
  });
  
  // Progress bar click
  document.getElementById("progressBar").addEventListener("click", (e) => {
    if (!audioPlayer.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audioPlayer.currentTime = audioPlayer.duration * percent;
  });
  
  // Close popups on overlay click
  document.querySelectorAll(".popup-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.classList.remove("show");
      }
    });
  });
  
  // Playlist name input enter key
  document.getElementById("playlistNameInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") confirmCreatePlaylist();
  });
}

function setupHamburger() {
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.getElementById("nav-links");
  const sidebar = document.getElementById("sidebar");
  
  hamburger?.addEventListener("click", () => {
    navLinks.classList.toggle("nav-active");
    hamburger.classList.toggle("toggle");
    sidebar.classList.toggle("open");
  });
  
  window.addEventListener("resize", () => {
    if (window.innerWidth > 720) {
      navLinks.classList.remove("nav-active");
      hamburger.classList.remove("toggle");
      sidebar.classList.remove("open");
    }
  });
}

// ====== EXPORT FOR CONSOLE ACCESS ======
window.playSong = playSong;
window.createPlaylist = createPlaylist;
window.searchAndPlay = searchAndPlay;
