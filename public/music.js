// music.js — consolidated & fixed
// - Click-to-play featured songs
// - Playlist create/delete/add/remove, saved in localStorage (key: jarvis_playlists)
// - Queue support + Next / Prev
// - Wave & progress simulation preserved
// - Non-destructive: defensive checks for missing elements

/* ============================
   Config / DOM IDs (match your HTML)
   ============================ */
const INPUT_ID = "ytInput";
const LOAD_BTN_ID = "loadBtn";
const PLAYER_IFRAME_ID = "ytPlayer";
const COVER_IMG_ID = "coverImg";
const TITLE_ID = "trackTitle";
const ARTIST_ID = "trackArtist";
const PLAY_BTN_ID = "playBtn";
const PROGRESS_FILL_ID = "progressFill";
const WAVE_CONTAINER_ID = "waveContainer";

const STORAGE_KEY = "jarvis_playlists";
const NUM_BARS = 20;

/* ============================
   State
   ============================ */
let currentVideoId = null;
let isPlaying = false;
let progressInterval = null;
let waveBars = [];
let currentQueue = []; // array of videoIds in current queue
let currentIndex = -1;  // index into currentQueue

/* ============================
   Utility: extract video id
   Accepts youtube URLs, embed urls, or plain ids
   ============================ */
function extractVideoId(url) {
  if (!url) return null;
  try {
    url = url.trim();
    // plain id
    if (/^[A-Za-z0-9_-]{10,}$/.test(url)) return url;
    // youtu.be short
    if (url.includes("youtu.be/")) return url.split("youtu.be/")[1].split(/[?&]/)[0];
    // v= param
    if (url.includes("v=")) return url.split("v=")[1].split("&")[0];
    // embed path
    const m = url.match(/\/embed\/([A-Za-z0-9_\-]+)/);
    if (m) return m[1];
  } catch (e) { /* ignore */ }
  return null;
}

/* ============================
   Player: set video by ID (core)
   - uses embed URL with autoplay
   - updates cover, title via oEmbed when possible
   - sets queue/index if present
   ============================ */
function setVideoById(vid) {
  if (!vid) return;
  const player = document.getElementById(PLAYER_IFRAME_ID);
  const cover = document.getElementById(COVER_IMG_ID);
  const titleEl = document.getElementById(TITLE_ID);
  const artistEl = document.getElementById(ARTIST_ID);

  // set iframe src (controls=1 kept)
  if (player) {
    // include modestbranding & rel & autoplay
    player.src = `https://www.youtube.com/embed/${vid}?autoplay=1&controls=1&rel=0&modestbranding=1`;
  }

  currentVideoId = vid;
  isPlaying = true;

  // update cover if element present
  if (cover) cover.src = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;

  // try to fetch title/author via oEmbed
  if (titleEl || artistEl) {
    fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (titleEl) titleEl.textContent = data?.title || `Video: ${vid}`;
        if (artistEl) artistEl.textContent = data?.author_name || "YouTube";
        highlightCurrentPlayingInGrid(vid);
      }).catch(() => {
        if (titleEl) titleEl.textContent = `Video: ${vid}`;
        if (artistEl) artistEl.textContent = "YouTube";
        highlightCurrentPlayingInGrid(vid);
      });
  }

  // If this vid exists inside currentQueue, set currentIndex accordingly
  const idx = currentQueue.indexOf(vid);
  if (idx !== -1) currentIndex = idx;
  else {
    // set queue to this single vid (unless queue already exists and user expects queue behavior)
    currentQueue = [vid];
    currentIndex = 0;
  }

  updatePlayButton();
  setProgress(0);
  startProgressSimulation();
  startWaveAnimation();
}

/* ============================
   Play / Pause toggle
   - keeps original simple behavior (clear src to stop)
   ============================ */
function togglePlay() {
  const player = document.getElementById(PLAYER_IFRAME_ID);
  if (!currentVideoId) return;
  if (isPlaying) {
    if (player) player.src = ""; // stop
    isPlaying = false;
    updatePlayButton();
    stopProgressSimulation();
    stopWaveAnimation();
  } else {
    if (player) player.src = `https://www.youtube.com/embed/${currentVideoId}?autoplay=1&controls=1&rel=0&modestbranding=1`;
    isPlaying = true;
    updatePlayButton();
    startProgressSimulation();
    startWaveAnimation();
  }
}
function updatePlayButton() {
  const el = document.getElementById(PLAY_BTN_ID);
  if (!el) return;
  el.textContent = isPlaying ? "⏸" : "▶";
}

