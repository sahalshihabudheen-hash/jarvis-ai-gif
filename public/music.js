/* music.js — final consolidated & fixed version
   - Play featured song cards
   - Playlist create/add/remove + persistence
   - Queue support (next / prev)
   - Wave & progress simulation
   - Fully defensive and dynamic
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

/* add song to playlist by id */
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

/* render playlists */
function renderPlaylists() {
  const area = document.getElementById("playlistArea");
  const sidebar = document.getElementById("sidebarPlaylists");
  const playlists = loadPlaylistsFromStorage();

  if (area) {
    area.innerHTML = "";
    if (playlists.length === 0) {
      const note = document.createElement("div");
      note.style.color = "var(--muted)";
      note.style.fontSize = "14px";
      note.textContent = "No playlists yet — create one with the + button.";
      area.appendChild(note);
    } else {
      playlists.forEach(pl => {
        const plWrap = document.createElement("div");
        plWrap.className = "playlist-wrap";
        const header = document.createElement("div");
        header.style.display = "flex"; header.style.justifyContent = "space-between"; header.style.alignItems = "center";
        const title = document.createElement("div"); title.textContent = `${pl.name} (${pl.songs.length})`; title.style.fontWeight = "700";
        const controls = document.createElement("div");
        const playAllBtn = document.createElement("button"); playAllBtn.textContent = "▶"; playAllBtn.className = "btn";
        playAllBtn.onclick = e => { e.stopPropagation(); if (!pl.songs.length) return alert("Empty playlist"); currentQueue = pl.songs.map(s => s.videoId); currentIndex = 0; setVideoById(currentQueue[0]); };
        const delBtn = document.createElement("button"); delBtn.textContent = "🗑"; delBtn.className = "btn";
        delBtn.onclick = e => { e.stopPropagation(); if (!confirm(`Delete "${pl.name}"?`)) return; const all = loadPlaylistsFromStorage(); savePlaylistsToStorage(all.filter(x => x.id!==pl.id)); renderPlaylists(); };
        controls.appendChild(playAllBtn); controls.appendChild(delBtn);
        header.appendChild(title); header.appendChild(controls);
        plWrap.appendChild(header);

        pl.songs.forEach(s => {
          const row = document.createElement("div"); row.style.display = "flex"; row.style.justifyContent = "space-between"; row.style.alignItems = "center"; row.style.gap = "8px";
          const left = document.createElement("div"); left.style.display = "flex"; left.style.alignItems = "center"; left.style.gap = "10px"; left.style.cursor = "pointer";
          const thumb = document.createElement("img"); thumb.src = s.cover || `https://i.ytimg.com/vi/${s.videoId}/default.jpg`; thumb.style.width = "46px"; thumb.style.height = "46px"; thumb.style.objectFit="cover"; thumb.style.borderRadius="6px";
          const meta = document.createElement("div"); const t=document.createElement("div"); t.textContent=s.title||"Unknown"; t.style.fontWeight="600"; const a=document.createElement("div"); a.textContent=s.artist||""; a.style.fontSize="12px"; a.style.color="var(--muted)"; meta.appendChild(t); meta.appendChild(a);
          left.appendChild(thumb); left.appendChild(meta); left.onclick = ()=> setVideoById(s.videoId);
          const right = document.createElement("div"); right.style.display="flex"; right.style.gap="8px"; const remBtn=document.createElement("button"); remBtn.textContent="✖"; remBtn.className="btn"; remBtn.onclick = e=>{ e.stopPropagation(); if(!confirm(`Remove "${s.title}"?`)) return; pl.songs=pl.songs.filter(x=>x.videoId!==s.videoId); savePlaylistsToStorage(loadPlaylistsFromStorage()); renderPlaylists(); };
          right.appendChild(remBtn); row.appendChild(left); row.appendChild(right); plWrap.appendChild(row);
        });

        area.appendChild(plWrap);
      });
    }
  }

  if (sidebar) {
    sidebar.innerHTML="";
    playlists.forEach(pl=>{
      const btn=document.createElement("button"); btn.className="pl-btn"; btn.textContent=`${pl.name} (${pl.songs.length})`;
      btn.onclick=()=>{ if(!pl.songs.length) return alert("Empty"); currentQueue=pl.songs.map(s=>s.videoId); currentIndex=0; setVideoById(currentQueue[0]); };
      sidebar.appendChild(btn);
    });
  }
}

/* wire song grid */
function wireSongGrid() {
  const grid = document.getElementById("songGrid");
  if (!grid) return;
  const attach = (card)=>{
    if (!card.style.position) card.style.position="relative";
    const addBtn = card.querySelector(".add-to-pl-btn") || (()=>{ const b=document.createElement("button"); b.className="add-to-pl-btn"; b.textContent="+"; b.title="Add to playlist"; b.style.position="absolute"; b.style.top="8px"; b.style.right="8px"; b.style.zIndex="5"; card.appendChild(b); return b; })();
    addBtn.onclick=e=>{ e.stopPropagation(); openPlaylistChooserForCard(card, addBtn); };
    card.onclick=e=>{ if(e.target===addBtn) return; const raw=card.dataset.id||""; const vid=extractVideoId(raw)||raw; if(!vid) return; const allIds=Array.from(grid.querySelectorAll(".song-card")).map(c=>extractVideoId(c.dataset.id||"")||c.dataset.id||""); currentQueue=allIds.filter(x=>!!x); currentIndex=currentQueue.indexOf(vid); if(currentIndex===-1){currentQueue=[vid];currentIndex=0;} setVideoById(vid); };
  };
  Array.from(grid.querySelectorAll(".song-card")).forEach(attach);
}

