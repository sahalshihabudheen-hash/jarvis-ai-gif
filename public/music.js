// JARVIS Music Player - YouTube Edition with Working Search
// Features: YouTube embeds, Playlists, Auto-next, Real YouTube Search

const STORAGE_KEY = "jarvis_playlists";
const NUM_BARS = 20;

// State
let playlists = {};
let currentPlaylist = null;
let currentTrackIndex = 0;
let currentSong = null;
let isPlaying = false;
let waveBars = [];
let player = null;
let playerReady = false;
let displayedSongs = [];

// Song Library with YouTube Video IDs
const songLibrary = [
  { videoId: "fHI8X4OXluQ", title: "Blinding Lights", artist: "The Weeknd" },
  { videoId: "34Na4j8AVgA", title: "Starboy", artist: "The Weeknd" },
  { videoId: "XXYlFuWEuKI", title: "Save Your Tears", artist: "The Weeknd" },
  { videoId: "mRD0-GxqHVo", title: "Heat Waves", artist: "Glass Animals" },
  { videoId: "kJQP7kiw9Fk", title: "As It Was", artist: "Harry Styles" },
  { videoId: "60ItHLz5WEA", title: "Faded", artist: "Alan Walker" },
  { videoId: "RgKAFK5djSk", title: "Wasted Summers", artist: "juju" },
  { videoId: "FM7MFYoylVs", title: "Shape of You", artist: "Ed Sheeran" },
  { videoId: "CevxZvSJLk8", title: "Rockstar", artist: "Post Malone" },
  { videoId: "JGwWNGJdvx8", title: "Shape of You", artist: "Ed Sheeran" }
];

// ====== YOUTUBE API INTEGRATION ======
function onYouTubeIframeAPIReady() {
  console.log("🎬 YouTube API Ready");
  player = new YT.Player('ytPlayer', {
    height: '1',
    width: '1',
    videoId: songLibrary[0].videoId,
    playerVars: {
      autoplay: 0,
      controls: 0,
      enablejsapi: 1,
      origin: window.location.origin
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
      onError: onPlayerError
    }
  });
}

function onPlayerReady(event) {
  console.log("✅ YouTube Player Ready");
  playerReady = true;
}

function onPlayerStateChange(event) {
  const states = {
    '-1': 'unstarted',
    '0': 'ended',
    '1': 'playing',
    '2': 'paused',
    '3': 'buffering',
    '5': 'cued'
  };
  
  console.log(`🎵 Player state: ${states[event.data]}`);
  
  if (event.data === YT.PlayerState.ENDED) {
    console.log("🔄 Song ended, playing next...");
    playNext();
  } else if (event.data === YT.PlayerState.PLAYING) {
    isPlaying = true;
    updatePlayButton();
    startWaveAnimation();
  } else if (event.data === YT.PlayerState.PAUSED) {
    isPlaying = false;
    updatePlayButton();
    stopWaveAnimation();
  }
}

function onPlayerError(event) {
  console.error("❌ YouTube Player Error:", event.data);
  showToast("Playback error. Trying next song...", true);
  setTimeout(() => playNext(), 1500);
}