/* ============================
   Progress simulation (visual only)
   ============================ */
function setProgress(p) {
  const fill = document.getElementById(PROGRESS_FILL_ID);
  if (!fill) return;
  fill.style.width = `${Math.max(0, Math.min(100, p))}%`;
}
function startProgressSimulation() {
  clearInterval(progressInterval);
  let val = 0;
  progressInterval = setInterval(() => {
    if (!isPlaying) return;
    val += 0.7;
    if (val > 100) val = 0;
    setProgress(val);
  }, 500);
}
function stopProgressSimulation() {
  clearInterval(progressInterval);
}

/* ============================
   Wave bars init/start/stop
   ============================ */
function initWaveBars() {
  const container = document.getElementById(WAVE_CONTAINER_ID);
  if (!container) return;
  container.innerHTML = "";
  waveBars = [];
  for (let i = 0; i < NUM_BARS; i++) {
    const bar = document.createElement("div");
    bar.className = "wave-bar";
    // use CSS variable --scale to vary heights if CSS uses it
    bar.style.setProperty("--scale", Math.random().toString());
    container.appendChild(bar);
    waveBars.push(bar);
  }
}
function startWaveAnimation() { waveBars.forEach(b => b.style.animationPlayState = "running"); }
function stopWaveAnimation() { waveBars.forEach(b => b.style.animationPlayState = "paused"); }

/* ============================
   Play queue helpers: next / prev
   - next() moves forward in currentQueue (wraps)
   - prev() moves backward (wraps)
   ============================ */
function next() {
  if (!currentQueue || currentQueue.length === 0) return alert("Queue is empty.");
  currentIndex = (currentIndex + 1) % currentQueue.length;
  setVideoById(currentQueue[currentIndex]);
}
function prev() {
  if (!currentQueue || currentQueue.length === 0) return alert("Queue is empty.");
  currentIndex = (currentIndex - 1 + currentQueue.length) % currentQueue.length;
  setVideoById(currentQueue[currentIndex]);
}

/* ============================
   Playlists: load/save/create/delete/add/remove
   Data format: [{id,name,songs:[{videoId,title,artist,cover}]}, ...]
   ============================ */
function loadPlaylistsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("loadPlaylists error", e);
    return [];
  }
}
function savePlaylistsToStorage(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list || []));
  } catch (e) { console.error("savePlaylists error", e); }
}
function createEmptyPlaylist(name) {
  return { id: `pl_${Date.now()}`, name: name || "New Playlist", songs: [] };
}

