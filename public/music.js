/* music.js — Rebuilt for your JARVIS Music page
   - Matches your HTML structure and element IDs
   - Search cues (doesn't stop current playing)
   - Play/pause, next/prev, queue
   - Playlists (create / add / remove) persisted to localStorage
   - Featured song grid wiring + add-to-playlist UI
   - Wave animation + progress simulation
   - Defensive & non-destructive
*/

/////////////////////
// Config / DOM IDs
/////////////////////
const INPUT_ID = "ytInput";
const LOAD_BTN_ID = "loadBtn";
const PLAYER_IFRAME_ID = "ytPlayer";
const COVER_IMG_ID = "coverImg";
const TITLE_ID = "trackTitle";
const ARTIST_ID = "trackArtist";
const PLAY_BTN_ID = "playBtn";
const PROGRESS_FILL_ID = "progressFill";
const WAVE_CONTAINER_ID = "waveContainer";
const SONG_GRID_ID = "songGrid";
const CREATE_PL_BTN = "createPlaylistBtn";
const PLAYLIST_AREA_ID = "playlistArea";
const SIDEBAR_PL_ID = "sidebarPlaylists";
const MINI_COVER_ID = "miniCover";
const PREVIEW_FLAG_ID = "__jarvis_preview_flag"; // internal

const STORAGE_KEY = "jarvis_playlists";
const NUM_BARS = 20;

/* State */
let currentVideoId = null;       // actually playing video id
let cuedVideoId = null;          // search result / preview that won't autoplay
let isPlaying = false;
let progressInterval = null;
let waveBars = [];
let currentQueue = [];           // list of videoIds in queue
let currentIndex = -1;           // index in currentQueue

//////////////////////////
// Helpers
//////////////////////////
function $(id) { return document.getElementById(id); }

function safeText(el, text) { if (!el) return; el.textContent = text || ""; }

function extractVideoId(url) {
  if (!url) return null;
  url = url.trim();
  // plain id
  if (/^[A-Za-z0-9_-]{10,}$/.test(url)) return url;
  // youtu.be short link
  const short = url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
  if (short) return short[1].split(/[?&]/)[0];
  // v= param
  const vParam = url.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
  if (vParam) return vParam[1];
  // embed/
  const emb = url.match(/\/embed\/([A-Za-z0-9_-]{6,})/);
  if (emb) return emb[1];
  // last resort: any 11-char candidate
  const maybe = url.match(/([A-Za-z0-9_-]{11})/);
  if (maybe) return maybe[1];
  return null;
}

function oembedTitle(vid, cb) {
  // best-effort: fetch oEmbed for title/author
  try {
    fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        cb && cb(data?.title || null, data?.author_name || null);
      })
      .catch(() => cb && cb(null, null));
  } catch (e) { cb && cb(null, null); }
}

//////////////////////////
// Player actions
//////////////////////////
function setIframeSrc(id, autoplay = true) {
  const iframe = $(PLAYER_IFRAME_ID);
  if (!iframe) return;
  // set src or clear to stop
  iframe.src = autoplay ? `https://www.youtube.com/embed/${id}?autoplay=1&controls=1&rel=0&modestbranding=1` : `https://www.youtube.com/embed/${id}?controls=1&rel=0&modestbranding=1`;
}

function setVideoById(vid, { addToQueue = true } = {}) {
  if (!vid) return;
  currentVideoId = vid;
  // if requested, adjust queue/currentIndex
  if (addToQueue) {
    const idx = currentQueue.indexOf(vid);
    if (idx !== -1) {
      currentIndex = idx;
    } else {
      // if queue empty, make it the only item
      if (currentQueue.length === 0) {
        currentQueue = [vid];
        currentIndex = 0;
      } else {
        // insert right after currentIndex
        currentQueue.splice(currentIndex + 1, 0, vid);
        currentIndex = currentIndex + 1;
      }
    }
  } else {
    // replace queue with only this track
    currentQueue = [vid];
    currentIndex = 0;
  }

  setIframeSrc(vid, true);
  isPlaying = true;
  updateCoversAndMeta(vid);
  updatePlayButton();
  setProgress(0);
  startProgressSimulation();
  startWaveAnimation();
}

