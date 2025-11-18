/* music.js — rebuilt full version
   - Plays featured YouTube items via hidden iframe (audio)
   - Local search (title/artist) + paste link handling
   - Play/pause, prev/next, simulated progress & wave
   - Playlists (create + add song via popover) stored in localStorage
*/

const INPUT_ID = "ytInput";
const LOAD_BTN_ID = "loadBtn";
const PLAYER_IFRAME_ID = "ytPlayer";
const COVER_IMG_ID = "coverImg";
const TITLE_ID = "trackTitle";
const ARTIST_ID = "trackArtist";
const MINI_TITLE_ID = "miniTrackTitle";
const MINI_ARTIST_ID = "miniTrackArtist";
const MINI_COVER_ID = "miniCover";
const PLAY_BTN_ID = "playBtn";
const PROGRESS_FILL_ID = "progressFill";
const WAVE_CONTAINER_ID = "waveContainer";

const STORAGE_KEY = "jarvis_playlists";
const NUM_BARS = 22;

/* Demo song list (you can extend this array) */
const SONGS = [
  { videoId: "fHI8X4OXluQ", title: "Blinding Lights", artist: "The Weeknd", cover: "https://i.ytimg.com/vi/fHI8X4OXluQ/hqdefault.jpg" },
  { videoId: "34Na4j8AVgA", title: "Starboy", artist: "The Weeknd", cover: "https://i.ytimg.com/vi/34Na4j8AVgA/hqdefault.jpg" },
  { videoId: "mRD0-GxqHVo", title: "Heat Waves", artist: "Glass Animals", cover: "https://i.ytimg.com/vi/mRD0-GxqHVo/hqdefault.jpg" }
];

let currentVideoId = null;
let isPlaying = false;
let progressInterval = null;
let waveBars = [];
let currentQueue = [];
let currentIndex = -1;

/* ---- Helpers ---- */
function $id(id){ return document.getElementById(id); }

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

/* ---- Player controls ---- */
function setIframeSrcHidden(id) {
  const iframe = $id(PLAYER_IFRAME_ID);
  if (!iframe) return;
  // Keep iframe hidden: use minimal UI params
  iframe.src = `https://www.youtube.com/embed/${id}?autoplay=1&controls=0&rel=0&modestbranding=1&iv_load_policy=3`;
}

function setVideoById(vid) {
  if (!vid) return;
  currentVideoId = vid;
  isPlaying = true;

  // update iframe (audio)
  setIframeSrcHidden(vid);

  // update covers and meta
  const coverEl = $id(COVER_IMG_ID), mini = $id(MINI_COVER_ID);
  const titleEl = $id(TITLE_ID), artistEl = $id(ARTIST_ID);
  const miniTitle = $id(MINI_TITLE_ID), miniArtist = $id(MINI_ARTIST_ID);

  if (coverEl) coverEl.src = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
  if (mini) mini.src = `https://i.ytimg.com/vi/${vid}/mqdefault.jpg`;

  // try fetch title/author via oEmbed (graceful)
  if (titleEl || artistEl || miniTitle || miniArtist) {
    fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const title = data?.title || vid;
        const author = data?.author_name || "YouTube";
        if (titleEl) titleEl.textContent = title;
        if (artistEl) artistEl.textContent = author;
        if (miniTitle) miniTitle.textContent = title;
        if (miniArtist) miniArtist.textContent = author;
      })
      .catch(() => {
        if (titleEl) titleEl.textContent = `Video: ${vid}`;
        if (artistEl) artistEl.textContent = "YouTube";
        if (miniTitle) miniTitle.textContent = `Video: ${vid}`;
        if (miniArtist) miniArtist.textContent = "YouTube";
      });
  }

  // update queue index
  const idx = currentQueue.indexOf(vid);
  if (idx !== -1) currentIndex = idx;
  else { currentQueue = [vid]; currentIndex = 0; }

  updatePlayButton();
  setProgress(0);
  startProgressSimulation();
  startWaveAnimation();
  highlightCurrentPlayingInGrid(vid);
}