/* Render playlists into playlistArea and sidebar quick list if present */
function renderPlaylists() {
  const area = document.getElementById("playlistArea");
  const sidebarList = document.getElementById("sidebarPlaylists");
  const playlists = loadPlaylistsFromStorage();

  if (area) {
    area.innerHTML = "";
    if (playlists.length === 0) {
      const note = document.createElement("div");
      note.style.color = "var(--muted)";
      note.style.fontSize = "14px";
      note.textContent = "No playlists yet — create one with the + Create Playlist button.";
      area.appendChild(note);
    } else {
      playlists.forEach(pl => {
        const plWrap = document.createElement("div");
        plWrap.style.background = "var(--glass)";
        plWrap.style.padding = "10px";
        plWrap.style.borderRadius = "10px";
        plWrap.style.marginBottom = "10px";
        plWrap.style.display = "flex";
        plWrap.style.flexDirection = "column";
        plWrap.style.gap = "8px";

        const header = document.createElement("div");
        header.style.display = "flex";
        header.style.justifyContent = "space-between";
        header.style.alignItems = "center";

        const title = document.createElement("div");
        title.textContent = `${pl.name} (${pl.songs.length})`;
        title.style.fontWeight = "700";
        title.style.color = "#e9f2ef";

        const controls = document.createElement("div");

        const playAllBtn = document.createElement("button");
        playAllBtn.textContent = "▶";
        playAllBtn.className = "btn";
        playAllBtn.title = "Play first song";
        playAllBtn.style.marginRight = "8px";
        playAllBtn.onclick = (e) => {
          e.stopPropagation();
          if (pl.songs.length === 0) return alert("Playlist is empty.");
          currentQueue = pl.songs.map(s => s.videoId);
          currentIndex = 0;
          setVideoById(currentQueue[0]);
        };

        const delBtn = document.createElement("button");
        delBtn.textContent = "🗑";
        delBtn.className = "btn";
        delBtn.title = "Delete playlist";
        delBtn.onclick = (e) => {
          e.stopPropagation();
          if (!confirm(`Delete playlist "${pl.name}" ?`)) return;
          const all = loadPlaylistsFromStorage();
          const filtered = all.filter(x => x.id !== pl.id);
          savePlaylistsToStorage(filtered);
          renderPlaylists();
          renderSidebarPlaylists();
        };

        controls.appendChild(playAllBtn);
        controls.appendChild(delBtn);
        header.appendChild(title);
        header.appendChild(controls);
        plWrap.appendChild(header);

        if (pl.songs.length === 0) {
          const empty = document.createElement("div");
          empty.style.color = "var(--muted)";
          empty.textContent = "No songs — add songs from Featured Songs.";
          plWrap.appendChild(empty);
        } else {
          pl.songs.forEach(s => {
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

            left.appendChild(thumb);
            left.appendChild(meta);
            left.onclick = () => setVideoById(s.videoId);

            const right = document.createElement("div");
            right.style.display = "flex";
            right.style.gap = "8px";

            const removeBtn = document.createElement("button");
            removeBtn.textContent = "✖";
            removeBtn.className = "btn";
            removeBtn.title = "Remove";
            removeBtn.onclick = (e) => {
              e.stopPropagation();
              if (!confirm(`Remove "${s.title}" from "${pl.name}"?`)) return;
              const all = loadPlaylistsFromStorage();
              const target = all.find(x => x.id === pl.id);
              if (!target) return;
              target.songs = target.songs.filter(x => x.videoId !== s.videoId);
              savePlaylistsToStorage(all);
              renderPlaylists();
              renderSidebarPlaylists();
            };

            right.appendChild(removeBtn);
            row.appendChild(left);
            row.appendChild(right);
            plWrap.appendChild(row);
          });
        }

        area.appendChild(plWrap);
      });
    }
  }

  // sidebar quick list
  if (sidebarList) {
    sidebarList.innerHTML = "";
    playlists.forEach(pl => {
      const btn = document.createElement("button");
      btn.className = "pl-btn";
      btn.textContent = `${pl.name} (${pl.songs.length})`;
      btn.onclick = () => {
        // open: play first song if available
        if (pl.songs.length === 0) return alert("Playlist empty.");
        currentQueue = pl.songs.map(s => s.videoId);
        currentIndex = 0;
        setVideoById(currentQueue[0]);
      };
      sidebarList.appendChild(btn);
    });
  }
}

/* wrapper to render sidebar list */
const sidebarList = document.getElementById("sidebarPlaylists");

/* Add song object to a playlist by playlist id */
function addSongToPlaylist(playlistId, songObj) {
  const all = loadPlaylistsFromStorage();
  const pl = all.find(x => x.id === playlistId);
  if (!pl) return alert("Playlist not found.");
  if (pl.songs.some(s => s.videoId === songObj.videoId)) {
    return alert("Song already in playlist.");
  }
  pl.songs.push(songObj);
  savePlaylistsToStorage(all);
  renderPlaylists();
  renderSidebarPlaylists();
  alert(`Added "${songObj.title}" to "${pl.name}"`);
}

/* Small helper to update sidebar playlists (used after changes) */
function renderSidebarPlaylists() {
  // reuse renderPlaylists which also updates sidebar if present
  renderPlaylists();
}

/* ============================
   Wire featured song grid (cards are in HTML)
   - clicks -> play
   - + button opens chooser
   ============================ */
