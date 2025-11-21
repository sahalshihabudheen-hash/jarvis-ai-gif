// Hamburger Menu Toggle
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("nav-links");

hamburger.addEventListener("click", () => {
  navLinks.classList.toggle("nav-active");
  hamburger.classList.toggle("toggle");
});

// Music Player Controls
const playBtn = document.querySelector(".player-controls .control-btn:nth-child(2)");
let isPlaying = false;

playBtn.addEventListener("click", () => {
  isPlaying = !isPlaying;
  playBtn.textContent = isPlaying ? "⏸" : "▶";
});

// Song Cards Play Button
const songCards = document.querySelectorAll(".song-card");

songCards.forEach(card => {
  const cardPlayBtn = card.querySelector(".play-btn");
  const albumArt = card.querySelector(".album-art");
  const songTitle = card.querySelector("h3").textContent;
  const artist = card.querySelector("p").textContent;

  cardPlayBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    
    // Update player info
    document.querySelector(".player-album").src = albumArt.src;
    document.querySelector(".player-title").textContent = songTitle;
    document.querySelector(".player-artist").textContent = artist;
    
    // Start playing
    isPlaying = true;
    playBtn.textContent = "⏸";
  });
});

// Seek Bar Progress Animation
const seekProgress = document.querySelector(".seek-progress");
let progress = 30;
let seekInterval;

function startSeekAnimation() {
  seekInterval = setInterval(() => {
    if (isPlaying) {
      progress += 0.1;
      if (progress > 100) progress = 0;
      seekProgress.style.width = progress + "%";
    }
  }, 100);
}

startSeekAnimation();

// Volume Control
const volumeSlider = document.querySelector(".volume-slider");
volumeSlider.addEventListener("input", (e) => {
  const value = e.target.value;
  // Volume control logic here
  console.log("Volume:", value);
});

// Previous/Next Track
const prevBtn = document.querySelector(".player-controls .control-btn:nth-child(1)");
const nextBtn = document.querySelector(".player-controls .control-btn:nth-child(3)");

let currentSongIndex = 0;
const songs = Array.from(songCards);

prevBtn.addEventListener("click", () => {
  currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
  loadSong(currentSongIndex);
});

nextBtn.addEventListener("click", () => {
  currentSongIndex = (currentSongIndex + 1) % songs.length;
  loadSong(currentSongIndex);
});

function loadSong(index) {
  const card = songs[index];
  const albumArt = card.querySelector(".album-art").src;
  const title = card.querySelector("h3").textContent;
  const artist = card.querySelector("p").textContent;
  
  document.querySelector(".player-album").src = albumArt;
  document.querySelector(".player-title").textContent = title;
  document.querySelector(".player-artist").textContent = artist;
  
  isPlaying = true;
  playBtn.textContent = "⏸";
  progress = 0;
}

// Close mobile menu when clicking a link
navLinks.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("nav-active");
    hamburger.classList.remove("toggle");
  });
});

// Search Functionality
const searchInput = document.getElementById("search-input");
const songsGrid = document.querySelector(".songs-grid");

searchInput.addEventListener("input", (e) => {
  const searchTerm = e.target.value.toLowerCase().trim();
  
  songCards.forEach(card => {
    const title = card.querySelector("h3").textContent.toLowerCase();
    const artist = card.querySelector("p").textContent.toLowerCase();
    
    if (title.includes(searchTerm) || artist.includes(searchTerm)) {
      card.style.display = "block";
      
      // Auto-play first matching song
      if (searchTerm && title.includes(searchTerm)) {
        const firstMatch = Array.from(songCards).find(c => {
          const t = c.querySelector("h3").textContent.toLowerCase();
          return t.includes(searchTerm) && c.style.display !== "none";
        });
        
        if (firstMatch === card) {
          setTimeout(() => {
            const albumArt = card.querySelector(".album-art").src;
            const songTitle = card.querySelector("h3").textContent;
            const artistName = card.querySelector("p").textContent;
            
            document.querySelector(".player-album").src = albumArt;
            document.querySelector(".player-title").textContent = songTitle;
            document.querySelector(".player-artist").textContent = artistName;
            
            isPlaying = true;
            playBtn.textContent = "⏸";
            progress = 0;
          }, 300);
        }
      }
    } else {
      card.style.display = "none";
    }
  });
  
  // Show all songs if search is empty
  if (!searchTerm) {
    songCards.forEach(card => {
      card.style.display = "block";
    });
  }
});