function togglePlay() {
  const iframe = $id(PLAYER_IFRAME_ID);
  if (!currentVideoId) return;
  if (isPlaying) {
    if (iframe) iframe.src = "";
    isPlaying = false;
    stopProgressSimulation();
    stopWaveAnimation();
  } else {
    if (iframe) setIframeSrcHidden(currentVideoId);
    isPlaying = true;
    startProgressSimulation();
    startWaveAnimation();
  }
  updatePlayButton();
}

function updatePlayButton() {
  const el = $id(PLAY_BTN_ID);
  if (!el) return;
  el.textContent = isPlaying ? "⏸" : "▶";
}

/* ---- Progress simulation ---- */
function setProgress(p) {
  const fill = $id(PROGRESS_FILL_ID);
  if (!fill) return;
  fill.style.width = `${Math.max(0, Math.min(100, p))}%`;
}
function startProgressSimulation() {
  stopProgressSimulation();
  let val = 0;
  progressInterval = setInterval(() => {
    if (!isPlaying) return;
    val += 0.8; // speed
    if (val > 100) val = 0;
    setProgress(val);
  }, 450);
}
function stopProgressSimulation() {
  if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
}

/* ---- Wave animation ---- */
function initWaveBars() {
  const container = $id(WAVE_CONTAINER_ID);
  if (!container) return;
  container.innerHTML = "";
  waveBars = [];
  for (let i = 0; i < NUM_BARS; i++) {
    const bar = document.createElement("div");
    bar.className = "wave-bar";
    bar.style.setProperty("--scale", (0.3 + Math.random() * 1).toString());
    container.appendChild(bar);
    waveBars.push(bar);
  }
}
function startWaveAnimation() { waveBars.forEach(b => b.style.animationPlayState = "running"); }
function stopWaveAnimation() { waveBars.forEach(b => b.style.animationPlayState = "paused"); }

/* ---- Queue navigation ---- */
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

/* ---- Playlists (localStorage) ---- */
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
  const area = $id("playlistArea");
  const sidebarList = $id("sidebarPlaylists");
  const playlists = loadPlaylistsFromStorage();

  if (area) {
    area.innerHTML = "";
    if (playlists.length === 0) {
      const note = document.createElement("div");
      note.style.color = "var(--muted)";
      note.textContent = "No playlists yet — create one with + Create Playlist.";
      area.appendChild(note);
    } else {
      playlists.forEach(pl => {
        const wrap = document.createElement("div");
        wrap.style.background = "var(--glass)";
        wrap.style.padding = "10px";
        wrap.style.borderRadius = "8px";
        wrap.style.marginBottom = "10px";

        const header = document.createElement("div");
        header.style.display = "flex";
        header.style.justifyContent = "space-between";
        header.style.alignItems = "center";
        const title = document.createElement("div");
        title.textContent = `${pl.name} (${pl.songs.length})`;
        title.style.fontWeight = "700";
        header.appendChild(title);

        const controls = document.createElement("div");
        const playBtn = document.createElement("button");
        playBtn.className = "btn";
        playBtn.textContent = "▶";
        playBtn.onclick = (e) => {
          e.stopPropagation();
          if (pl.songs.length === 0) return alert("Playlist empty.");
          currentQueue = pl.songs.map(s => s.videoId);
          currentIndex = 0;
          setVideoById(currentQueue[0]);
        };
        const delBtn = document.createElement("button");
        delBtn.className = "btn";
        delBtn.textContent = "🗑";
        delBtn.onclick = (e) => {
          e.stopPropagation();
          if (!confirm(`Delete playlist "${pl.name}" ?`)) return;
          const all = loadPlaylistsFromStorage().filter(x => x.id !== pl.id);
          savePlaylistsToStorage(all);
          renderPlaylists();
          renderSidebarPlaylists();
        };
        controls.appendChild(playBtn);
        controls.appendChild(delBtn);
        header.appendChild(controls);
        wrap.appendChild(header);

        if (!pl.songs.length) {
          const empty = document.createElement("div");
          empty.style.color = "var(--muted)";
          empty.textContent = "No songs — add from featured cards.";
          wrap.appendChild(empty);
        } else {
          pl.songs.forEach(s => {
            const row = document.createElement("div");
            row.style.display = "flex";
            row.style.justifyContent = "space-between";
            row.style.alignItems = "center";
            row.style.marginTop = "8px";

            const left = document.createElement("div");
            left.style.display = "flex"; left.style.gap = "8px"; left.style.alignItems = "center"; left.style.cursor = "pointer";
            left.onclick = () => setVideoById(s.videoId);

            const img = document.createElement("img");
            img.src = s.cover || `https://i.ytimg.com/vi/${s.videoId}/default.jpg`;
            img.style.width = "46px"; img.style.height = "46px"; img.style.objectFit = "cover"; img.style.borderRadius = "6px";
            const meta = document.createElement("div");
            const t = document.createElement("div"); t.textContent = s.title || "Unknown"; t.style.fontWeight = "600";
            const a = document.createElement("div"); a.textContent = s.artist || "Unknown"; a.style.color = "var(--muted)"; a.style.fontSize = "12px";
            meta.appendChild(t); meta.appendChild(a);
            left.appendChild(img); left.appendChild(meta);

            const right = document.createElement("div");
            const rem = document.createElement("button"); rem.className = "btn"; rem.textContent = "✖";
            rem.onclick = (e) => {
              e.stopPropagation();
              if (!confirm(`Remove "${s.title}" from "${pl.name}"?`)) return;
              const all = loadPlaylistsFromStorage();
              const target = all.find(x => x.id === pl.id);
              if (!target) return;
              target.songs = target.songs.filter(x => x.videoId !== s.videoId);
              savePlaylistsToStorage(all);
              renderPlaylists(); renderSidebarPlaylists();
            };
            right.appendChild(rem);

            row.appendChild(left);
            row.appendChild(right);
            wrap.appendChild(row);
          });
        }

        area.appendChild(wrap);
      });
    }
  }

  if (sidebarList) {
    sidebarList.innerHTML = "";
    playlists.forEach(pl => {
      const btn = document.createElement("button");
      btn.className = "pl-btn";
      btn.textContent = `${pl.name} (${pl.songs.length})`;
      btn.onclick = () => {
        if (pl.songs.length === 0) return alert("Playlist empty.");
        currentQueue = pl.songs.map(s => s.videoId);
        currentIndex = 0;
        setVideoById(currentQueue[0]);
      };
      sidebarList.appendChild(btn);
    });
  }
}