function cueVideoById(vid) {
  // cue without stopping current playing track
  if (!vid) return;
  cuedVideoId = vid;
  // update preview meta (right panel + mini)
  updateCoversAndMeta(vid, { preview: true });
  // show small visual cue (we'll add a temporary label near title)
  showPreviewIndicator();
}

function togglePlay() {
  const iframe = $(PLAYER_IFRAME_ID);
  if (!currentVideoId) {
    // if nothing playing but there's a cued one, play it
    if (cuedVideoId) {
      setVideoById(cuedVideoId, { addToQueue: true });
      cuedVideoId = null;
      removePreviewIndicator();
      return;
    }
    return;
  }
  if (isPlaying) {
    // stop by clearing src (keeps cue intact)
    if (iframe) iframe.src = "";
    isPlaying = false;
    stopProgressSimulation();
    stopWaveAnimation();
  } else {
    if (iframe) setIframeSrc(currentVideoId, true);
    isPlaying = true;
    startProgressSimulation();
    startWaveAnimation();
  }
  updatePlayButton();
}

function updatePlayButton() {
  const el = $(PLAY_BTN_ID);
  if (!el) return;
  el.textContent = isPlaying ? "⏸" : "▶";
}

function updateCoversAndMeta(vid, opts = {}) {
  // opts.preview = true if it's a preview (don't change currentVideoId)
  const coverEl = $(COVER_IMG_ID);
  const miniEl = $(MINI_COVER_ID);
  const titleEl = $(TITLE_ID);
  const artistEl = $(ARTIST_ID);
  if (coverEl && vid) coverEl.src = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
  if (miniEl && vid) miniEl.src = `https://i.ytimg.com/vi/${vid}/mqdefault.jpg`;

  // fetch oembed
  oembedTitle(vid, (title, author) => {
    if (titleEl && (!opts.preview || !currentVideoId)) {
      // if preview, we still show preview title but preserve current playing title if song playing
    }
    // Right panel shows cued or playing depending on which is active
    const primaryTitleEl = titleEl;
    const primaryArtistEl = artistEl;
    if (primaryTitleEl) {
      // If a track is playing, show playing track; if none playing, show preview
      if (currentVideoId && !opts.preview) {
        // title/artist already set from oembed call for the current vid earlier; but set again defensively
        primaryTitleEl.textContent = title || primaryTitleEl.textContent || `Video: ${vid}`;
        primaryArtistEl.textContent = author || primaryArtistEl.textContent || "YouTube";
      } else {
        // preview or no current playing
        primaryTitleEl.textContent = title || `Video: ${vid}`;
        primaryArtistEl.textContent = author || "YouTube";
      }
    }
  });

  // also highlight card in grid if playing
  highlightCurrentPlayingInGrid(vid);
}

//////////////////////////
// Progress simulation + wave
//////////////////////////
function setProgress(p) {
  const pf = $(PROGRESS_FILL_ID);
  if (!pf) return;
  pf.style.width = `${Math.max(0, Math.min(100, p))}%`;
}

function startProgressSimulation() {
  stopProgressSimulation();
  let val = 0;
  progressInterval = setInterval(() => {
    if (!isPlaying) return;
    val += 0.7;
    if (val > 100) val = 0;
    setProgress(val);
  }, 500);
}

function stopProgressSimulation() {
  if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
}

function initWaveBars() {
  const container = $(WAVE_CONTAINER_ID);
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

function startWaveAnimation() { waveBars.forEach(b => b.style.animationPlayState = "running"); }
function stopWaveAnimation() { waveBars.forEach(b => b.style.animationPlayState = "paused"); }

//////////////////////////
// Queue - next / prev
//////////////////////////
function next() {
  if (!currentQueue || currentQueue.length === 0) return alert("Queue is empty.");
  currentIndex = (currentIndex + 1) % currentQueue.length;
  setVideoById(currentQueue[currentIndex], { addToQueue: false });
}

function prev() {
  if (!currentQueue || currentQueue.length === 0) return alert("Queue is empty.");
  currentIndex = (currentIndex - 1 + currentQueue.length) % currentQueue.length;
  setVideoById(currentQueue[currentIndex], { addToQueue: false });
}

//////////////////////////
// Playlists (localStorage)
//////////////////////////
function loadPlaylistsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) { console.error("loadPlaylists:", e); return []; }
}

