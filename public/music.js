/* music.js — final consolidated version (updated)
   - Play featured song cards
   - Playlist create/add/remove + persistence (jarvis_playlists)
   - Queue support (next / prev)
   - Wave & progress simulation
   - Search results now have Add-to-Playlist support
*/

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

let currentVideoId = null;
let isPlaying = false;
let progressInterval = null;
let waveBars = [];
let currentQueue = [];
let currentIndex = -1;

/* util to extract youtube id */
function extractVideoId(url) {
  if (!url) return null;
  try {
    url = url.trim();
    if (/^[A-Za-z0-9_-]{10,}$/.test(url)) return url;
    if (url.includes("youtu.be/")) return url.split("youtu.be/")[1].split(/[?&]/)[0];
    if (url.includes("v=")) return url.split("v=")[1].split("&")[0];
    const m = url.match(/\/embed\/([A-Za-z0-9_\-]+)/);
    if (m) return m[1];
  } catch (e) {}
  return null;
}

/* set video by ID */
function setVideoById(vid) {
  if (!vid) return;
  const player = document.getElementById(PLAYER_IFRAME_ID);
  const cover = document.getElementById(COVER_IMG_ID);
  const titleEl = document.getElementById(TITLE_ID);
  const artistEl = document.getElementById(ARTIST_ID);
  const miniCover = document.getElementById("miniCover");

  if (player) player.src = `https://www.youtube.com/embed/${vid}?autoplay=1&controls=1&rel=0&modestbranding=1`;
  currentVideoId = vid;
  isPlaying = true;
  if (cover) cover.src = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
  if (miniCover) miniCover.src = `https://i.ytimg.com/vi/${vid}/mqdefault.jpg`;

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

  const idx = currentQueue.indexOf(vid);
  if (idx !== -1) currentIndex = idx;
  else { currentQueue = [vid]; currentIndex = 0; }

  updatePlayButton();
  setProgress(0);
  startProgressSimulation();
  startWaveAnimation();
}

/* play/pause toggle */
function togglePlay() {
  const player = document.getElementById(PLAYER_IFRAME_ID);
  if (!currentVideoId) return;
  if (isPlaying) {
    if (player) player.src = "";
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

/* progress simulation */
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
function stopProgressSimulation() { clearInterval(progressInterval); }

/* waves */
function initWaveBars() {
  const container = document.getElementById(WAVE_CONTAINER_ID);
  if (!container) return;
  container.innerHTML = "";
  waveBars = [];
  for (let i = 0; i < NUM_BARS; i++) {
    const bar = document.createElement("div");
    bar.className = "wave-bar";
    bar.style.setProperty("--scale", Math.random().toString());
    container.appendChild(bar);
    waveBars.push(bar);
  }
}
function startWaveAnimation() { waveBars.forEach(b => b.style.animationPlayState = "running"); }
function stopWaveAnimation() { waveBars.forEach(b => b.style.animationPlayState = "paused"); }

/* queue next/prev */
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

/* playlists */
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

/* render playlists in right panel and sidebar */
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
          setVideoById(currentQueue[0]);
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

/* add song to playlist by id */
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
function renderSidebarPlaylists() { renderPlaylists(); }

/* wire song grid (play + add) */
function wireSongGrid() {
  const grid = document.getElementById("songGrid");
  if (!grid) return;
  const cards = Array.from(grid.querySelectorAll(".song-card"));

  cards.forEach(card => {
    if (!card.style.position) card.style.position = "relative";

    card.addEventListener("click", (ev) => {
      if (ev.target && ev.target.classList && ev.target.classList.contains("add-to-pl-btn")) return;
      const raw = card.getAttribute("data-id") || card.dataset.id || "";
      const vid = extractVideoId(raw) || raw;
      if (!vid) return alert("Cannot play this item (invalid video id).");
      const allIds = cards.map(c => extractVideoId(c.getAttribute("data-id") || c.dataset.id) || (c.getAttribute("data-id") || c.dataset.id));
      currentQueue = allIds.filter(x => !!x);
      currentIndex = currentQueue.indexOf(vid);
      if (currentIndex === -1) { currentQueue = [vid]; currentIndex = 0; }
      setVideoById(vid);
    });

    const addBtn = card.querySelector(".add-to-pl-btn");
    if (addBtn) {
      addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openPlaylistChooserForCard(card, addBtn);
      });
    } else {
      const btn = document.createElement("button");
      btn.className = "add-to-pl-btn";
      btn.textContent = "+";
      btn.title = "Add to playlist";
      btn.style.position = "absolute"; btn.style.top = "8px"; btn.style.right = "8px"; btn.style.zIndex = "5";
      card.appendChild(btn);
      btn.addEventListener("click", (e) => { e.stopPropagation(); openPlaylistChooserForCard(card, btn); });
    }
  });
}