/* chooser popover */
function openPlaylistChooserForCard(card, anchorBtn) {
  const existing=document.getElementById("playlistChooserPopover"); if(existing) existing.remove();
  const playlists=loadPlaylistsFromStorage();
  const pop=document.createElement("div"); pop.id="playlistChooserPopover"; pop.style.position="absolute"; pop.style.top=(anchorBtn.offsetTop+anchorBtn.offsetHeight+6)+"px"; pop.style.right="8px"; pop.style.background="var(--card,#0f1720)"; pop.style.color="#e9f2ef"; pop.style.padding="10px"; pop.style.borderRadius="8px"; pop.style.boxShadow="0 10px 30px rgba(0,0,0,0.6)"; pop.style.zIndex=9999; pop.style.minWidth="180px";
  const title=document.createElement("div"); title.textContent="Add to playlist"; title.style.fontWeight="700"; title.style.marginBottom="8px"; pop.appendChild(title);

  if(playlists.length===0){
    const no=document.createElement("div"); no.textContent="No playlists yet."; no.style.color="var(--muted)"; no.style.marginBottom="8px"; pop.appendChild(no);
    const createNow=document.createElement("button"); createNow.textContent="+ Create"; createNow.style.background="var(--accent, #1db954)"; createNow.style.border="none"; createNow.style.padding="8px 10px"; createNow.style.borderRadius="8px"; createNow.style.cursor="pointer";
    createNow.onclick=()=>{ const name=prompt("Playlist name:"); if(!name)return; const all=loadPlaylistsFromStorage(); all.push(createEmptyPlaylist(name)); savePlaylistsToStorage(all); renderPlaylists(); pop.remove(); };
    pop.appendChild(createNow);
  } else playlists.forEach(pl=>{
    const row=document.createElement("div"); row.style.display="flex"; row.style.justifyContent="space-between"; row.style.alignItems="center"; row.style.marginBottom="6px"; row.style.cursor="pointer";
    const left=document.createElement("div"); left.textContent=pl.name; left.style.color="#e9f2ef"; left.onclick=()=>{ const raw=card.dataset.id||""; const vid=extractVideoId(raw)||raw; if(!vid)return; addSongToPlaylist(pl.id,{ videoId:vid, title:card.dataset.title||card.querySelector(".title")?.textContent||"Unknown", artist:card.dataset.artist||card.querySelector(".artist")?.textContent||"", cover:card.dataset.cover||card.querySelector("img")?.src||"" }); pop.remove(); }; const cnt=document.createElement("div"); cnt.textContent=`${pl.songs.length}`; cnt.style.color="var(--muted)";
    row.appendChild(left); row.appendChild(cnt); pop.appendChild(row);
  });

  card.appendChild(pop);
  function closeOutside(e){ if(!pop.contains(e.target)&&e.target!==anchorBtn){ pop.remove(); document.removeEventListener("click",closeOutside); } }
  setTimeout(()=>document.addEventListener("click",closeOutside),50);
}

/* highlight grid */
function highlightCurrentPlayingInGrid(vid){
  const grid=document.getElementById("songGrid"); if(!grid)return;
  Array.from(grid.querySelectorAll(".song-card")).forEach(c=>{ const id=extractVideoId(c.dataset.id||""); c.style.outline=(id&&vid&&id===vid)?"2px solid rgba(29,123,255,0.85)":"none"; });
}

/* search/load music */
async function loadMusic(){
  const input=document.getElementById(INPUT_ID); if(!input)return alert("Search input not found.");
  const raw=input.value.trim(); if(!raw)return alert("Type a song name or paste a YouTube link.");
  const isUrl=/(youtube\.com|youtu\.be)/i.test(raw);
  if(isUrl){ const vid=extractVideoId(raw); if(!vid)return alert("Could not extract video id from link."); currentQueue=[vid]; currentIndex=0; setVideoById(vid); return; }
  try{
    const resp=await fetch(`/api/search?q=${encodeURIComponent(raw)}`);
    const data=await resp.json();
    if(!data.videoId)return alert("Search failed. Try another query or paste a link.");
    currentQueue=[data.videoId]; currentIndex=0; setVideoById(data.videoId);
  }catch(err){ console.error(err); alert("Search failed. Try again."); }
}

/* init */
document.addEventListener("DOMContentLoaded",()=>{
  initWaveBars();
  wireSongGrid();
  renderPlaylists();

  const loadBtn=document.getElementById(LOAD_BTN_ID); if(loadBtn) loadBtn.addEventListener("click",loadMusic);
  const inputEl=document.getElementById(INPUT_ID); if(inputEl) inputEl.addEventListener("keydown",e=>{ if(e.key==="Enter") loadMusic(); });

  const playBtn=document.getElementById(PLAY_BTN_ID); if(playBtn) playBtn.addEventListener("click",togglePlay);
  const nextBtn=document.getElementById("nextBtn"); if(nextBtn) nextBtn.addEventListener("click",next);
  const prevBtn=document.getElementById("prevBtn"); if(prevBtn) prevBtn.addEventListener("click",prev);

  const createBtn=document.getElementById("createPlaylistBtn"); if(createBtn) createBtn.addEventListener("click",()=>{
    const name=prompt("Playlist name:"); if(!name)return; const all=loadPlaylistsFromStorage(); all.push(createEmptyPlaylist(name)); savePlaylistsToStorage(all); renderPlaylists();
  });

  document.addEventListener("click",e=>{
    const chooser=document.getElementById("playlistChooserPopover");
    if(chooser && !chooser.contains(e.target) && !e.target.classList?.contains("add-to-pl-btn")) chooser.remove();
  });
});

/* expose globally */
window.loadMusic = loadMusic;
window.setVideoById = setVideoById;
window.next = next;
window.prev = prev;
window.extractVideoId = extractVideoId;