function renderSidebarPlaylists(){ renderPlaylists(); }

/* add song to playlist */
function addSongToPlaylist(playlistId, songObj) {
  const all = loadPlaylistsFromStorage();
  const pl = all.find(x => x.id === playlistId);
  if (!pl) return alert("Playlist not found.");
  if (pl.songs.some(s => s.videoId === songObj.videoId)) return alert("Song already in playlist.");
  pl.songs.push(songObj);
  savePlaylistsToStorage(all);
  renderPlaylists();
  renderSidebarPlaylists();
  alert(`Added "${songObj.title}" to "${pl.name}"`);
}

/* ---- Song grid wiring ---- */
function wireSongGrid() {
  const grid = $id("songGrid");
  if (!grid) return;
  const cards = Array.from(grid.querySelectorAll(".song-card"));

  cards.forEach(card => {
    // click card -> play
    card.addEventListener("click", (ev) => {
      if (ev.target && ev.target.classList && ev.target.classList.contains("add-to-pl-btn")) return;
      const raw = card.getAttribute("data-id") || card.dataset.id || "";
      const vid = extractVideoId(raw) || raw;
      if (!vid) return alert("Cannot play this item (invalid id).");
      const allIds = cards.map(c => extractVideoId(c.getAttribute("data-id") || c.dataset.id) || (c.getAttribute("data-id") || c.dataset.id));
      currentQueue = allIds.filter(x => !!x);
      currentIndex = currentQueue.indexOf(vid);
      if (currentIndex === -1) { currentQueue = [vid]; currentIndex = 0; }
      setVideoById(vid);
    });

    // Add-to-playlist button handling
    const addBtn = card.querySelector(".add-to-pl-btn");
    if (addBtn) {
      addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openPlaylistChooserForCard(card, addBtn);
      });
    }
  });
}

