// Service worker: crea y coordina el documento offscreen para reproducir audio.

const OFFSCREEN_URL = "src/offscreen.html";

// Asegura que exista el documento offscreen cuando se necesite reproducir.
async function ensureOffscreenDocument() {
  if (await hasOffscreenDocument()) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: ["AUDIO_PLAYBACK"],
    justification: "Reproducir audio de YouTube mientras el popup está cerrado."
  });
}

// Algunas versiones exponen hasDocument; si no, intentamos crear y capturamos el error.
async function hasOffscreenDocument() {
  if (chrome.offscreen && "hasDocument" in chrome.offscreen) {
    try { return await chrome.offscreen.hasDocument(); } catch { /* ignore */ }
  }
  // No hay API: probaremos messaging ping-pong
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) resolve(false);
    }, 200);
    chrome.runtime.sendMessage({ target: "offscreen", action: "PING" }, () => {
      const err = chrome.runtime.lastError;
      clearTimeout(timer);
      settled = true;
      resolve(!err);
    });
  });
}

// Mensajería: Popup -> Background -> Offscreen y viceversa.
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (!msg || !msg.target) return;

  if (msg.target === "background") {
    if (msg.action === "GET_STATE") {
      // Podrías guardar y devolver el estado aquí si lo mantienes en storage.
      sendResponse({ ok: true });
    }
    return; // no async response
  }

  if (msg.target === "offscreen") {
    await ensureOffscreenDocument();
    chrome.runtime.sendMessage({ ...msg, via: "background" });
  }
});

// Limpieza opcional cuando no se use (no estrictamente necesario)
chrome.runtime.onSuspend?.addListener(async () => {
  // Si quisieras cerrar el offscreen cuando termine todo, podrías hacerlo aquí:
  // await chrome.offscreen.closeDocument();
});