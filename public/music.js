// -----------------------------
// music.js (extended)
// - Adds: click-to-play song cards
// - Adds: playlist creation, add/remove songs, play from playlists
// - Persists playlists in localStorage (key: "jarvis_playlists")
// - Keeps all original functions intact
// -----------------------------

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

// -----------------------------
// Helper to extract YouTube video ID
// -----------------------------
function extractVideoId(url) {
  if (!url) return null;
  try {
    // handle youtu.be short links
    if (url.includes("youtu.be/")) return url.split("youtu.be/")[1].split(/[?&]/)[0];
    // handle v= parameter
    if (url.includes("v=")) return url.split("v=")[1].split("&")[0];
    // handle embed path
    const m = url.match(/\/embed\/([A-Za-z0-9_\-]+)/);
    if (m) return m[1];
    // handle plain id (user might pass id directly)
    if (/^[A-Za-z0-9_-]{10,}$/.test(url)) return url;
  } catch (e) { /* ignore */ }
  return null;
}

// -----------------------------
// Set video (expects a video ID)
// -----------------------------
function setVideoById(vid) {
  const player = document.getElementById(PLAYER_IFRAME_ID);
  const cover = document.getElementById(COVER_IMG_ID);
  const titleEl = document.getElementById(TITLE_ID);
  const artistEl = document.getElementById(ARTIST_ID);

  if (!vid) return;
  currentVideoId = vid;
  // keep original embedding behavior: controls=1 so user can control when needed
  player.src = `https://www.youtube.com/embed/${vid}?autoplay=1&controls=1&rel=0&modestbranding=1`;
  isPlaying = true;

  cover.src = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;

  // try to get title/author via oEmbed (best effort)
  fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`)
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      titleEl.textContent = data?.title || "YouTube Video";
      artistEl.textContent = data?.author_name || "YouTube";
      // Also highlight current track in UI (optional)
      highlightCurrentPlayingInGrid(vid);
    }).catch(_ => {
      titleEl.textContent = `Video: ${vid}`;
      artistEl.textContent = "YouTube";
      highlightCurrentPlayingInGrid(vid);
    });

  updatePlayButton();
  setProgress(0);
  startProgressSimulation();
  startWaveAnimation();
}

// -----------------------------
// Play/pause toggle (original)
// -----------------------------
function togglePlay() {
  const iframe = document.getElementById(PLAYER_IFRAME_ID);
  if (!currentVideoId) return;
  if (isPlaying) {
    // stopping by clearing src (as original)
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

// -----------------------------
// Progress simulation (original)
// -----------------------------
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

// -----------------------------
// Soundwave bars (originally present)
// -----------------------------
function initWaveBars() {
  const container = document.getElementById(WAVE_CONTAINER_ID);
  if (!container) return;
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

// -----------------------------
// -----------------------------
// PLAYLIST SYSTEM (NEW)
// -----------------------------
const STORAGE_KEY = "jarvis_playlists";

function loadPlaylistsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data;
  } catch (e) {
    console.error("Failed to load playlists", e);
    return [];
  }
}

function savePlaylistsToStorage(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list || []));
  } catch (e) {
    console.error("Failed to save playlists", e);
  }
}

function createEmptyPlaylist(name) {
  return { id: `pl_${Date.now()}`, name: name || "New Playlist", songs: [] };
}

// Render playlist area UI
function renderPlaylists() {
  const area = document.getElementById("playlistArea");
  if (!area) return;
  const playlists = loadPlaylistsFromStorage();
  area.innerHTML = "";

  if (playlists.length === 0) {
    const note = document.createElement("div");
    note.style.color = "var(--muted)";
    note.style.fontSize = "14px";
    note.textContent = "No playlists yet — create one with the + Create Playlist button.";
    area.appendChild(note);
    return;
  }

  playlists.forEach(pl => {
    const plWrap = document.createElement("div");
    plWrap.style.background = "var(--glass)";
    plWrap.style.padding = "10px";
    plWrap.style.borderRadius = "10px";
    plWrap.style.display = "flex";
    plWrap.style.flexDirection = "column";
    plWrap.style.gap = "8px";

    // header
    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";

    const title = document.createElement("div");
    title.style.fontWeight = "700";
    title.style.color = "#e9f2ef";
    title.textContent = `${pl.name} (${pl.songs.length})`;
    header.appendChild(title);

    const controls = document.createElement("div");

    const playAllBtn = document.createElement("button");
    playAllBtn.textContent = "▶";
    playAllBtn.title = "Play first song";
    playAllBtn.style.marginRight = "8px";
    playAllBtn.className = "btn";
    playAllBtn.addEventListener("click", () => {
      if (pl.songs.length === 0) return alert("Playlist is empty.");
      const vid = pl.songs[0].videoId;
      setVideoById(vid);
    });
    controls.appendChild(playAllBtn);

    const delBtn = document.createElement("button");
    delBtn.textContent = "🗑";
    delBtn.title = "Delete playlist";
    delBtn.className = "btn";
    delBtn.addEventListener("click", () => {
      if (!confirm(`Delete playlist "${pl.name}" ?`)) return;
      const all = loadPlaylistsFromStorage();
      const filtered = all.filter(x => x.id !== pl.id);
      savePlaylistsToStorage(filtered);
      renderPlaylists();
    });
    controls.appendChild(delBtn);

    header.appendChild(controls);
    plWrap.appendChild(header);

    // song list
    if (pl.songs.length === 0) {
      const empty = document.createElement("div");
      empty.style.color = "var(--muted)";
      empty.textContent = "No songs — add songs from Featured Songs.";
      plWrap.appendChild(empty);
    } else {
      pl.songs.forEach((s, idx) => {
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.justifyContent = "space-between";
        row.style.alignItems = "center";
        row.style.gap = "8px";

        const left = document.createElement("div");
        left.style.display = "flex";
        left.style.alignItems = "center";
        left.style.gap = "10px";
        left.style.cursor = "pointer";

        const thumb = document.createElement("img");
        thumb.src = s.cover || `https://i.ytimg.com/vi/${s.videoId}/default.jpg`;
        thumb.style.width = "46px";
        thumb.style.height = "46px";
        thumb.style.objectFit = "cover";
        thumb.style.borderRadius = "6px";
        left.appendChild(thumb);

        const meta = document.createElement("div");
        const t = document.createElement("div");
        t.textContent = s.title || "Unknown";
        t.style.fontWeight = "600";
        t.style.color = "#e9f2ef";
        const a = document.createElement("div");
        a.textContent = s.artist || "Unknown";
        a.style.fontSize = "12px";
        a.style.color = "var(--muted)";
        meta.appendChild(t);
        meta.appendChild(a);
        left.appendChild(meta);

        left.addEventListener("click", () => {
          setVideoById(s.videoId);
        });

        // right controls
        const right = document.createElement("div");
        right.style.display = "flex";
        right.style.gap = "8px";
        right.style.alignItems = "center";

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "✖";
        removeBtn.title = "Remove song from playlist";
        removeBtn.className = "btn";
        removeBtn.addEventListener("click", () => {
          if (!confirm(`Remove "${s.title}" from "${pl.name}"?`)) return;
          const all = loadPlaylistsFromStorage();
          const target = all.find(x => x.id === pl.id);
          if (!target) return;
          target.songs = target.songs.filter(x => x.videoId !== s.videoId);
          savePlaylistsToStorage(all);
          renderPlaylists();
        });

        right.appendChild(removeBtn);

        row.appendChild(left);
        row.appendChild(right);
        plWrap.appendChild(row);
      });
    }

    area.appendChild(plWrap);
  });
}