/* popover for adding to playlist */
function openPlaylistChooserForCard(card, anchorBtn) {
  const existing = document.getElementById("playlistChooserPopover"); if (existing) existing.remove();
  const playlists = loadPlaylistsFromStorage();

  const pop = document.createElement("div");
  pop.id = "playlistChooserPopover";
  pop.style.position = "absolute";
  // compute position relative to card
  const rect = anchorBtn.getBoundingClientRect();
  pop.style.top = (anchorBtn.offsetTop + anchorBtn.offsetHeight + 6) + "px";
  pop.style.left = (anchorBtn.offsetLeft - 10) + "px";
  pop.style.background = "var(--panel)";
  pop.style.color = "var(--text)";
  pop.style.padding = "10px";
  pop.style.borderRadius = "8px";
  pop.style.boxShadow = "0 10px 30px rgba(0,0,0,0.6)";
  pop.style.zIndex = 9999;
  pop.style.minWidth = "200px";

  const title = document.createElement("div"); title.textContent = "Add to playlist"; title.style.fontWeight = "700"; title.style.marginBottom = "8px"; pop.appendChild(title);

  if (!playlists.length) {
    const no = document.createElement("div"); no.textContent = "No playlists yet."; no.style.color = "var(--muted)"; no.style.marginBottom = "8px"; pop.appendChild(no);
    const createNow = document.createElement("button");
    createNow.textContent = "+ Create";
    createNow.style.background = "var(--accent-2)"; createNow.style.border = "none"; createNow.style.padding = "8px 10px"; createNow.style.borderRadius = "8px"; createNow.style.cursor = "pointer";
    createNow.onclick = () => {
      const name = prompt("Playlist name:");
      if (!name) return;
      const all = loadPlaylistsFromStorage();
      all.push(createEmptyPlaylist(name));
      savePlaylistsToStorage(all);
      renderPlaylists(); renderSidebarPlaylists();
      const chooser = document.getElementById("playlistChooserPopover"); if (chooser) chooser.remove();
    };
    pop.appendChild(createNow);
  } else {
    playlists.forEach(pl => {
      const row = document.createElement("div");
      row.style.display = "flex"; row.style.justifyContent = "space-between"; row.style.alignItems = "center"; row.style.marginBottom = "8px"; row.style.cursor = "pointer";
      const left = document.createElement("div"); left.textContent = pl.name; left.style.color = "var(--text)";
      left.onclick = () => {
        const raw = card.getAttribute("data-id") || card.dataset.id || "";
        const vid = extractVideoId(raw) || raw;
        if (!vid) return alert("Invalid id");
        const songObj = {
          videoId: vid,
          title: card.getAttribute("data-title") || card.dataset.title || (card.querySelector(".title")?.textContent || "Unknown"),
          artist: card.getAttribute("data-artist") || card.dataset.artist || (card.querySelector(".artist")?.textContent || ""),
          cover: card.getAttribute("data-cover") || card.dataset.cover || (card.querySelector("img")?.src || "")
        };
        addSongToPlaylist(pl.id, songObj);
        const chooser = document.getElementById("playlistChooserPopover"); if (chooser) chooser.remove();
      };
      const cnt = document.createElement("div"); cnt.textContent = `${pl.songs.length}`; cnt.style.color = "var(--muted)";
      row.appendChild(left); row.appendChild(cnt); pop.appendChild(row);
    });
  }

  // append popover to card
  card.appendChild(pop);

  function closeOnClickOutside(e) {
    if (!pop.contains(e.target) && e.target !== anchorBtn) {
      pop.remove();
      document.removeEventListener("click", closeOnClickOutside);
    }
  }
  setTimeout(() => document.addEventListener("click", closeOnClickOutside), 50);
}

/* highlight playing card */
function highlightCurrentPlayingInGrid(vid) {
  const grid = $id("songGrid"); if (!grid) return;
  Array.from(grid.querySelectorAll(".song-card")).forEach(c => {
    const raw = c.getAttribute("data-id") || c.dataset.id || "";
    const id = extractVideoId(raw) || raw;
    c.style.outline = (id && vid && id === vid) ? "2px solid rgba(29,123,255,0.85)" : "none";
  });
}