function wireSongGrid() {
  const grid = document.getElementById("songGrid");
  if (!grid) return;

  // attach add buttons and click behavior dynamically
  const cards = Array.from(grid.querySelectorAll(".song-card"));

  cards.forEach(card => {
    // ensure position relative
    if (!card.style.position) card.style.position = "relative";

    // primary click: play (skip if add button clicked)
    card.addEventListener("click", (ev) => {
      if (ev.target && ev.target.classList && ev.target.classList.contains("add-to-pl-btn")) return;
      const raw = card.getAttribute("data-id") || card.dataset.id || "";
      const vid = extractVideoId(raw) || raw;
      if (!vid) return alert("Cannot play this item (invalid video id).");
      // set queue to all cards' ids (so next/prev work). Build array of all visible card ids
      const allIds = cards.map(c => extractVideoId(c.getAttribute("data-id") || c.dataset.id) || (c.getAttribute("data-id") || c.dataset.id));
      currentQueue = allIds.filter(x => !!x);
      currentIndex = currentQueue.indexOf(vid);
      if (currentIndex === -1) { currentQueue = [vid]; currentIndex = 0; }
      setVideoById(vid);
    });

    // add button already exists in markup — ensure handler
    const addBtn = card.querySelector(".add-to-pl-btn");
    if (addBtn) {
      addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openPlaylistChooserForCard(card, addBtn);
      });
    } else {
      // if not present, create it
      const btn = document.createElement("button");
      btn.className = "add-to-pl-btn";
      btn.textContent = "+";
      btn.title = "Add to playlist";
      btn.style.position = "absolute";
      btn.style.top = "8px";
      btn.style.right = "8px";
      btn.style.zIndex = "5";
      card.appendChild(btn);
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openPlaylistChooserForCard(card, btn);
      });
    }
  });
}

