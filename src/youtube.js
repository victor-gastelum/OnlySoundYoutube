import { YOUTUBE_API_KEY } from "./config.js";
import { formatISODurationToHMS } from "./util.js";

const API_BASE = "https://www.googleapis.com/youtube/v3";

export function hasApiKey() {
  return !!YOUTUBE_API_KEY && YOUTUBE_API_KEY !== "YOUR_YOUTUBE_DATA_API_KEY";
}

export async function searchYouTube(q, maxResults = 20) {
  if (!hasApiKey()) throw new Error("NO_API_KEY");

  const params = new URLSearchParams({
    part: "snippet",
    q,
    maxResults: String(maxResults),
    type: "video",
    key: YOUTUBE_API_KEY
  });

  const res = await fetch(`${API_BASE}/search?${params.toString()}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YouTube search error: ${res.status} ${text}`);
  }
  const data = await res.json();

  const items = data.items || [];
  const ids = items.map(i => i.id.videoId).filter(Boolean);
  const durations = await fetchDurations(ids);

  return items.map(i => {
    const id = i.id.videoId;
    const sn = i.snippet;
    return {
      id,
      title: sn.title,
      channel: sn.channelTitle,
      thumb: sn.thumbnails?.medium?.url || sn.thumbnails?.default?.url,
      duration: durations[id] || ""
    };
  });
}

async function fetchDurations(ids) {
  if (!ids.length) return {};
  const params = new URLSearchParams({
    part: "contentDetails",
    id: ids.join(","),
    key: YOUTUBE_API_KEY
  });
  const res = await fetch(`${API_BASE}/videos?${params.toString()}`);
  if (!res.ok) return {};
  const data = await res.json();
  const map = {};
  for (const it of data.items || []) {
    const id = it.id;
    const iso = it.contentDetails?.duration;
    map[id] = iso ? formatISODurationToHMS(iso) : "";
  }
  return map;
}