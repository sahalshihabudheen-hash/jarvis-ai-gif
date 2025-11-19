const INPUT_ID = "ytInput";
const LOAD_BTN_ID = "loadBtn";
const PLAYER_IFRAME_ID = "ytPlayer"; // audio element
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

/* utils */
function extractVideoId(url) { if(!url) return null; url=url.trim(); if(/^[A-Za-z0-9_-]{10,}$/.test(url)) return url; if(url.includes("youtu.be/")) return url.split("youtu.be/")[1].split(/[?&]/)[0]; if(url.includes("v=")) return url.split("v=")[1].split("&")[0]; const m=url.match(/\/embed\/([A-Za-z0-9_\-]+)/); if(m) return m[1]; return null; }

/* set audio by ID */
function setVideoById(vid){
  if(!vid) return;
  const player=document.getElementById(PLAYER_IFRAME_ID);
  currentVideoId=vid; isPlaying=true;
  if(player) player.src=`https://www.youtube.com/watch?v=${vid}`; player.play?.();
  updatePlayButton(); setProgress(0); startProgressSimulation(); startWaveAnimation();
}

/* play/pause toggle */
function togglePlay(){ 
  const player=document.getElementById(PLAYER_IFRAME_ID);
  if(!currentVideoId) return;
  const p=player; 
  if(isPlaying){p?.pause?.(); isPlaying=false; updatePlayButton(); stopProgressSimulation(); stopWaveAnimation();}
  else{p?.play?.(); isPlaying=true; updatePlayButton(); startProgressSimulation(); startWaveAnimation();}
}
function updatePlayButton(){ const el=document.getElementById(PLAY_BTN_ID); if(!el) return; el.textContent=isPlaying?"⏸":"▶"; }

/* progress simulation */
function setProgress(p){ const fill=document.getElementById(PROGRESS_FILL_ID); if(fill) fill.style.width=`${Math.max(0,Math.min(100,p))}%`; }
function startProgressSimulation(){ clearInterval(progressInterval); let val=0; progressInterval=setInterval(()=>{ if(!isPlaying) return; val+=0.7; if(val>100) val=0; setProgress(val); },500);}
function stopProgressSimulation(){ clearInterval(progressInterval); }

/* waves */
function initWaveBars(){ const container=document.getElementById(WAVE_CONTAINER_ID); if(!container) return; container.innerHTML=""; waveBars=[]; for(let i=0;i<NUM_BARS;i++){const bar=document.createElement("div"); bar.className="wave-bar"; bar.style.setProperty("--scale",Math.random()); container.appendChild(bar); waveBars.push(bar); } }
function startWaveAnimation(){ waveBars.forEach(b=>b.style.animationPlayState="running"); }
function stopWaveAnimation(){ waveBars.forEach(b=>b.style.animationPlayState="paused"); }

/* queue */
function next(){ if(!currentQueue.length) return alert("Queue empty"); currentIndex=(currentIndex+1)%currentQueue.length; setVideoById(currentQueue[currentIndex]); }
function prev(){ if(!currentQueue.length) return alert("Queue empty"); currentIndex=(currentIndex-1+currentQueue.length)%currentQueue.length; setVideoById(currentQueue[currentIndex]); }

/* playlists */
function loadPlaylistsFromStorage(){ try{ const raw=localStorage.getItem(STORAGE_KEY); return raw?JSON.parse(raw):[]; }catch(e){ return[]; } }
function savePlaylistsToStorage(list){ try{ localStorage.setItem(STORAGE_KEY,JSON.stringify(list||[])); }catch(e){} }
function createEmptyPlaylist(name){ return { id:`pl_${Date.now()}`, name:name||"New Playlist", songs:[] }; }

function renderPlaylists(){ 
  const area=document.getElementById("playlistArea"); const playlists=loadPlaylistsFromStorage();
  if(area){ area.innerHTML=""; if(playlists.length===0){ const note=document.createElement("div"); note.textContent="No playlists yet."; area.appendChild(note); } else { playlists.forEach(pl=>{ const plWrap=document.createElement("div"); plWrap.textContent=pl.name; area.appendChild(plWrap); }); } }
}

