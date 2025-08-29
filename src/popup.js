import { searchYouTube, hasApiKey } from "./youtube.js";

const dom = {
  form: document.getElementById("searchForm"),
  q: document.getElementById("q"),
  results: document.getElementById("results"),
  apiKeyWarning: document.getElementById("apiKeyWarning"),
  btnPlayPause: document.getElementById("btnPlayPause"),
  volume: document.getElementById("volume"),
  nowPlaying: document.getElementById("nowPlaying"),
  btnOpenYouTube: document.getElementById("btnOpenYouTube"),
  timeDisplay: document.getElementById("timeDisplay")
};

let playing = false;
let current = null;

let currentTime = 0;
let duration = 0;

init();

setInterval(() => {
  if (current) {
    chrome.runtime.sendMessage({ target: "offscreen", action: "GET_TIME" });
  }
}, 1000);

function init() {
  if (!hasApiKey()) {
    dom.apiKeyWarning.classList.remove("hidden");
  }

  dom.form.addEventListener("submit", onSearch);
  dom.btnPlayPause.addEventListener("click", onTogglePlayPause);
  dom.volume.addEventListener("input", onVolume);
  dom.btnOpenYouTube.addEventListener("click", openYouTubeToLogin);

  chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  if (msg?.from !== "offscreen") return;
  // LOG: muestra todos los mensajes recibidos
  console.log("Popup recibió mensaje:", msg);
  if (msg.event === "CURRENT_TIME") {
    currentTime = msg.payload?.currentTime || 0;
    updateTimeDisplay();
  }
  if (msg.event === "DURATION") {
    duration = msg.payload?.duration || 0;
    updateTimeDisplay();
  }
  if (msg.event === "PLAYER_STATE") {
    // ... lo que ya tienes ...
  }
});

  // Request state on open
  chrome.runtime.sendMessage({ target: "background", action: "GET_STATE" });
}

async function onSearch(e) {
  e.preventDefault();
  const q = dom.q.value.trim();
  if (!q) return;
  dom.results.innerHTML = "Buscando...";
  try {
    const items = await searchYouTube(q);
    renderResults(items);
  } catch (err) {
    if (err.message === "NO_API_KEY") {
      dom.results.innerHTML = "Configura tu YouTube API Key en src/config.js";
    } else {
      dom.results.innerHTML = `Error al buscar: ${err.message}`;
    }
  }
}

function renderResults(items) {
  if (!items.length) {
    dom.results.innerHTML = "<div style='padding:12px;color:#a0a0ad'>Sin resultados</div>";
    return;
  }
  const frag = document.createDocumentFragment();
  for (const it of items) {
    const el = document.createElement("div");
    el.className = "result";
    el.dataset.id = it.id;
    el.dataset.title = it.title;
    el.dataset.channel = it.channel;

    el.innerHTML = `
      <img class="thumb" src="${it.thumb}" alt="">
      <div class="meta">
        <div class="title">${escapeHtml(it.title)}</div>
        <div class="channel">${escapeHtml(it.channel)}</div>
        <div class="duration">${it.duration || ""}</div>
      </div>
    `;
    el.addEventListener("click", () => playVideo(it));
    frag.appendChild(el);
  }
  dom.results.innerHTML = "";
  dom.results.appendChild(frag);
}

function playVideo(item) {
  current = item;
  dom.nowPlaying.textContent = `Reproduciendo: ${item.title} — ${item.channel}`;
  dom.btnPlayPause.textContent = "Pausar";
  dom.btnPlayPause.disabled = false;
  playing = true;

  chrome.runtime.sendMessage({
    target: "offscreen",
    action: "LOAD_AND_PLAY",
    payload: { videoId: item.id }
  });
}

function onTogglePlayPause() {
  if (!current) return;
  if (playing) {
    chrome.runtime.sendMessage({ target: "offscreen", action: "PAUSE" });
    dom.btnPlayPause.textContent = "Reproducir";
    playing = false;
  } else {
    chrome.runtime.sendMessage({ target: "offscreen", action: "PLAY" });
    dom.btnPlayPause.textContent = "Pausar";
    playing = true;
  }
}

function onVolume() {
  const v = parseInt(dom.volume.value, 10);
  chrome.runtime.sendMessage({ target: "offscreen", action: "SET_VOLUME", payload: { volume: v } });
}

function openYouTubeToLogin() {
  chrome.tabs.create({ url: "https://www.youtube.com/" });
}

function onRuntimeMessage(msg) {
  if (msg?.from !== "offscreen") return;
  if (msg.event === "CURRENT_TIME") {
    currentTime = msg.payload?.currentTime || 0;
    updateTimeDisplay();
  }
  if (msg.event === "DURATION") {
    duration = msg.payload?.duration || 0;
    updateTimeDisplay();
  }
  if (msg.event === "PLAYER_STATE") {
    // Optionally sync button text based on state
    const state = msg.payload?.state;
    // -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
    if (state === 1) {
      dom.btnPlayPause.textContent = "Pausar";
      dom.btnPlayPause.disabled = false;
      playing = true;
    } else if (state === 2 || state === 0) {
      dom.btnPlayPause.textContent = "Reproducir";
      dom.btnPlayPause.disabled = false;
      playing = false;
    }
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

// Formatea segundos a mm:ss
function formatTime(sec) {
  sec = Math.floor(sec || 0);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function updateTimeDisplay() {
  dom.timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
}