/* ---- Search / Load ---- */
function localSearch(query) {
  const q = (query || "").toLowerCase().trim();
  if (!q) return null;
  // match title or artist substring
  for (const s of SONGS) {
    if ((s.title || "").toLowerCase().includes(q) || (s.artist || "").toLowerCase().includes(q)) return s;
  }
  return null;
}

async function loadMusic() {
  const input = $id(INPUT_ID);
  if (!input) return alert("Search input not found.");
  const raw = input.value.trim();
  if (!raw) return alert("Type a song title/artist or paste a YouTube link.");

  // if it's a URL -> try extract video id
  const isUrl = /(youtube\.com|youtu\.be)/i.test(raw);
  if (isUrl) {
    const vid = extractVideoId(raw);
    if (!vid) return alert("Could not extract video id from link.");
    currentQueue = [vid]; currentIndex = 0; setVideoById(vid); return;
  }

  // local search first
  const found = localSearch(raw);
  if (found) {
    currentQueue = [found.videoId]; currentIndex = 0; setVideoById(found.videoId); return;
  }

  // no backend search available here — notify user
  alert("No local match found. Paste a YouTube link or add the song to the featured list.");
}

/* ---- Init UI wiring ---- */
document.addEventListener("DOMContentLoaded", () => {
  // populate song grid from SONGS array (so user can change SONGS easily)
  const grid = $id("songGrid");
  if (grid) {
    grid.innerHTML = ""; // clear existing if any
    SONGS.forEach(s => {
      const card = document.createElement("div");
      card.className = "song-card";
      card.setAttribute("data-id", s.videoId);
      card.setAttribute("data-title", s.title);
      card.setAttribute("data-artist", s.artist);
      card.setAttribute("data-cover", s.cover);
      card.innerHTML = `
        <img class="song-cover" src="${s.cover}" alt="">
        <div class="song-meta"><div class="title">${s.title}</div><div class="artist muted">${s.artist}</div></div>
        <button class="add-to-pl-btn" title="Add to playlist">+</button>
      `;
      grid.appendChild(card);
    });
  }

  // init visuals & wiring
  initWaveBars();
  wireSongGrid();
  renderPlaylists();

  // wires
  const loadBtn = $id(LOAD_BTN_ID); if (loadBtn) loadBtn.addEventListener("click", loadMusic);
  const inputEl = $id(INPUT_ID); if (inputEl) inputEl.addEventListener("keydown", e => { if (e.key === "Enter") loadMusic(); });

  const playBtn = $id(PLAY_BTN_ID); if (playBtn) playBtn.addEventListener("click", () => {
    // if nothing is loaded but there's a queued cued video, play the first
    if (!currentVideoId && currentQueue.length) { setVideoById(currentQueue[0]); return; }
    togglePlay();
  });

  const nextBtn = $id("nextBtn"); if (nextBtn) nextBtn.addEventListener("click", next);
  const prevBtn = $id("prevBtn"); if (prevBtn) prevBtn.addEventListener("click", prev);
  const rewBtn = $id("rewBtn"); if (rewBtn) rewBtn.addEventListener("click", () => alert("Rewind/forward needs YouTube IFrame API for precise seek — ask me if you want that."));
  const fwdBtn = $id("fwdBtn"); if (fwdBtn) fwdBtn.addEventListener("click", () => alert("Rewind/forward needs YouTube IFrame API for precise seek — ask me if you want that."));

  const createBtn = $id("createPlaylistBtn");
  if (createBtn) createBtn.addEventListener("click", () => {
    const name = prompt("Playlist name:");
    if (!name) return;
    const all = loadPlaylistsFromStorage();
    all.push(createEmptyPlaylist(name));
    savePlaylistsToStorage(all);
    renderPlaylists(); renderSidebarPlaylists();
  });

  // global click: close popovers if clicked outside
  document.addEventListener("click", (e) => {
    const chooser = document.getElementById("playlistChooserPopover");
    if (chooser && !chooser.contains(e.target) && !e.target.classList?.contains("add-to-pl-btn")) chooser.remove();
  });
});

/* expose some functions for debugging / console usage */
window.loadMusic = loadMusic;
window.setVideoById = setVideoById;
window.next = next;
window.prev = prev;
window.addSongToPlaylist = addSongToPlaylist;
window.SONGS = SONGS;