function addSongToPlaylist(playlistId,songObj){ const all=loadPlaylistsFromStorage(); const pl=all.find(x=>x.id===playlistId); if(!pl) return alert("Playlist not found"); if(pl.songs.some(s=>s.videoId===songObj.videoId)) return alert("Song already in playlist"); pl.songs.push(songObj); savePlaylistsToStorage(all); renderPlaylists(); alert(`Added "${songObj.title}" to "${pl.name}"`); }

/* add-to-playlist button */
function openAddToPlaylistPopover(){
  const existing=document.getElementById("addToPlaylistPopover"); if(existing) existing.remove();
  if(!currentVideoId) return alert("No song playing");
  const playlists=loadPlaylistsFromStorage(); if(playlists.length===0) return alert("No playlists. Create one first.");
  const btn=document.getElementById("addToPlaylistBtn");
  const pop=document.createElement("div");
  pop.id="addToPlaylistPopover";
  pop.style.position="absolute"; pop.style.bottom=(btn.offsetHeight+10)+"px"; pop.style.left=btn.offsetLeft+"px";
  pop.style.background="var(--card,#0f1416)"; pop.style.color="#e9f2ef"; pop.style.padding="10px"; pop.style.borderRadius="8px"; pop.style.boxShadow="0 10px 30px rgba(0,0,0,0.6)"; pop.style.zIndex=9999; pop.style.minWidth="180px";
  playlists.forEach(pl=>{ const row=document.createElement("div"); row.textContent=pl.name; row.style.cursor="pointer"; row.style.marginBottom="6px"; row.onclick=()=>{ const songObj={ videoId:currentVideoId, title:document.getElementById("trackTitle")?.textContent||"Unknown", artist:document.getElementById("trackArtist")?.textContent||"Unknown" }; addSongToPlaylist(pl.id,songObj); pop.remove(); }; pop.appendChild(row); });
  document.body.appendChild(pop);
  function closeOnClickOutside(e){ if(!pop.contains(e.target)&&e.target!==btn){ pop.remove(); document.removeEventListener("click",closeOnClickOutside);} }
  setTimeout(()=>document.addEventListener("click",closeOnClickOutside),50);
}

/* search/load music */
async function loadMusic(){ 
  const input=document.getElementById(INPUT_ID); if(!input) return alert("Search input not found");
  const raw=input.value.trim(); if(!raw) return alert("Type a song or paste a link"); 
  const isUrl=/(youtube\.com|youtu\.be)/i.test(raw);
  if(isUrl){ const vid=extractVideoId(raw); if(!vid) return alert("Invalid link"); currentQueue=[vid]; currentIndex=0; setVideoById(vid); return; }
  alert("Search by name not supported without API key. Paste YouTube link to play.");
}

/* init */
document.addEventListener("DOMContentLoaded",()=>{
  initWaveBars();
  renderPlaylists();

  const loadBtn=document.getElementById(LOAD_BTN_ID); if(loadBtn) loadBtn.addEventListener("click",loadMusic);
  const inputEl=document.getElementById(INPUT_ID); if(inputEl) inputEl.addEventListener("keydown",e=>{ if(e.key==="Enter") loadMusic(); });

  const playBtn=document.getElementById(PLAY_BTN_ID); if(playBtn) playBtn.addEventListener("click",togglePlay);
  const nextBtn=document.getElementById("nextBtn"); if(nextBtn) nextBtn.addEventListener("click",next);
  const prevBtn=document.getElementById("prevBtn"); if(prevBtn) prevBtn.addEventListener("click",prev);
  const addPlBtn=document.getElementById("addToPlaylistBtn"); if(addPlBtn) addPlBtn.addEventListener("click",openAddToPlaylistPopover);

  const createBtn=document.getElementById("createPlaylistBtn"); if(createBtn) createBtn.addEventListener("click",()=>{ const name=prompt("Playlist name:"); if(!name) return; const all=loadPlaylistsFromStorage(); all.push(createEmptyPlaylist(name)); savePlaylistsToStorage(all); renderPlaylists(); });
});

/* expose */
window.loadMusic=loadMusic;
window.setVideoById=setVideoById;
window.next=next;
window.prev=prev;
window.extractVideoId=extractVideoId;