function savePlaylistsToStorage(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list || [])); } catch (e) { console.error("savePlaylists:", e); }
}

function createEmptyPlaylist(name) {
  return { id: `pl_${Date.now()}`, name: name || "New Playlist", songs: [] };
}

function renderPlaylists() {
  const area = $(PLAYLIST_AREA_ID);
  const sidebar = $(SIDEBAR_PL_ID);
  if (!area || !sidebar) return;
  const pls = loadPlaylistsFromStorage();
  area.innerHTML = "";
  sidebar.innerHTML = "";

  if (pls.length === 0) {
    const note = document.createElement("div");
    note.style.color = "var(--muted)";
    note.textContent = "No playlists yet — create one with the + button.";
    area.appendChild(note);
  } else {
    pls.forEach(pl => {
      const wrap = document.createElement("div");
      wrap.style.background = "var(--glass)";
      wrap.style.padding = "10px";
      wrap.style.borderRadius = "10px";
      wrap.style.marginBottom = "10px";
      wrap.style.display = "flex";
      wrap.style.flexDirection = "column";
      wrap.style.gap = "8px";

      const header = document.createElement("div");
      header.style.display = "flex";
      header.style.justifyContent = "space-between";
      header.style.alignItems = "center";

      const title = document.createElement("div");
      title.textContent = `${pl.name} (${pl.songs.length})`;
      title.style.fontWeight = "700";

      const controls = document.createElement("div");
      const playAll = document.createElement("button");
      playAll.textContent = "▶";
      playAll.className = "btn";
      playAll.style.marginRight = "8px";
      playAll.onclick = (e) => {
        e.stopPropagation();
        if (!pl.songs.length) return alert("Playlist is empty.");
        currentQueue = pl.songs.map(s => s.videoId);
        currentIndex = 0;
        setVideoById(currentQueue[0], { addToQueue: false });
      };

      const del = document.createElement("button");
      del.textContent = "🗑";
      del.className = "btn";
      del.onclick = (e) => {
        e.stopPropagation();
        if (!confirm(`Delete playlist "${pl.name}"?`)) return;
        const all = loadPlaylistsFromStorage();
        const filtered = all.filter(x => x.id !== pl.id);
        savePlaylistsToStorage(filtered);
        renderPlaylists();
      };

      controls.appendChild(playAll);
      controls.appendChild(del);

      header.appendChild(title);
      header.appendChild(controls);
      wrap.appendChild(header);

      if (!pl.songs.length) {
        const empty = document.createElement("div");
        empty.textContent = "No songs — add from Featured cards.";
        empty.style.color = "var(--muted)";
        wrap.appendChild(empty);
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
          left.style.gap = "8px";
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
          const a = document.createElement("div");
          a.textContent = s.artist || "";
          a.style.color = "var(--muted)";
          a.style.fontSize = "12px";

          meta.appendChild(t);
          meta.appendChild(a);
          left.appendChild(thumb);
          left.appendChild(meta);

          left.onclick = () => {
            // play this song immediately and set queue to playlist
            currentQueue = pl.songs.map(x => x.videoId);
            currentIndex = pl.songs.findIndex(x => x.videoId === s.videoId);
            if (currentIndex === -1) currentIndex = 0;
            setVideoById(currentQueue[currentIndex], { addToQueue: false });
          };

          const right = document.createElement("div");
          right.style.display = "flex";
          right.style.gap = "8px";

          const removeBtn = document.createElement("button");
          removeBtn.className = "btn";
          removeBtn.textContent = "✖";
          removeBtn.onclick = (e) => {
            e.stopPropagation();
            if (!confirm(`Remove "${s.title}" from "${pl.name}"?`)) return;
            const all = loadPlaylistsFromStorage();
            const target = all.find(x => x.id === pl.id);
            if (!target) return;
            target.songs = target.songs.filter(x => x.videoId !== s.videoId);
            savePlaylistsToStorage(all);
            renderPlaylists();
          };

          right.appendChild(removeBtn);
          row.appendChild(left);
          row.appendChild(right);
          wrap.appendChild(row);
        });
      }

      area.appendChild(wrap);
    });
  }

  // sidebar quick buttons
  const plsList = loadPlaylistsFromStorage();
  plsList.forEach(pl => {
    const btn = document.createElement("button");
    btn.className = "pl-btn";
    btn.textContent = `${pl.name} (${pl.songs.length})`;
    btn.onclick = () => {
      if (!pl.songs.length) return alert("Playlist is empty.");
      currentQueue = pl.songs.map(s => s.videoId);
      currentIndex = 0;
      setVideoById(currentQueue[0], { addToQueue: false });
    };
    sidebar.appendChild(btn);
  });
}