/* Playlist chooser popover for a card */
function openPlaylistChooserForCard(card, anchorBtn) {
  // close existing
  const existing = document.getElementById("playlistChooserPopover");
  if (existing) existing.remove();

  const playlists = loadPlaylistsFromStorage();

  const pop = document.createElement("div");
  pop.id = "playlistChooserPopover";
  pop.style.position = "absolute";
  pop.style.top = (anchorBtn.offsetTop + anchorBtn.offsetHeight + 6) + "px";
  pop.style.right = "8px";
  pop.style.background = "var(--card, #0f1720)";
  pop.style.color = "#e9f2ef";
  pop.style.padding = "10px";
  pop.style.borderRadius = "8px";
  pop.style.boxShadow = "0 10px 30px rgba(0,0,0,0.6)";
  pop.style.zIndex = 9999;
  pop.style.minWidth = "180px";

  const title = document.createElement("div");
  title.textContent = "Add to playlist";
  title.style.fontWeight = "700";
  title.style.marginBottom = "8px";
  pop.appendChild(title);

  if (playlists.length === 0) {
    const no = document.createElement("div");
    no.textContent = "No playlists yet.";
    no.style.color = "var(--muted)";
    no.style.marginBottom = "8px";
    pop.appendChild(no);

    const createNow = document.createElement("button");
    createNow.textContent = "+ Create";
    createNow.style.background = "var(--accent, #1d7bff)";
    createNow.style.border = "none";
    createNow.style.padding = "8px 10px";
    createNow.style.borderRadius = "8px";
    createNow.style.cursor = "pointer";
    createNow.onclick = () => {
      const name = prompt("Playlist name:");
      if (!name) return;
      const all = loadPlaylistsFromStorage();
      all.push(createEmptyPlaylist(name));
      savePlaylistsToStorage(all);
      renderPlaylists();
      renderSidebarPlaylists();
      pop.remove();
    };
    pop.appendChild(createNow);
  } else {
    playlists.forEach(pl => {
      const r = document.createElement("div");
      r.style.display = "flex";
      r.style.justifyContent = "space-between";
      r.style.alignItems = "center";
      r.style.marginBottom = "6px";
      r.style.cursor = "pointer";

      const left = document.createElement("div");
      left.textContent = pl.name;
      left.style.color = "#e9f2ef";
      left.onclick = () => {
        // build song object from card
        const raw = card.getAttribute("data-id") || card.dataset.id || "";
        const vid = extractVideoId(raw) || raw;
        if (!vid) return alert("Invalid video id");
        const songObj = {
          videoId: vid,
          title: card.getAttribute("data-title") || card.dataset.title || (card.querySelector(".title")?.textContent || card.querySelector("h4")?.textContent || "Unknown"),
          artist: card.getAttribute("data-artist") || card.dataset.artist || (card.querySelector(".artist")?.textContent || ""),
          cover: card.getAttribute("data-cover") || card.dataset.cover || (card.querySelector("img")?.src || "")
        };
        addSongToPlaylist(pl.id, songObj);
        const chooser = document.getElementById("playlistChooserPopover");
        if (chooser) chooser.remove();
      };

      const cnt = document.createElement("div");
      cnt.textContent = `${pl.songs.length}`;
      cnt.style.color = "var(--muted)";

      r.appendChild(left);
      r.appendChild(cnt);
      pop.appendChild(r);
    });
  }

  // attach to card
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

/* Highlight currently playing card in the grid */
function highlightCurrentPlayingInGrid(vid) {
  const grid = document.getElementById("songGrid");
  if (!grid) return;
  const cards = Array.from(grid.querySelectorAll(".song-card"));
  cards.forEach(c => {
    const raw = c.getAttribute("data-id") || c.dataset.id || "";
    const id = extractVideoId(raw) || raw;
    if (id && vid && id === vid) {
      c.style.outline = "2px solid rgba(29,123,255,0.85)";
    } else {
      c.style.outline = "none";
    }
  });
}

/* ============================
   loadMusic (search) - keeps original API call
   ============================ */
async function loadMusic() {
  const input = document.getElementById(INPUT_ID);
  if (!input) return alert("Search input not found.");
  const raw = input.value.trim();
  if (!raw) return alert("Type a song name or paste a YouTube link.");
  const isUrl = /(youtube\.com|youtu\.be)/i.test(raw);
  if (isUrl) {
    const vid = extractVideoId(raw);
    if (!vid) return alert("Could not extract video id from link.");
    // set queue to this single item
    currentQueue = [vid];
    currentIndex = 0;
    setVideoById(vid);
    return;
  }
  try {
    const resp = await fetch(`/api/search?q=${encodeURIComponent(raw)}`);
    const data = await resp.json();
    if (!data.videoId) return alert("Search failed. Try a different query or paste a link.");
    currentQueue = [data.videoId];
    currentIndex = 0;
    setVideoById(data.videoId);
  } catch (err) {
    console.error(err);
    alert("Search failed. Try again.");
  }
}

/* ============================
   DOM ready: initialize everything and wire controls
   ============================ */
document.addEventListener("DOMContentLoaded", () => {
  // Waves
  initWaveBars();

  // Wire featured grid (cards must exist in HTML)
  wireSongGrid();

  // Render playlists
  renderPlaylists();

  // Hook up search/load
  const loadBtn = document.getElementById(LOAD_BTN_ID);
  if (loadBtn) loadBtn.addEventListener("click", loadMusic);
  const inputEl = document.getElementById(INPUT_ID);
  if (inputEl) inputEl.addEventListener("keydown", e => { if (e.key === "Enter") loadMusic(); });

  // Play button
  const playBtn = document.getElementById(PLAY_BTN_ID);
  if (playBtn) playBtn.addEventListener("click", togglePlay);

  // Next / Prev: try to find buttons by id, else ignore
  const nextBtn = document.getElementById("nextBtn");
  if (nextBtn) nextBtn.addEventListener("click", next);
  const prevBtn = document.getElementById("prevBtn");
  if (prevBtn) prevBtn.addEventListener("click", prev);

  // Rewind / Forward: current behavior — placeholder (seek requires YT API)
  const rewBtn = document.getElementById("rewBtn");
  if (rewBtn) rewBtn.addEventListener("click", () => alert("Rewind/forward needs YouTube Player API to be precise. I can add it if you want."));
  const fwdBtn = document.getElementById("fwdBtn");
  if (fwdBtn) fwdBtn.addEventListener("click", () => alert("Rewind/forward needs YouTube Player API to be precise. I can add it if you want."));

  // Create playlist button
  const createBtn = document.getElementById("createPlaylistBtn");
  if (createBtn) {
    createBtn.addEventListener("click", () => {
      const name = prompt("Playlist name:");
      if (!name) return;
      const all = loadPlaylistsFromStorage();
      all.push(createEmptyPlaylist(name));
      savePlaylistsToStorage(all);
      renderPlaylists();
      renderSidebarPlaylists();
    });
  }

  // Close chooser on outside click (extra safety)
  document.addEventListener("click", (e) => {
    const chooser = document.getElementById("playlistChooserPopover");
    if (chooser && !chooser.contains(e.target) && !e.target.classList?.contains("add-to-pl-btn")) {
      chooser.remove();
    }
  });
});

/* Expose functions for debugging or HTML inline use */
window.loadMusic = loadMusic;
window.setVideoById = setVideoById;
window.next = next;
window.prev = prev;
window.extractVideoId = extractVideoId;
