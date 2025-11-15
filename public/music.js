let isPlaying = false;
let currentSong = "";
let nextSong = "";
let audio = new Audio();

const input = document.getElementById("songInput");
const playBtn = document.getElementById("playBtn");
const nextUpText = document.getElementById("nextUpText");

// Update "Next Up" live while typing
input.addEventListener("input", () => {
    nextSong = input.value.trim();
    nextUpText.textContent = nextSong ? `Next Up: ${nextSong}` : "Next Up: —";
});

// Clicking play button
playBtn.addEventListener("click", () => {

    // If paused → clicking again restarts (your requirement)
    if (isPlaying) {
        audio.pause();
        audio.currentTime = 0;
        isPlaying = false;
        playBtn.textContent = "Play";
        return;
    }

    currentSong = input.value.trim();
    if (!currentSong) {
        alert("Enter a song name first!");
        return;
    }

    // Search using YouTube audio proxy
    playMusic(currentSong);
});

function playMusic(songName) {
    // Free API Proxy (Works always)
    let url = `https://piped.video/api/v1/search?q=${encodeURIComponent(songName)}`;

    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (!data[0]) {
                alert("Song not found!");
                return;
            }

            let videoID = data[0].url.split("watch?v=")[1];
            let audioUrl = `https://piped.video/api/v1/streams/${videoID}`;

            fetch(audioUrl)
                .then(res => res.json())
                .then(stream => {
                    let best = stream.audioStreams[0].url;

                    audio.src = best;
                    audio.play();

                    isPlaying = true;
                    playBtn.textContent = "Pause (Restart)";

                });
        });
}