function addSongToPlaylist(playlistId, songObj) {
  const all = loadPlaylistsFromStorage();
  const pl = all.find(x => x.id === playlistId);
  if (!pl) return alert("Playlist not found.");
  if (pl.songs.some(s => s.videoId === songObj.videoId)) return alert("Song already in playlist.");
  pl.songs.push(songObj);
  savePlaylistsToStorage(all);
  renderPlaylists();
  alert(`Added "${songObj.title}" to "${pl.name}"`);
}

//////////////////////////
// Song Grid wiring + add-to-pl popover
//////////////////////////
function wireSongGrid() {
  const grid = $(SONG_GRID_ID);
  if (!grid) return;
  // attach click on each card and ensure add button exists
  const cards = Array.from(grid.querySelectorAll(".song-card"));
  cards.forEach(card => {
    card.style.position = card.style.position || "relative";

    card.addEventListener("click", (ev) => {
      // if clicked add button, ignore (handled separately)
      if (ev.target && ev.target.classList && ev.target.classList.contains("add-to-pl-btn")) return;
      // play the card's video
      const raw = card.getAttribute("data-id") || "";
      const vid = extractVideoId(raw) || raw;
      if (!vid) return alert("Cannot play this item (invalid video id).");
      // build queue from visible grid order
      const allIds = cards.map(c => extractVideoId(c.getAttribute("data-id") || c.dataset.id) || (c.getAttribute("data-id") || c.dataset.id)).filter(x => !!x);
      currentQueue = allIds;
      currentIndex = currentQueue.indexOf(vid);
      if (currentIndex === -1) { currentQueue = [vid]; currentIndex = 0; }
      setVideoById(vid, { addToQueue: false });
    });

    // ensure add button exists
    let addBtn = card.querySelector(".add-to-pl-btn");
    if (!addBtn) {
      addBtn = document.createElement("button");
      addBtn.className = "add-to-pl-btn";
      addBtn.textContent = "+";
      addBtn.title = "Add to playlist";
      card.appendChild(addBtn);
    }

    addBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openPlaylistChooserForCard(card, addBtn);
    });
  });
}