// Add a song object to playlist id
function addSongToPlaylist(playlistId, songObj) {
  const all = loadPlaylistsFromStorage();
  const pl = all.find(x => x.id === playlistId);
  if (!pl) return alert("Playlist not found.");
  // avoid duplicates by videoId
  if (pl.songs.some(s => s.videoId === songObj.videoId)) {
    alert("Song already in playlist.");
    return;
  }
  pl.songs.push(songObj);
  savePlaylistsToStorage(all);
  renderPlaylists();
  alert(`Added "${songObj.title}" to "${pl.name}"`);
}

// -----------------------------
// Wire up Featured Songs grid
// - click card -> play
// - add small + button dynamically to add to playlists
// -----------------------------
function wireSongGrid() {
  const grid = document.getElementById("songGrid");
  if (!grid) return;
  const cards = Array.from(grid.querySelectorAll(".song-card"));

  cards.forEach(card => {
    // ensure card is position:relative so overlay buttons appear
    card.style.position = card.style.position || "relative";

    // main click -> play
    card.addEventListener("click", (ev) => {
      // if clicked on add-button, skip (handled separately)
      if (ev.target && (ev.target.classList && ev.target.classList.contains("add-to-pl-btn"))) {
        return;
      }
      const raw = card.getAttribute("data-id") || "";
      const vid = extractVideoId(raw);
      if (!vid) {
        // maybe data-id already contains id
        const maybeId = raw.trim();
        if (maybeId) {
          setVideoById(maybeId);
          return;
        }
        return alert("Cannot play this item (invalid video id).");
      }
      setVideoById(vid);
    });

    // create "Add" button on top-right of card
    const addBtn = document.createElement("button");
    addBtn.textContent = "+";
    addBtn.title = "Add to playlist";
    addBtn.className = "add-to-pl-btn";
    addBtn.style.position = "absolute";
    addBtn.style.top = "8px";
    addBtn.style.right = "8px";
    addBtn.style.width = "34px";
    addBtn.style.height = "34px";
    addBtn.style.borderRadius = "8px";
    addBtn.style.border = "none";
    addBtn.style.background = "rgba(0,0,0,0.45)";
    addBtn.style.color = "#fff";
    addBtn.style.cursor = "pointer";
    addBtn.style.zIndex = "5";
    addBtn.style.fontWeight = "700";
    addBtn.style.boxShadow = "0 6px 18px rgba(0,0,0,0.4)";
    card.appendChild(addBtn);

    // on click open small selection of playlists
    addBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openPlaylistChooserForCard(card, addBtn);
    });
  });
}