/* chooser popover */
function openPlaylistChooserForCard(card, anchorBtn) {
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

  const title = document.createElement("div"); title.textContent = "Add to playlist"; title.style.fontWeight = "700"; title.style.marginBottom = "8px"; pop.appendChild(title);

  if (playlists.length === 0) {
    const no = document.createElement("div"); no.textContent = "No playlists yet."; no.style.color = "var(--muted)"; no.style.marginBottom = "8px"; pop.appendChild(no);
    const createNow = document.createElement("button"); createNow.textContent = "+ Create"; createNow.style.background = "var(--accent-2)"; createNow.style.border = "none"; createNow.style.padding = "8px 10px"; createNow.style.borderRadius = "8px"; createNow.style.cursor = "pointer";
    createNow.onclick = () => { const name = prompt("Playlist name:"); if (!name) return; const all = loadPlaylistsFromStorage(); all.push(createEmptyPlaylist(name)); savePlaylistsToStorage(all); renderPlaylists(); renderSidebarPlaylists(); pop.remove(); };
    pop.appendChild(createNow);
  } else {
    playlists.forEach(pl => {
      const r = document.createElement("div");
      r.style.display = "flex";
      r.style.justifyContent = "space-between";
      r.style.alignItems = "center";
      r.style.marginBottom = "6px";
      r.style.cursor = "pointer";
      const left = document.createElement("div"); left.textContent = pl.name; left.style.color = "#e9f2ef";
      left.onclick = () => {
        const raw = card.getAttribute("data-id") || card.dataset.id || "";
        const vid = extractVideoId(raw) || raw;
        if (!vid) return alert("Invalid video id");
        const songObj = {
          videoId: vid,
          title: card.getAttribute("data-title") || card.dataset.title || (card.querySelector(".title")?.textContent || card.querySelector("h4")?.textContent || "Unknown"),
          artist: card.getAttribute("data-artist") || card.dataset.artist || (card.querySelector(".artist")?.textContent || ""),
          cover: card.getAttribute("data-cover") || card.dataset.cover || (card.querySelector("img")?.src || "")
        };
        addSongToPlaylist(pl.id, songObj); const chooser = document.getElementById("playlistChooserPopover"); if (chooser) chooser.remove();
      };
      const cnt = document.createElement("div"); cnt.textContent = `${pl.songs.length}`; cnt.style.color = "var(--muted)";
      r.appendChild(left); r.appendChild(cnt); pop.appendChild(r);
    });
  }

  document.body.appendChild(pop);
  const closeFn = (e) => { if (!pop.contains(e.target) && e.target !== anchorBtn) pop.remove(); document.removeEventListener("click", closeFn); };
  document.addEventListener("click", closeFn);
}

/* highlight playing card in grid */
function highlightCurrentPlayingInGrid(vid) {
  const grid = document.getElementById("songGrid");
  if (!grid) return;
  Array.from(grid.querySelectorAll(".song-card")).forEach(c => {
    const id = extractVideoId(c.getAttribute("data-id") || c.dataset.id || "");
    c.classList.toggle("playing", id === vid);
  });
}

/* search & load music */
function loadMusic(urlOrId) {
  const vid = extractVideoId(urlOrId) || urlOrId;
  if (!vid) return alert("Invalid video URL/ID");
  currentQueue = [vid];
  currentIndex = 0;
  setVideoById(vid);

  // Ensure search result can be added to playlist
  const grid = document.getElementById("songGrid");
  if (grid && !grid.querySelector(`.search-temp-card[data-id="${vid}"]`)) {
    const tempCard = document.createElement("div");
    tempCard.className = "song-card search-temp-card";
    tempCard.setAttribute("data-id", vid);
    tempCard.setAttribute("data-title", "YouTube Video");
    tempCard.setAttribute("data-artist", "YouTube");
    tempCard.setAttribute("data-cover", `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`);
    tempCard.style.display = "none";
    grid.appendChild(tempCard);
    wireSongGrid();
  }
}

/* init on page load */
window.addEventListener("DOMContentLoaded", () => {
  initWaveBars();
  renderPlaylists();
  wireSongGrid();
  const playBtn = document.getElementById(PLAY_BTN_ID);
  if (playBtn) playBtn.addEventListener("click", togglePlay);
});
