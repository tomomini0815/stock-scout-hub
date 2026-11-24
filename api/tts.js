const TTS_QUEST_V3_ENDPOINT = "https://api.tts.quest/v3/voicevox/synthesis";
const TTS_QUEST_V2_AUDIO_ENDPOINT = "https://deprecatedapis.tts.quest/v2/voicevox/audio/";

// 同一文言の再合成を防いで高速化＆APIポイント消費を抑えるメモリキャッシュ
const AUDIO_CACHE = new Map();
const MAX_CACHE_ENTRIES = 60;
const CACHE_TTL_MS = 60 * 60 * 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getVoicevoxApiKey = () =>
  (process.env.VOICEVOX_API_KEY || process.env.TTS_QUEST_API_KEY || "").trim();

const fetchWithTimeout = async (url, timeoutMs = 18000, init = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        ...(init.headers || {}),
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

const readCache = (cacheKey) => {
  const entry = AUDIO_CACHE.get(cacheKey);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    AUDIO_CACHE.delete(cacheKey);
    return null;
  }
  return entry.value;
};

const writeCache = (cacheKey, value) => {
  if (AUDIO_CACHE.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = AUDIO_CACHE.keys().next().value;
    if (oldestKey) AUDIO_CACHE.delete(oldestKey);
  }
  AUDIO_CACHE.set(cacheKey, { createdAt: Date.now(), value });
};

const fetchV3Mp3 = async (text, speakerId, apiKey) => {
  const params = new URLSearchParams({
    speaker: String(speakerId),
    text,
  });
  if (apiKey) params.set("key", apiKey);

  for (let retry = 0; retry < 2; retry += 1) {
    const synthRes = await fetchWithTimeout(`${TTS_QUEST_V3_ENDPOINT}?${params.toString()}`, 12000);
    const payload = await synthRes.json().catch(() => null);

    if (synthRes.status === 429 || payload?.retryAfter) {
      const waitSec = Math.min(3, Math.max(1, Number(payload?.retryAfter ?? 1)));
      if (retry === 0) {
        await sleep(waitSec * 1000);
        continue;
      }
      return null;
    }

    if (!synthRes.ok || !payload?.success) return null;

    const audioUrl = payload.mp3StreamingUrl || payload.mp3DownloadUrl;
    if (!audioUrl) return null;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const audioRes = await fetchWithTimeout(audioUrl, 16000);
      if (audioRes.ok) {
        const contentType = audioRes.headers.get("content-type") || "audio/mpeg";
        const arrayBuf = await audioRes.arrayBuffer();
        if (arrayBuf.byteLength > 256) {
          return {
            buffer: Buffer.from(arrayBuf),
            contentType: contentType.includes("audio") ? contentType : "audio/mpeg",
            keyMode: payload.isApiKeyValid ? "configured" : apiKey ? "invalid-key" : "free",
          };
        }
      }
      if (attempt < 3) await sleep(350);
    }
  }
  return null;
};

const fetchV2DirectAudio = async (text, speakerId, apiKey) => {
  if (!apiKey) return null;
  const params = new URLSearchParams({
    key: apiKey,
    speaker: String(speakerId),
    text,
  });
  const res = await fetchWithTimeout(`${TTS_QUEST_V2_AUDIO_ENDPOINT}?${params.toString()}`, 15000);
  if (!res.ok) return null;
  const contentType = res.headers.get("content-type") || "audio/wav";
  if (!contentType.includes("audio")) return null;
  const arrayBuf = await res.arrayBuffer();
  if (arrayBuf.byteLength <= 256) return null;
  return {
    buffer: Buffer.from(arrayBuf),
    contentType,
    keyMode: "configured-v2",
  };
};

export const synthesizeWebVoicevoxMp3 = async (text, speaker = 1) => {
  const trimmed = String(text ?? "").trim().slice(0, 220);
  const speakerId = Number.isFinite(Number(speaker))
    ? Math.max(0, Math.min(100, Math.trunc(Number(speaker))))
    : 1;
  if (!trimmed) return null;

  const apiKey = getVoicevoxApiKey();
  const cacheKey = `${speakerId}:${trimmed}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  // v3 MP3（軽量・スマホ向き）を優先し、APIキーありで失敗時は v2 直接WAVへフォールバック
  const result =
    (await fetchV3Mp3(trimmed, speakerId, apiKey)) ||
    (await fetchV2DirectAudio(trimmed, speakerId, apiKey));

  if (result) {
    writeCache(cacheKey, result);
  }
  return result;
};

export default async function handler(req, res) {
  try {
    const requestUrl = new URL(req.url ?? "", `https://${req.headers.host ?? "localhost"}`);
    const text = requestUrl.searchParams.get("text")?.trim() ?? "";
    const speaker = Number(requestUrl.searchParams.get("speaker") ?? "1");

    if (!text) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "text is required" }));
      return;
    }

    const result = await synthesizeWebVoicevoxMp3(text, speaker);
    if (!result) {
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "tts synthesis unavailable" }));
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", result.contentType);
    res.setHeader("X-TTS-Key-Mode", result.keyMode || "free");
    res.setHeader("Cache-Control", "public, s-maxage=3600, max-age=3600");
    res.end(result.buffer);
  } catch {
    res.statusCode = 502;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "tts synthesis failed" }));
  }
}
