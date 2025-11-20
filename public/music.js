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
let currentTrackData = null;
let playlist = [];
let currentAudioElement = null;

const localSongs = [
  {
    id: "faded",
    title: "Faded",
    artist: "Alan Walker",
    cover: "faded.jpg",
    file: "faded.mp3",
    isLocal: true
  }
];

// Helper to extract YouTube video ID
function extractVideoId(url) {
  if (!url) return null;
  if (url.includes("youtu.be/")) return url.split("youtu.be/")[1].split(/[?&]/)[0];
  if (url.includes("v=")) return url.split("v=")[1].split("&")[0];
  const m = url.match(/\/embed\/([A-Za-z0-9_\-]+)/);
  return m ? m[1] : null;
}

// Search songs from local library
function searchLocalSongs(query) {
  const q = query.toLowerCase().trim();
  if (!q) return null;
  for (const song of localSongs) {
    const titleMatch = song.title.toLowerCase() === q;
    const artistMatch = song.artist.toLowerCase() === q;
    const titlePartial = song.title.toLowerCase().includes(q);
    const artistPartial = song.artist.toLowerCase().includes(q);
    if (titleMatch || artistMatch || titlePartial || artistPartial) {
      return song;
    }
  }
  return null;
}

// Set local file
function setLocalFile(song) {
  if (!song || !song.isLocal) return;
  const player = document.getElementById(PLAYER_IFRAME_ID);
  const cover = document.getElementById(COVER_IMG_ID);
  const titleEl = document.getElementById(TITLE_ID);
  const artistEl = document.getElementById(ARTIST_ID);

  player.style.display = "none";
  currentVideoId = song.id;

  if (!currentAudioElement) {
    currentAudioElement = new Audio();
    currentAudioElement.addEventListener("play", () => {
      isPlaying = true;
      updatePlayButton();
      startProgressSimulation();
      startWaveAnimation();
    });
    currentAudioElement.addEventListener("pause", () => {
      isPlaying = false;
      updatePlayButton();
      stopProgressSimulation();
      stopWaveAnimation();
    });
  }

  currentAudioElement.src = song.file;
  currentAudioElement.play();
  isPlaying = true;

  cover.src = song.cover;
  titleEl.textContent = song.title;
  artistEl.textContent = song.artist;

  currentTrackData = {
    id: song.id,
    title: song.title,
    artist: song.artist,
    cover: song.cover,
    isLocal: true
  };

  updateMiniPlayer();
  updatePlayButton();
  setProgress(0);
  startProgressSimulation();
  startWaveAnimation();
}

// Set video (YouTube)
function setVideoById(vid) {
  const player = document.getElementById(PLAYER_IFRAME_ID);
  const cover = document.getElementById(COVER_IMG_ID);
  const titleEl = document.getElementById(TITLE_ID);
  const artistEl = document.getElementById(ARTIST_ID);

  if (!vid) return;

  if (currentAudioElement) {
    currentAudioElement.pause();
  }

  currentVideoId = vid;
  player.style.display = "none";
  player.src = `https://www.youtube.com/embed/${vid}?autoplay=1&controls=1&rel=0&modestbranding=1`;
  setTimeout(() => { player.style.display = ""; }, 10);
  isPlaying = true;

  cover.src = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;

  fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`)
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      titleEl.textContent = data?.title || "YouTube Video";
      artistEl.textContent = data?.author_name || "YouTube";
      currentTrackData = {
        id: vid,
        title: data?.title || "YouTube Video",
        artist: data?.author_name || "YouTube",
        cover: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
        isLocal: false
      };
      updateMiniPlayer();
    }).catch(_ => { titleEl.textContent = `Video: ${vid}`; artistEl.textContent = "YouTube"; currentTrackData = { id: vid, title: `Video: ${vid}`, artist: "YouTube", cover: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`, isLocal: false }; updateMiniPlayer(); });

  updatePlayButton();
  setProgress(0);
  startProgressSimulation();
  startWaveAnimation();
}

