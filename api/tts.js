const TTS_QUEST_ENDPOINT = "https://api.tts.quest/v3/voicevox/synthesis";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithTimeout = async (url, timeoutMs = 12000, init = {}) => {
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

export const synthesizeWebVoicevoxMp3 = async (text, speaker = 1) => {
  const trimmed = String(text ?? "").trim().slice(0, 180);
  const speakerId = Number.isFinite(Number(speaker)) ? Math.max(0, Math.min(100, Math.trunc(Number(speaker)))) : 1;
  if (!trimmed) return null;

  const queryUrl = `${TTS_QUEST_ENDPOINT}?speaker=${speakerId}&text=${encodeURIComponent(trimmed)}`;
  const synthRes = await fetchWithTimeout(queryUrl, 10000);
  if (!synthRes.ok) return null;

  const payload = await synthRes.json().catch(() => null);
  if (!payload?.success) return null;

  const audioUrl = payload.mp3StreamingUrl || payload.mp3DownloadUrl;
  if (!audioUrl) return null;

  // mp3StreamingUrl は生成直後にそのままストリーミング可能。念のため未準備時は短くリトライ。
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const audioRes = await fetchWithTimeout(audioUrl, 12000);
    if (audioRes.ok) {
      const contentType = audioRes.headers.get("content-type") || "audio/mpeg";
      const arrayBuf = await audioRes.arrayBuffer();
      if (arrayBuf.byteLength > 256) {
        return {
          buffer: Buffer.from(arrayBuf),
          contentType: contentType.includes("audio") ? contentType : "audio/mpeg",
        };
      }
    }
    if (attempt < 3) {
      await sleep(350);
    }
  }

  return null;
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
    res.setHeader("Cache-Control", "public, s-maxage=3600, max-age=3600");
    res.end(result.buffer);
  } catch {
    res.statusCode = 502;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "tts synthesis failed" }));
  }
}
