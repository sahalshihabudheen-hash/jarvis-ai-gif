// Famous song database
const songs = [
  {
    title: "Blinding Lights",
    artist: "The Weeknd",
    id: "fHI8X4OXluQ",
    cover: "https://i.ytimg.com/vi/fHI8X4OXluQ/hqdefault.jpg"
  },
  {
    title: "Starboy",
    artist: "The Weeknd",
    id: "34Na4j8AVgA",
    cover: "https://i.ytimg.com/vi/34Na4j8AVgA/hqdefault.jpg"
  },
  {
    title: "Save Your Tears",
    artist: "The Weeknd",
    id: "XXYlFuWEuKI",
    cover: "https://i.ytimg.com/vi/XXYlFuWEuKI/hqdefault.jpg"
  },
  {
    title: "Heat Waves",
    artist: "Glass Animals",
    id: "mRD0-GxqHVo",
    cover: "https://i.ytimg.com/vi/mRD0-GxqHVo/hqdefault.jpg"
  },
  {
    title: "Industry Baby",
    artist: "Lil Nas X",
    id: "UTHLKHL_whs",
    cover: "https://i.ytimg.com/vi/UTHLKHL_whs/hqdefault.jpg"
  },
  {
    title: "Unholy",
    artist: "Sam Smith",
    id: "TEpZyoLhK9M",
    cover: "https://i.ytimg.com/vi/TEpZyoLhK9M/hqdefault.jpg"
  }
];

let currentVideoId = null;
let isPlaying = false;

// Populate homepage songs
const grid = document.getElementById("songGrid");
songs.forEach(song => {
  const card = document.createElement("div");
  card.className = "song-card";
  card.innerHTML = `
    <img src="${song.cover}">
    <h4>${song.title}</h4>
    <p>${song.artist}</p>
  `;
  card.onclick = () => playSong(song);
  grid.appendChild(card);
});

// YouTube player
function playSong(s) {
  currentVideoId = s.id;
  document.getElementById("trackTitle").innerText = s.title;
  document.getElementById("trackArtist").innerText = s.artist;

  document.getElementById("ytPlayer").src =
    `https://www.youtube.com/embed/${s.id}?autoplay=1`;

  isPlaying = true;
  updatePlayButton();
  startWave();
}

document.getElementById("playBtn").onclick = () => {
  if (!currentVideoId) return;

  if (isPlaying) {
    document.getElementById("ytPlayer").src = "";
    isPlaying = false;
    stopWave();
  } else {
    document.getElementById("ytPlayer").src =
      `https://www.youtube.com/embed/${currentVideoId}?autoplay=1`;
    isPlaying = true;
    startWave();
  }
  updatePlayButton();
};

function updatePlayButton() {
  document.getElementById("playBtn").innerText = isPlaying ? "⏸" : "▶";
}

// Wave animation
function startWave() {
  document.querySelectorAll(".wave-bar").forEach(b => {
    b.style.animationPlayState = "running";
  });
}
function stopWave() {
  document.querySelectorAll(".wave-bar").forEach(b => {
    b.style.animationPlayState = "paused";
  });
}

// Create wave bars
const wave = document.getElementById("waveContainer");
for (let i = 0; i < 20; i++) {
  const bar = document.createElement("div");
  bar.className = "wave-bar";
  wave.appendChild(bar);
}

// Playlist system
let playlists = JSON.parse(localStorage.getItem("playlists") || "{}");

function savePlaylists() {
  localStorage.setItem("playlists", JSON.stringify(playlists));
}

function createPlaylist() {
  const name = prompt("Enter playlist name:");
  if (!name) return;
  playlists[name] = [];
  savePlaylists();
  loadPlaylists();
}

function loadPlaylists() {
  const box = document.getElementById("playlistList");
  box.innerHTML = "";
  for (let name in playlists) {
    const div = document.createElement("div");
    div.className = "playlist-item";
    div.innerText = name;
    div.onclick = () => openPlaylist(name);
    box.appendChild(div);
  }
}

function openPlaylist(name) {
  alert(`Playlist: ${name}\nSongs:\n${playlists[name].map(s => s.title).join("\n")}`);
}

loadPlaylists();