// ====== INITIALIZATION ======
document.addEventListener("DOMContentLoaded", () => {
  loadPlaylists();
  displayedSongs = [...songLibrary];
  renderSongGrid();
  initWaveBars();
  setupEventListeners();
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
    playSong(track.videoId, track.title, track.artist);
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
      <img src="${getThumbnail(song.videoId)}" alt="${song.title}" />
      <div class="playlist-song-info">
        <div class="title">${song.title}</div>
        <div class="artist">${song.artist}</div>
      </div>
      <button class="remove-song-btn" data-index="${index}">×</button>
    `;
    
    item.addEventListener("click", (e) => {
      if (!e.target.classList.contains("remove-song-btn")) {
        currentTrackIndex = index;
        playSong(song.videoId, song.title, song.artist);
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
  showToast(`Playlist "${name}" created!`);
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
  
  const exists = playlists[playlistName].some(s => s.videoId === currentSong.videoId);
  if (exists) {
    alert("Song already in playlist");
    return;
  }
  
  playlists[playlistName].push({
    videoId: currentSong.videoId,
    title: currentSong.title,
    artist: currentSong.artist
  });
  
  savePlaylists();
  if (currentPlaylist === playlistName) renderPlaylistSongs();
  closePopup("addToPlaylistPopup");
  showToast(`Added to "${playlistName}"`);
}

function addSongToPlaylist(videoId, title, artist) {
  const plNames = Object.keys(playlists);
  if (plNames.length === 0) return alert("No playlists! Create one first.");
  
  const container = document.getElementById("playlistOptions");
  container.innerHTML = "";
  
  plNames.forEach(name => {
    const option = document.createElement("div");
    option.className = "playlist-option";
    option.textContent = `${name} (${playlists[name].length} songs)`;
    option.addEventListener("click", () => {
      const exists = playlists[name].some(s => s.videoId === videoId);
      if (exists) {
        alert("Song already in playlist");
        return;
      }
      
      playlists[name].push({ videoId, title, artist });
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
  
  displayedSongs.forEach(song => {
    const card = document.createElement("div");
    card.className = "song-card";
    
    card.innerHTML = `
      <img class="song-cover" src="${getThumbnail(song.videoId)}" alt="${song.title}">
      <div class="song-meta">
        <div class="title">${song.title}</div>
        <div class="artist muted">${song.artist}</div>
      </div>
      <button class="add-to-pl-btn" title="Add to playlist">+</button>
    `;
    
    card.addEventListener("click", (e) => {
      if (!e.target.classList.contains("add-to-pl-btn")) {
        playSong(song.videoId, song.title, song.artist);
      }
    });
    
    const addBtn = card.querySelector(".add-to-pl-btn");
    addBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      addSongToPlaylist(song.videoId, song.title, song.artist);
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

// ====== PLAYER CONTROLS ======
function playSong(videoId, title, artist) {
  if (!playerReady) {
    showToast("Player not ready yet. Wait a moment...", true);
    return;
  }
  
  console.log(`🎵 Playing: ${title} by ${artist}`);
  console.log(`🔗 Video ID: ${videoId}`);
  
  currentSong = { videoId, title, artist };
  updateNowPlaying(videoId, title, artist);
  
  try {
    player.loadVideoById(videoId);
    player.playVideo();
    showToast(`Playing: ${title}`);
  } catch (error) {
    console.error("❌ Play error:", error);
    showToast("Failed to play video", true);
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
  if (!playerReady) {
    showToast("Player not ready", true);
    return;
  }
  
  if (!currentSong) {
    alert("No song selected");
    return;
  }
  
  try {
    const state = player.getPlayerState();
    
    if (state === YT.PlayerState.PLAYING) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  } catch (error) {
    console.error("Toggle play error:", error);
  }
}

function updatePlayButton() {
  document.getElementById("playBtn").textContent = isPlaying ? "⏸" : "▶";
}

function playNext() {
  if (!currentPlaylist || !playlists[currentPlaylist] || playlists[currentPlaylist].length === 0) {
    // Try playing next song from displayed songs if no playlist
    if (!currentSong) return;
    const currentIndex = displayedSongs.findIndex(s => s.videoId === currentSong.videoId);
    if (currentIndex >= 0 && currentIndex < displayedSongs.length - 1) {
      const nextSong = displayedSongs[currentIndex + 1];
      playSong(nextSong.videoId, nextSong.title, nextSong.artist);
    }
    return;
  }
  
  currentTrackIndex = (currentTrackIndex + 1) % playlists[currentPlaylist].length;
  const track = playlists[currentPlaylist][currentTrackIndex];
  playSong(track.videoId, track.title, track.artist);
}

function playPrev() {
  if (!currentPlaylist || !playlists[currentPlaylist] || playlists[currentPlaylist].length === 0) {
    // Try playing previous song from displayed songs if no playlist
    if (!currentSong) return;
    const currentIndex = displayedSongs.findIndex(s => s.videoId === currentSong.videoId);
    if (currentIndex > 0) {
      const prevSong = displayedSongs[currentIndex - 1];
      playSong(prevSong.videoId, prevSong.title, prevSong.artist);
    }
    return;
  }
  
  currentTrackIndex = (currentTrackIndex - 1 + playlists[currentPlaylist].length) % playlists[currentPlaylist].length;
  const track = playlists[currentPlaylist][currentTrackIndex];
  playSong(track.videoId, track.title, track.artist);
}

// ====== YOUTUBE SEARCH (NO API KEY) ======
async function searchYouTube(query) {
  try {
    console.log(`🔍 Searching YouTube for: ${query}`);
    
    // Use CORS proxy to fetch YouTube search results
    const encodedQuery = encodeURIComponent(query);
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://www.youtube.com/results?search_query=${encodedQuery}`)}`;
    
    const response = await fetch(proxyUrl);
    const html = await response.text();
    
    // Extract video IDs using regex
    const videoIdRegex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
    const titleRegex = /"title":{"runs":\[{"text":"([^"]+)"/g;
    
    const videoIds = [];
    const titles = [];
    
    let match;
    while ((match = videoIdRegex.exec(html)) !== null) {
      if (videoIds.length < 10) {
        videoIds.push(match[1]);
      }
    }
    
    while ((match = titleRegex.exec(html)) !== null) {
      if (titles.length < 10) {
        titles.push(match[1]);
      }
    }
    
    // Create results array
    const results = [];
    for (let i = 0; i < Math.min(videoIds.length, 10); i++) {
      results.push({
        videoId: videoIds[i],
        title: titles[i] || "Unknown Title",
        artist: "YouTube"
      });
    }
    
    console.log(`✅ Found ${results.length} videos`);
    return results;
    
  } catch (error) {
    console.error("❌ Search error:", error);
    throw error;
  }
}

async function searchAndPlay() {
  const input = document.getElementById("ytInput").value.trim();
  if (!input) return showToast("Enter a song name or YouTube link", true);
  
  // Check if it's a YouTube URL
  const videoId = extractVideoId(input);
  if (videoId) {
    playSong(videoId, "YouTube Video", "YouTube");
    return;
  }
  
  // First, search in song library
  const query = input.toLowerCase();
  const libraryFound = songLibrary.find(song => 
    song.title.toLowerCase().includes(query) || 
    song.artist.toLowerCase().includes(query)
  );
  
  if (libraryFound) {
    playSong(libraryFound.videoId, libraryFound.title, libraryFound.artist);
    return;
  }
  
  // If not found in library, search YouTube
  const loadBtn = document.getElementById("loadBtn");
  const originalText = loadBtn.textContent;
  loadBtn.innerHTML = '<span class="loading-spinner"></span> Searching...';
  loadBtn.disabled = true;
  
  try {
    const results = await searchYouTube(input);
    
    if (results.length === 0) {
      showToast("No results found", true);
      loadBtn.textContent = originalText;
      loadBtn.disabled = false;
      return;
    }
    
    // Update displayed songs with search results
    displayedSongs = results;
    renderSongGrid();
    
    // Play first result
    const firstResult = results[0];
    playSong(firstResult.videoId, firstResult.title, firstResult.artist);
    
    showToast(`Found ${results.length} results. Playing first match.`);
    
  } catch (error) {
    console.error("Search failed:", error);
    showToast("Search failed. Try pasting a YouTube link instead.", true);
  } finally {
    loadBtn.textContent = originalText;
    loadBtn.disabled = false;
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
  
  // Search
  document.getElementById("loadBtn").addEventListener("click", searchAndPlay);
  document.getElementById("ytInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") searchAndPlay();
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
window.searchYouTube = searchYouTube;
window.player = player;