function openPlaylistChooserForCard(card, anchorBtn) {
  // remove existing
  const existing = document.getElementById("playlistChooserPopover");
  if (existing) existing.remove();

  const playlists = loadPlaylistsFromStorage();
  const pop = document.createElement("div");
  pop.id = "playlistChooserPopover";
  pop.style.position = "absolute";
  pop.style.top = (anchorBtn.offsetTop + anchorBtn.offsetHeight + 6) + "px";
  pop.style.right = "8px";
  pop.style.background = "var(--panel)";
  pop.style.color = "var(--text)";
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

  if (!playlists.length) {
    const no = document.createElement("div");
    no.textContent = "No playlists yet.";
    no.style.color = "var(--muted)";
    no.style.marginBottom = "8px";
    pop.appendChild(no);

    const createNow = document.createElement("button");
    createNow.textContent = "+ Create";
    createNow.style.background = "var(--accent-2)";
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
      pop.remove();
    };
    pop.appendChild(createNow);
  } else {
    playlists.forEach(pl => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.alignItems = "center";
      row.style.marginBottom = "6px";
      row.style.cursor = "pointer";

      const left = document.createElement("div");
      left.textContent = pl.name;
      left.style.color = "var(--text)";
      left.onclick = () => {
        const raw = card.getAttribute("data-id") || card.dataset.id || "";
        const vid = extractVideoId(raw) || raw;
        if (!vid) return alert("Invalid video id");
        const songObj = {
          videoId: vid,
          title: card.getAttribute("data-title") || card.dataset.title || (card.querySelector(".title")?.textContent || card.querySelector(".song-meta .title")?.textContent || "Unknown"),
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
      row.appendChild(left);
      row.appendChild(cnt);
      pop.appendChild(row);
    });
  }

  card.appendChild(pop);

  function closeOnClickOutside(e) {
    if (!pop.contains(e.target) && e.target !== anchorBtn) {
      pop.remove();
      document.removeEventListener("click", closeOnClickOutside);
    }
  }
  setTimeout(() => document.addEventListener("click", closeOnClickOutside), 50);
}

function highlightCurrentPlayingInGrid(vid) {
  const grid = $(SONG_GRID_ID);
  if (!grid) return;
  Array.from(grid.querySelectorAll(".song-card")).forEach(c => {
    const raw = c.getAttribute("data-id") || c.dataset.id || "";
    const id = extractVideoId(raw) || raw;
    if (id && vid && id === vid) c.style.outline = "2px solid rgba(29,123,255,0.85)";
    else c.style.outline = "none";
  });
}

//////////////////////////
// Search / Load (CUE behavior)
//////////////////////////
async function loadMusic() {
  const input = $(INPUT_ID);
  if (!input) return alert("Search input not found.");
  const raw = input.value.trim();
  if (!raw) return alert("Type a song name or paste a YouTube link.");

  const isUrl = /(youtube\.com|youtu\.be)/i.test(raw);
  if (isUrl) {
    const vid = extractVideoId(raw);
    if (!vid) return alert("Could not extract video id from link.");
    // cue — do not autoplay if something is already playing
    if (isPlaying) {
      cueVideoById(vid);
    } else {
      // if nothing playing, play immediately
      setVideoById(vid, { addToQueue: true });
    }
    return;
  }

  // non-URL search: call your server endpoint if available
  try {
    const resp = await fetch(`/api/search?q=${encodeURIComponent(raw)}`);
    if (!resp.ok) throw new Error("Search request failed");
    const data = await resp.json();
    if (!data || !data.videoId) throw new Error("No results");
    const vid = data.videoId;
    if (isPlaying) cueVideoById(vid);
    else setVideoById(vid, { addToQueue: true });
  } catch (err) {
    console.warn("Search error:", err);
    alert("Search failed. If you pasted a direct YouTube link it will work. Otherwise, check your /api/search.");
  }
}

//////////////////////////
// Preview indicator helpers
//////////////////////////
function showPreviewIndicator() {
  // add a small "(preview)" next to title
  const titleEl = $(TITLE_ID);
  if (!titleEl) return;
  removePreviewIndicator();
  const span = document.createElement("span");
  span.id = PREVIEW_FLAG_ID;
  span.style.fontSize = "12px";
  span.style.marginLeft = "8px";
  span.style.color = "var(--muted)";
  span.textContent = "(preview)";
  titleEl.appendChild(span);
}

function removePreviewIndicator() {
  const el = $(PREVIEW_FLAG_ID);
  if (el) el.remove();
}

