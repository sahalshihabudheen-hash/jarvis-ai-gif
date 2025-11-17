/* music.js — final: matches the updated music.html
   - keeps previous features (cue behavior, playlists, queue)
   - updates both right-panel (trackTitle/trackArtist) and bottom mini (miniTrackTitle/miniTrackArtist)
*/

const INPUT_ID = "ytInput";
const LOAD_BTN_ID = "loadBtn";
const PLAYER_IFRAME_ID = "ytPlayer";
const COVER_IMG_ID = "coverImg";
const TITLE_ID = "trackTitle";
const ARTIST_ID = "trackArtist";
const MINI_TITLE_ID = "miniTrackTitle";
const MINI_ARTIST_ID = "miniTrackArtist";
const PLAY_BTN_ID = "playBtn";
const PROGRESS_FILL_ID = "progressFill";
const WAVE_CONTAINER_ID = "waveContainer";
const SONG_GRID_ID = "songGrid";
const CREATE_PL_BTN = "createPlaylistBtn";
const PLAYLIST_AREA_ID = "playlistArea";
const SIDEBAR_PL_ID = "sidebarPlaylists";
const MINI_COVER_ID = "miniCover";

const STORAGE_KEY = "jarvis_playlists";
const NUM_BARS = 20;

let currentVideoId = null;
let cuedVideoId = null;
let isPlaying = false;
let progressInterval = null;
let waveBars = [];
let currentQueue = [];
let currentIndex = -1;

function $(id) { return document.getElementById(id); }

function extractVideoId(url) {
  if (!url) return null;
  url = url.trim();
  if (/^[A-Za-z0-9_-]{10,}$/.test(url)) return url;
  const short = url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
  if (short) return short[1].split(/[?&]/)[0];
  const vParam = url.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
  if (vParam) return vParam[1];
  const emb = url.match(/\/embed\/([A-Za-z0-9_-]{6,})/);
  if (emb) return emb[1];
  const maybe = url.match(/([A-Za-z0-9_-]{11})/);
  if (maybe) return maybe[1];
  return null;
}

function oembedTitle(vid, cb) {
  try {
    fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`)
      .then(r => r.ok ? r.json() : null)
      .then(data => cb && cb(data?.title || null, data?.author_name || null))
      .catch(() => cb && cb(null, null));
  } catch (e) { cb && cb(null, null); }
}

function setIframeSrc(id, autoplay = true) {
  const iframe = $(PLAYER_IFRAME_ID);
  if (!iframe) return;
  iframe.src = autoplay ? `https://www.youtube.com/embed/${id}?autoplay=1&controls=1&rel=0&modestbranding=1` : `https://www.youtube.com/embed/${id}?controls=1&rel=0&modestbranding=1`;
}

function setVideoById(vid, { addToQueue = true } = {}) {
  if (!vid) return;
  currentVideoId = vid;
  if (addToQueue) {
    const idx = currentQueue.indexOf(vid);
    if (idx !== -1) currentIndex = idx;
    else {
      if (currentQueue.length === 0) {
        currentQueue = [vid];
        currentIndex = 0;
      } else {
        currentQueue.splice(currentIndex + 1, 0, vid);
        currentIndex = currentIndex + 1;
      }
    }
  } else {
    currentQueue = [vid];
    currentIndex = 0;
  }

  setIframeSrc(vid, true);
  isPlaying = true;
  updateMetaAndCovers(vid);
  updatePlayButton();
  setProgress(0);
  startProgressSimulation();
  startWaveAnimation();
}

function cueVideoById(vid) {
  if (!vid) return;
  cuedVideoId = vid;
  updateMetaAndCovers(vid, { preview: true });
  showPreviewIndicator();
}

function togglePlay() {
  const iframe = $(PLAYER_IFRAME_ID);
  if (!currentVideoId) {
    if (cuedVideoId) {
      setVideoById(cuedVideoId, { addToQueue: true });
      cuedVideoId = null;
      removePreviewIndicator();
    }
    return;
  }
  if (isPlaying) {
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
  const el = $(PLAY_BTN_ID); if (!el) return;
  el.textContent = isPlaying ? "⏸" : "▶";
}

function updateMetaAndCovers(vid, opts = {}) {
  const coverEl = $(COVER_IMG_ID);
  const miniEl = $(MINI_COVER_ID);
  const titleEl = $(TITLE_ID);
  const artistEl = $(ARTIST_ID);
  const miniTitleEl = $(MINI_TITLE_ID);
  const miniArtistEl = $(MINI_ARTIST_ID);

  if (coverEl && vid) coverEl.src = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
  if (miniEl && vid) miniEl.src = `https://i.ytimg.com/vi/${vid}/mqdefault.jpg`;

  oembedTitle(vid, (title, author) => {
    // Right panel display: show playing track title if available
    if (titleEl) {
      titleEl.textContent = title || `Video: ${vid}`;
    }
    if (artistEl) artistEl.textContent = author || "YouTube";

    // mini display (bottom) — keep in sync
    if (miniTitleEl) miniTitleEl.textContent = title || `Video: ${vid}`;
    if (miniArtistEl) miniArtistEl.textContent = author || "YouTube";
  });

  highlightCurrentPlayingInGrid(vid);
}

function setProgress(p) {
  const pf = $(PROGRESS_FILL_ID); if (!pf) return;
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

/* Playlists */
function loadPlaylistsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) { console.error(e); return []; }
}
function savePlaylistsToStorage(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list || [])); } catch (e) { console.error(e); }
}
function createEmptyPlaylist(name) { return { id: `pl_${Date.now()}`, name: name || "New Playlist", songs: [] }; }