// Play/pause toggle
function togglePlay() {
  if (!currentVideoId) return;

  if (currentTrackData?.isLocal) {
    if (currentAudioElement) {
      if (isPlaying) {
        currentAudioElement.pause();
        isPlaying = false;
      } else {
        currentAudioElement.play();
        isPlaying = true;
      }
      updatePlayButton();
    }
  } else {
    const iframe = document.getElementById(PLAYER_IFRAME_ID);
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
}

function updatePlayButton() {
  document.getElementById(PLAY_BTN_ID).textContent = isPlaying ? "⏸" : "▶";
}

function updateMiniPlayer() {
  if (currentTrackData) {
    document.getElementById("miniCover").src = currentTrackData.cover;
  }
}

// Progress bar simulation
function setProgress(p) { document.getElementById(PROGRESS_FILL_ID).style.width = `${Math.max(0,Math.min(100,p))}%`; }
function startProgressSimulation() {
  clearInterval(progressInterval);
  let val = 0;
  progressInterval = setInterval(() => {
    if (!isPlaying) return;
    val += 0.7;
    if (val > 100) val = 0;
    setProgress(val);
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

// Playlist management
function addToPlaylist() {
  if (!currentTrackData) return;
  const exists = playlist.some(s => s.id === currentTrackData.id);
  if (!exists) {
    playlist.push(currentTrackData);
    renderPlaylist();
  }
}

function renderPlaylist() {
  const area = document.getElementById("playlistArea");
  if (playlist.length === 0) {
    area.innerHTML = '<div style="font-size:12px;color:var(--muted);margin-top:4px">No songs added yet</div>';
    return;
  }
  area.innerHTML = playlist.map((song, idx) => `
    <div class="playlist-item">
      <div class="playlist-item-cover">
        <img src="${song.cover}" alt="">
      </div>
      <div class="playlist-item-meta">
        <div class="title">${song.title}</div>
        <div class="artist">${song.artist}</div>
      </div>
      <button class="playlist-item-play" onclick="playFromPlaylist(${idx})" title="Play">▶</button>
    </div>
  `).join('');
}

function playFromPlaylist(idx) {
  const song = playlist[idx];
  if (song) {
    if (song.isLocal) {
      setLocalFile(song);
    } else {
      setVideoById(song.id);
    }
  }
}

// Show search message
function showSearchMessage(msg) {
  const msgEl = document.getElementById("searchMessage");
  msgEl.textContent = msg;
  msgEl.classList.add("show");
  setTimeout(() => { msgEl.classList.remove("show"); }, 2500);
}

// Load music
async function loadMusic() {
  const raw = document.getElementById(INPUT_ID).value.trim();
  if (!raw) return alert("Type a song name or paste a YouTube link.");

  const localSong = searchLocalSongs(raw);
  if (localSong) {
    setLocalFile(localSong);
    return;
  }

  const isUrl = /(youtube\.com|youtu\.be)/i.test(raw);
  if (isUrl) {
    const vid = extractVideoId(raw);
    if (!vid) return alert("Could not extract video id from link.");
    setVideoById(vid);
    return;
  }

  showSearchMessage("Song not found");
}

// DOM ready
document.addEventListener("DOMContentLoaded", () => {
  initWaveBars();
  document.getElementById(LOAD_BTN_ID).addEventListener("click", loadMusic);
  document.getElementById(PLAY_BTN_ID).addEventListener("click", togglePlay);
  document.getElementById("addToPlaylistBtn").addEventListener("click", addToPlaylist);
  document.getElementById("nextBtn").addEventListener("click", () => alert("Next not implemented"));
  document.getElementById("prevBtn").addEventListener("click", () => alert("Prev not implemented"));
  document.getElementById("rewBtn").addEventListener("click", () => alert("Rewind not precise in iframe"));
  document.getElementById("fwdBtn").addEventListener("click", () => alert("Forward not precise in iframe"));
  document.getElementById(INPUT_ID).addEventListener("keydown", e => { if(e.key==="Enter") loadMusic(); });
  renderPlaylist();
});

// Expose for HTML
window.loadMusic = loadMusic;
window.playFromPlaylist = playFromPlaylist;