// Small chooser popover to pick playlist
function openPlaylistChooserForCard(card, anchorBtn) {
  // remove any existing chooser
  const existing = document.getElementById("playlistChooserPopover");
  if (existing) existing.remove();

  const playlists = loadPlaylistsFromStorage();

  const pop = document.createElement("div");
  pop.id = "playlistChooserPopover";
  pop.style.position = "absolute";
  pop.style.top = (anchorBtn.offsetTop + anchorBtn.offsetHeight + 6) + "px";
  pop.style.right = "8px";
  pop.style.background = "var(--card)";
  pop.style.padding = "10px";
  pop.style.borderRadius = "8px";
  pop.style.boxShadow = "0 10px 30px rgba(0,0,0,0.6)";
  pop.style.zIndex = 40;
  pop.style.minWidth = "180px";

  const title = document.createElement("div");
  title.textContent = "Add to playlist";
  title.style.fontWeight = "700";
  title.style.marginBottom = "8px";
  title.style.color = "#e9f2ef";
  pop.appendChild(title);

  if (playlists.length === 0) {
    const no = document.createElement("div");
    no.textContent = "No playlists yet.";
    no.style.color = "var(--muted)";
    no.style.marginBottom = "8px";
    pop.appendChild(no);

    const createNow = document.createElement("button");
    createNow.textContent = "+ Create";
    createNow.style.background = "var(--accent)";
    createNow.style.border = "none";
    createNow.style.padding = "8px 10px";
    createNow.style.borderRadius = "8px";
    createNow.style.cursor = "pointer";
    createNow.addEventListener("click", () => {
      const name = prompt("Playlist name:");
      if (!name) return;
      const all = loadPlaylistsFromStorage();
      all.push(createEmptyPlaylist(name));
      savePlaylistsToStorage(all);
      renderPlaylists();
      pop.remove();
    });
    pop.appendChild(createNow);
  } else {
    playlists.forEach(pl => {
      const r = document.createElement("div");
      r.style.display = "flex";
      r.style.justifyContent = "space-between";
      r.style.alignItems = "center";
      r.style.marginBottom = "6px";

      const left = document.createElement("div");
      left.textContent = pl.name;
      left.style.color = "#e9f2ef";
      left.style.cursor = "pointer";
      left.addEventListener("click", () => {
        // build song object from card
        const raw = card.getAttribute("data-id") || "";
        const vid = extractVideoId(raw) || raw;
        if (!vid) return alert("Invalid video id");
        const songObj = {
          videoId: vid,
          title: card.getAttribute("data-title") || card.querySelector("div")?.textContent || "Unknown",
          artist: card.getAttribute("data-artist") || "",
          cover: card.getAttribute("data-cover") || (card.querySelector("img")?.src || "")
        };
        addSongToPlaylist(pl.id, songObj);
        const chooser = document.getElementById("playlistChooserPopover");
        if (chooser) chooser.remove();
      });

      const cnt = document.createElement("div");
      cnt.textContent = `${pl.songs.length}`;
      cnt.style.color = "var(--muted)";

      r.appendChild(left);
      r.appendChild(cnt);
      pop.appendChild(r);
    });
  }

  // append pop to card
  card.appendChild(pop);

  // click outside to close
  function closeOnClickOutside(e) {
    if (!pop.contains(e.target) && e.target !== anchorBtn) {
      pop.remove();
      document.removeEventListener("click", closeOnClickOutside);
    }
  }
  setTimeout(() => document.addEventListener("click", closeOnClickOutside), 50);
}