function renderPlaylists() {
  const area = $(PLAYLIST_AREA_ID);
  const sidebarList = $(SIDEBAR_PL_ID);
  if (!area || !sidebarList) return;
  area.innerHTML = "";
  sidebarList.innerHTML = "";
  const playlists = loadPlaylistsFromStorage();

  if (playlists.length === 0) {
    const note = document.createElement("div");
    note.style.color = "var(--muted)";
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

      const controls = document.createElement("div");
      const playAllBtn = document.createElement("button");
      playAllBtn.textContent = "▶";
      playAllBtn.className = "btn";
      playAllBtn.style.marginRight = "8px";
      playAllBtn.onclick = (e) => {
        e.stopPropagation();
        if (pl.songs.length === 0) return alert("Playlist is empty.");
        currentQueue = pl.songs.map(s => s.videoId);
        currentIndex = 0;
        setVideoById(currentQueue[0], { addToQueue: false });
      };

      const delBtn = document.createElement("button");
      delBtn.textContent = "🗑";
      delBtn.className = "btn";
      delBtn.onclick = (e) => {
        e.stopPropagation();
        if (!confirm(`Delete playlist "${pl.name}" ?`)) return;
        const all = loadPlaylistsFromStorage();
        const filtered = all.filter(x => x.id !== pl.id);
        savePlaylistsToStorage(filtered);
        renderPlaylists();
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
          const a = document.createElement("div");
          a.textContent = s.artist || "Unknown";
          a.style.fontSize = "12px";
          a.style.color = "var(--muted)";
          meta.appendChild(t);
          meta.appendChild(a);
          left.appendChild(thumb);
          left.appendChild(meta);

          left.onclick = () => {
            currentQueue = pl.songs.map(x => x.videoId);
            currentIndex = pl.songs.findIndex(x => x.videoId === s.videoId);
            if (currentIndex === -1) currentIndex = 0;
            setVideoById(currentQueue[currentIndex], { addToQueue: false });
          };

          const right = document.createElement("div");
          right.style.display = "flex";
          right.style.gap = "8px";

          const removeBtn = document.createElement("button");
          removeBtn.textContent = "✖";
          removeBtn.className = "btn";
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
          plWrap.appendChild(row);
        });
      }

      area.appendChild(plWrap);
    });
  }

  // sidebar quick buttons
  const plsList = loadPlaylistsFromStorage();
  plsList.forEach(pl => {
    const btn = document.createElement("button");
    btn.className = "pl-btn";
    btn.textContent = `${pl.name} (${pl.songs.length})`;
    btn.onclick = () => {
      if (pl.songs.length === 0) return alert("Playlist is empty.");
      currentQueue = pl.songs.map(s => s.videoId);
      currentIndex = 0;
      setVideoById(currentQueue[0], { addToQueue: false });
    };
    sidebarList.appendChild(btn);
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

function wireSongGrid() {
  const grid = $(SONG_GRID_ID);
  if (!grid) return;
  const cards = Array.from(grid.querySelectorAll(".song-card"));

  cards.forEach(card => {
    card.style.position = card.style.position || "relative";

    card.addEventListener("click", (ev) => {
      if (ev.target && ev.target.classList && ev.target.classList.contains("add-to-pl-btn")) return;
      const raw = card.getAttribute("data-id") || card.dataset.id || "";
      const vid = extractVideoId(raw) || raw;
      if (!vid) return alert("Cannot play this item (invalid video id).");
      const allIds = cards.map(c => extractVideoId(c.getAttribute("data-id") || c.dataset.id) || (c.getAttribute("data-id") || c.dataset.id)).filter(x => !!x);
      currentQueue = allIds;
      currentIndex = currentQueue.indexOf(vid);
      if (currentIndex === -1) { currentQueue = [vid]; currentIndex = 0; }
      setVideoById(vid, { addToQueue: false });
    });

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

  const title = document.createElement("div"); title.textContent = "Add to playlist"; title.style.fontWeight = "700"; title.style.marginBottom = "8px"; pop.appendChild(title);

  if (!playlists.length) {
    const no = document.createElement("div"); no.textContent = "No playlists yet."; no.style.color = "var(--muted)"; no.style.marginBottom = "8px"; pop.appendChild(no);
    const createNow = document.createElement("button"); createNow.textContent = "+ Create"; createNow.style.background = "var(--accent-2)"; createNow.style.border = "none"; createNow.style.padding = "8px 10px"; createNow.style.borderRadius = "8px"; createNow.style.cursor = "pointer";
    createNow.onclick = () => { const name = prompt("Playlist name:"); if (!name) return; const all = loadPlaylistsFromStorage(); all.push(createEmptyPlaylist(name)); savePlaylistsToStorage(all); renderPlaylists(); pop.remove(); };
    pop.appendChild(createNow);
  } else {
    playlists.forEach(pl => {
      const r = document.createElement("div");
      r.style.display = "flex"; r.style.justifyContent = "space-between"; r.style.alignItems = "center"; r.style.marginBottom = "6px"; r.style.cursor = "pointer";
      const left = document.createElement("div"); left.textContent = pl.name; left.style.color = "var(--text)";
      left.onclick = () => {
        const raw = card.getAttribute("data-id") || card.dataset.id || "";
        const vid = extractVideoId(raw) || raw;
        if (!vid) return alert("Invalid video id");
        const songObj = {
          videoId: vid,
          title: card.getAttribute("data-title") || card.dataset.title || (card.querySelector(".title")?.textContent || "Unknown"),
          artist: card.getAttribute("data-artist") || card.dataset.artist || (card.querySelector(".artist")?.textContent || ""),
          cover: card.getAttribute("data-cover") || card.dataset.cover || (card.querySelector("img")?.src || "")
        };
        addSongToPlaylist(pl.id, songObj); const chooser = document.getElementById("playlistChooserPopover"); if (chooser) chooser.remove();
      };
      const cnt = document.createElement("div"); cnt.textContent = `${pl.songs.length}`; cnt.style.color = "var(--muted)";
      r.appendChild(left); r.appendChild(cnt); pop.appendChild(r);
    });
  }

  card.appendChild(pop);
  function closeOnClickOutside(e) { if (!pop.contains(e.target) && e.target !== anchorBtn) { pop.remove(); document.removeEventListener("click", closeOnClickOutside); } }
  setTimeout(() => document.addEventListener("click", closeOnClickOutside), 50);
}

function highlightCurrentPlayingInGrid(vid) {
  const grid = $(SONG_GRID_ID); if (!grid) return;
  Array.from(grid.querySelectorAll(".song-card")).forEach(c => {
    const raw = c.getAttribute("data-id") || c.dataset.id || "";
    const id = extractVideoId(raw) || raw;
    c.style.outline = (id && vid && id === vid) ? "2px solid rgba(29,123,255,0.85)" : "none";
  });
}

async function loadMusic() {
  const input = $(INPUT_ID); if (!input) return alert("Search input not found.");
  const raw = input.value.trim(); if (!raw) return alert("Type a song name or paste a YouTube link.");
  const isUrl = /(youtube\.com|youtu\.be)/i.test(raw);
  if (isUrl) {
    const vid = extractVideoId(raw); if (!vid) return alert("Could not extract video id from link.");
    if (isPlaying) cueVideoById(vid); else setVideoById(vid, { addToQueue: true });
    return;
  }
  try {
    const resp = await fetch(`/api/search?q=${encodeURIComponent(raw)}`);
    if (!resp.ok) throw new Error("Search request failed");
    const data = await resp.json();
    if (!data || !data.videoId) throw new Error("No results");
    const vid = data.videoId;
    if (isPlaying) cueVideoById(vid); else setVideoById(vid, { addToQueue: true });
  } catch (err) {
    console.warn("Search error:", err);
    alert("Search failed. If you pasted a direct YouTube link it will work. Otherwise, check your /api/search.");
  }
}

function showPreviewIndicator() {
  const titleEl = $(TITLE_ID);
  if (!titleEl) return;
  removePreviewIndicator();
  const span = document.createElement("span");
  span.id = "__jarvis_preview_flag";
  span.style.fontSize = "12px";
  span.style.marginLeft = "8px";
  span.style.color = "var(--muted)";
  span.textContent = "(preview)";
  titleEl.appendChild(span);
}
function removePreviewIndicator() {
  const el = document.getElementById("__jarvis_preview_flag");
  if (el) el.remove();
}

document.addEventListener("DOMContentLoaded", () => {
  initWaveBars();
  wireSongGrid();
  renderPlaylists();

  const loadBtn = $(LOAD_BTN_ID);
  if (loadBtn) loadBtn.addEventListener("click", loadMusic);

  const inputEl = $(INPUT_ID);
  if (inputEl) inputEl.addEventListener("keydown", (e) => { if (e.key === "Enter") loadMusic(); });

  const playBtn = $(PLAY_BTN_ID); if (playBtn) playBtn.addEventListener("click", () => {
    if (!currentVideoId && cuedVideoId) { setVideoById(cuedVideoId, { addToQueue: true }); cuedVideoId = null; removePreviewIndicator(); return; }
    togglePlay(); updatePlayButton();
  });

  const nextBtn = $("nextBtn"); if (nextBtn) nextBtn.addEventListener("click", next);
  const prevBtn = $("prevBtn"); if (prevBtn) prevBtn.addEventListener("click", prev);
  const rewBtn = $("rewBtn"); if (rewBtn) rewBtn.addEventListener("click", () => alert("Precise seek needs YouTube IFrame API; I can add it if you want."));
  const fwdBtn = $("fwdBtn"); if (fwdBtn) fwdBtn.addEventListener("click", () => alert("Precise seek needs YouTube IFrame API; I can add it if you want."));

  const createBtn = $(CREATE_PL_BTN);
  if (createBtn) createBtn.addEventListener("click", () => {
    const name = prompt("Playlist name:"); if (!name) return; const all = loadPlaylistsFromStorage(); all.push(createEmptyPlaylist(name)); savePlaylistsToStorage(all); renderPlaylists();
  });

  document.addEventListener("click", (e) => {
    const chooser = document.getElementById("playlistChooserPopover");
    if (chooser && !chooser.contains(e.target) && !e.target.classList?.contains("add-to-pl-btn")) chooser.remove();
  });

  addPhonkCards();
  updatePlayButton();
});

function addPhonkCards() {
  const phonkList = [
    { id: "3jWRrafhO7M", title: "Phonk Sample 1 (example)", artist: "Phonk Artist", cover: "https://i.ytimg.com/vi/3jWRrafhO7M/hqdefault.jpg" },
    { id: "ZbZSe6N_BXs", title: "Phonk Sample 2 (example)", artist: "Phonk Artist 2", cover: "https://i.ytimg.com/vi/ZbZSe6N_BXs/hqdefault.jpg" }
  ];
  const grid = $(SONG_GRID_ID);
  if (!grid) return;
  phonkList.forEach(p => {
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
  wireSongGrid();
}

/* expose for debugging */
window.loadMusic = loadMusic;
window.setVideoById = setVideoById;
window.cueVideoById = cueVideoById;
window.next = next;
window.prev = prev;
window.extractVideoId = extractVideoId;