//////////////////////////
// Init / DOM ready
//////////////////////////
document.addEventListener("DOMContentLoaded", () => {
  // init visuals
  initWaveBars();

  // wire grid interactions
  wireSongGrid();

  // playlists
  renderPlaylists();

  // UI bindings
  const loadBtn = $(LOAD_BTN_ID);
  if (loadBtn) loadBtn.addEventListener("click", loadMusic);

  const inputEl = $(INPUT_ID);
  if (inputEl) inputEl.addEventListener("keydown", (e) => { if (e.key === "Enter") loadMusic(); });

  const playBtn = $(PLAY_BTN_ID);
  if (playBtn) playBtn.addEventListener("click", () => {
    // if nothing playing but there's a cued track -> play it
    if (!currentVideoId && cuedVideoId) {
      setVideoById(cuedVideoId, { addToQueue: true });
      cuedVideoId = null;
      removePreviewIndicator();
      return;
    }
    togglePlay();
    updatePlayButton();
  });

  const nextBtn = $("nextBtn");
  if (nextBtn) nextBtn.addEventListener("click", next);

  const prevBtn = $("prevBtn");
  if (prevBtn) prevBtn.addEventListener("click", prev);

  const rewBtn = $("rewBtn");
  if (rewBtn) rewBtn.addEventListener("click", () => alert("Precise seek needs YouTube IFrame API; I can add it if you want."));

  const fwdBtn = $("fwdBtn");
  if (fwdBtn) fwdBtn.addEventListener("click", () => alert("Precise seek needs YouTube IFrame API; I can add it if you want."));

  const createBtn = $(CREATE_PL_BTN);
  if (createBtn) createBtn.addEventListener("click", () => {
    const name = prompt("Playlist name:");
    if (!name) return;
    const all = loadPlaylistsFromStorage();
    all.push(createEmptyPlaylist(name));
    savePlaylistsToStorage(all);
    renderPlaylists();
  });

  // if user clicks outside chooser, remove
  document.addEventListener("click", (e) => {
    const chooser = document.getElementById("playlistChooserPopover");
    if (chooser && !chooser.contains(e.target) && !e.target.classList?.contains("add-to-pl-btn")) chooser.remove();
  });

  // add extra phonk songs to the grid (non-destructive)
  addPhonkCards();

  // ensure play button visual
  updatePlayButton();
});

//////////////////////////
// Add some phonk cards programmatically (optional)
//////////////////////////
function addPhonkCards() {
  const phonkList = [
    { id: "3jWRrafhO7M", title: "Phonk Sample 1 (example)", artist: "Phonk Artist", cover: "https://i.ytimg.com/vi/3jWRrafhO7M/hqdefault.jpg" },
    // You can replace these IDs with real phonk track youtube ids you prefer
    { id: "ZbZSe6N_BXs", title: "Phonk Sample 2", artist: "Phonk Artist 2", cover: "https://i.ytimg.com/vi/ZbZSe6N_BXs/hqdefault.jpg" }
  ];
  const grid = $(SONG_GRID_ID);
  if (!grid) return;
  phonkList.forEach(p => {
    // avoid duplicates (by id)
    const exists = Array.from(grid.querySelectorAll(".song-card")).some(c => {
      const raw = c.getAttribute("data-id") || "";
      return raw && raw.includes(p.id);
    });
    if (exists) return;
    const card = document.createElement("div");
    card.className = "song-card";
    card.setAttribute("data-id", p.id);
    card.setAttribute("data-title", p.title);
    card.setAttribute("data-artist", p.artist);
    card.setAttribute("data-cover", p.cover || "");
    card.innerHTML = `
      <img class="song-cover" src="${p.cover}" alt="">
      <div class="song-meta"><div class="title">${p.title}</div><div class="artist muted">${p.artist}</div></div>
      <button class="add-to-pl-btn">+</button>
    `;
    grid.appendChild(card);
  });
  // re-wire grid after injecting
  wireSongGrid();
}

//////////////////////////
// Expose some functions for debugging
//////////////////////////
window.loadMusic = loadMusic;
window.setVideoById = setVideoById;
window.cueVideoById = cueVideoById;
window.next = next;
window.prev = prev;
window.extractVideoId = extractVideoId;