// Highlight the current grid item (optional visual)
function highlightCurrentPlayingInGrid(vid) {
  const grid = document.getElementById("songGrid");
  if (!grid) return;
  const cards = Array.from(grid.querySelectorAll(".song-card"));
  cards.forEach(c => {
    const raw = c.getAttribute("data-id") || "";
    const id = extractVideoId(raw) || raw;
    if (id && vid && id === vid) {
      c.style.outline = "2px solid rgba(29,123,255,0.85)";
    } else {
      c.style.outline = "none";
    }
  });
}

// -----------------------------
// Load music (original + small tweak)
// -----------------------------
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
    // your original server endpoint; keep as-is
    const resp = await fetch(`/api/search?q=${encodeURIComponent(raw)}`);
    const data = await resp.json();
    if (!data.videoId) return alert("Search failed. Try a different query or paste a link.");
    setVideoById(data.videoId);
  } catch (err) { console.error(err); alert("Search failed. Try again."); }
}

// -----------------------------
// DOM ready (merged handlers)
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
  // original init
  initWaveBars();

  // wire song grid (featured songs)
  wireSongGrid();

  // render playlists from localStorage
  renderPlaylists();

  // event bindings (original)
  const loadBtn = document.getElementById(LOAD_BTN_ID);
  if (loadBtn) loadBtn.addEventListener("click", loadMusic);

  const playBtn = document.getElementById(PLAY_BTN_ID);
  if (playBtn) playBtn.addEventListener("click", togglePlay);

  const nextBtn = document.getElementById("nextBtn");
  if (nextBtn) nextBtn.addEventListener("click", () => alert("Next not implemented"));

  const prevBtn = document.getElementById("prevBtn");
  if (prevBtn) prevBtn.addEventListener("click", () => alert("Prev not implemented"));

  const rewBtn = document.getElementById("rewBtn");
  if (rewBtn) rewBtn.addEventListener("click", () => alert("Rewind not precise in iframe"));

  const fwdBtn = document.getElementById("fwdBtn");
  if (fwdBtn) fwdBtn.addEventListener("click", () => alert("Forward not precise in iframe"));

  const inputEl = document.getElementById(INPUT_ID);
  if (inputEl) inputEl.addEventListener("keydown", e => { if(e.key==="Enter") loadMusic(); });

  // create playlist button
  const createBtn = document.getElementById("createPlaylistBtn");
  if (createBtn) {
    createBtn.addEventListener("click", () => {
      const name = prompt("Playlist name:");
      if (!name) return;
      const all = loadPlaylistsFromStorage();
      all.push(createEmptyPlaylist(name));
      savePlaylistsToStorage(all);
      renderPlaylists();
    });
  }

  // clicking outside any open chooser should close it (safety)
  document.addEventListener("click", (e) => {
    const chooser = document.getElementById("playlistChooserPopover");
    if (chooser && !chooser.contains(e.target) && !e.target.classList.contains("add-to-pl-btn")) {
      chooser.remove();
    }
  });

});

// Expose for HTML (keep compatibility)
window.loadMusic = loadMusic;
