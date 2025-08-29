// Controla el reproductor embebido de YouTube con postMessage.
// No carga scripts remotos (cumple CSP MV3). Usa enablejsapi=1 en el iframe.

const iframe = document.getElementById("yt");
const state = {
  ready: false,
  currentVideoId: null,
  volume: 80
};

init();

function init() {
  // Inicializa el iframe sin video; enablejsapi permite controlar por postMessage.
  const origin = new URL(chrome.runtime.getURL("/")).origin;
  const base = "https://www.youtube.com/embed/";
  const params = new URLSearchParams({
    enablejsapi: "1",
    playsinline: "1",
    rel: "0",
    iv_load_policy: "3",
    modestbranding: "1",
    origin
  });

  iframe.src = `${base}?${params.toString()}`;
  window.addEventListener("message", onYouTubeMessage);
  chrome.runtime.onMessage.addListener(onRuntimeMessage);
}

function onRuntimeMessage(msg, sender, sendResponse) {
  if (!msg) return;
  if (msg.action === "PING") {
    sendResponse?.({ pong: true });
    return true;
  }
  if (msg.target !== "offscreen") return;

  switch (msg.action) {
    case "LOAD_AND_PLAY":
      loadAndPlay(msg.payload?.videoId);
      break;
    case "PLAY":
      sendCommand("playVideo");
      break;
    case "PAUSE":
      sendCommand("pauseVideo");
      break;
    case "SET_VOLUME":
      if (typeof msg.payload?.volume === "number") {
        state.volume = msg.payload.volume;
        sendCommand("setVolume", [state.volume]);
      }
      break;
    case "GET_TIME":
      // LOG: solicitud recibida
      console.log("GET_TIME recibido");
      requestCurrentTime();
      break;
    default:
      break;
  }
}

function loadAndPlay(videoId) {
  if (!videoId) return;
  state.currentVideoId = videoId;
  if (!state.ready) {
    // Cuando esté listo, cuéalo y reproduzca.
    waitUntilReady().then(() => {
      cueAndPlay(videoId);
    });
  } else {
    cueAndPlay(videoId);
  }
}

function cueAndPlay(videoId) {
  // Carga y reproduce desde el segundo 0. Ajusta volumen.
  sendCommand("loadVideoById", [{ videoId, startSeconds: 0 }]);
  if (typeof state.volume === "number") {
    sendCommand("setVolume", [state.volume]);
  }
  // YouTube a veces requiere play explícito tras onReady/onStateChange buffer
  setTimeout(() => sendCommand("playVideo"), 200);
}

function requestCurrentTime() {
  // LOG: enviando comandos a YouTube
  console.log("Enviando getCurrentTime y getDuration al iframe");
  sendCommand("getCurrentTime");
  sendCommand("getDuration");
}

function onYouTubeMessage(event) {
  // Solo aceptar mensajes de YouTube
  const originOk = /^(https:\/\/www\.youtube\.com|https:\/\/www\.youtube-nocookie\.com)$/.test(event.origin);
  if (!originOk) return;
  let data = event.data;
  if (typeof data === "string") {
    try { data = JSON.parse(data); } catch { return; }
  }

  // LOG: muestra todos los mensajes recibidos
  console.log("Mensaje recibido de YouTube:", data);


  if (data?.event === "onReady") {
    state.ready = true;
    // Aplica volumen inicial
    sendCommand("setVolume", [state.volume]);
  } else if (data?.event === "onStateChange") {
    // Reenvía estado al popup para sincronizar UI
    chrome.runtime.sendMessage({
      from: "offscreen",
      event: "PLAYER_STATE",
      payload: { state: data.info }
    });
  }
  // Nuevo: captura respuestas de getCurrentTime y getDuration
   if (data?.event === "onReady") {
    state.ready = true;
    sendCommand("setVolume", [state.volume]);
  } else if (data?.event === "onStateChange") {
    chrome.runtime.sendMessage({
      from: "offscreen",
      event: "PLAYER_STATE",
      payload: { state: data.info }
    });
  }
  if (data?.info !== undefined && data?.func) {
    if (data.func === "getCurrentTime") {
      console.log("getCurrentTime:", data.info);
      chrome.runtime.sendMessage({
        from: "offscreen",
        event: "CURRENT_TIME",
        payload: { currentTime: data.info }
      });
    }
    if (data.func === "getDuration") {
      console.log("getDuration:", data.info);
      chrome.runtime.sendMessage({
        from: "offscreen",
        event: "DURATION",
        payload: { duration: data.info }
      });
    }
  }
}

function sendCommand(func, args = []) {
  if (!iframe.contentWindow) return;
  const message = JSON.stringify({
    event: "command",
    func,
    args
  });
  iframe.contentWindow.postMessage(message, "*");
}

function waitUntilReady() {
  if (state.ready) return Promise.resolve();
  return new Promise((resolve) => {
    let i = 0;
    const t = setInterval(() => {
      if (state.ready || i++ > 100) { // ~10s timeout
        clearInterval(t); resolve();
      }
    }, 100);
  });
}