const stripHtml = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

const extractMetaContent = (html, name) => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  const reversedPattern = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${escaped}["'][^>]*>`,
    "i"
  );
  return html.match(pattern)?.[1] ?? html.match(reversedPattern)?.[1] ?? "";
};

const extractArticleText = (html) => {
  const articleMatches = html.match(/<article[\s\S]*?<\/article>/gi) ?? [];
  const paragraphMatches = html.match(/<p[\s\S]*?<\/p>/gi) ?? [];
  const source = articleMatches.join(" ") || paragraphMatches.join(" ") || "";
  const bodyText = stripHtml(source);
  const description = stripHtml(
    extractMetaContent(html, "og:description") ||
      extractMetaContent(html, "description") ||
      extractMetaContent(html, "twitter:description")
  );

  return [bodyText, description]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)[0] ?? "";
};

const summarizeJapaneseText = (text) => {
  const normalized = text
    .replace(/記事全文を読む[\s\S]*$/, " ")
    .replace(/ココがポイント[\s\S]*$/, " ")
    .replace(/関連記事|続きを読む|ログイン|会員登録|コメント/g, " ")
    .replace(/\d+\s*(?:解説|件)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const sentences = normalized
    .split(/(?<=[。！？!?])\s*/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 18 && !/^(写真|画像|Copyright|©)/i.test(sentence));

  const summary = (sentences.length ? sentences.slice(0, 3).join("") : normalized.slice(0, 220)).trim();
  return summary.length > 260 ? `${summary.slice(0, 257)}...` : summary;
};

export default async function handler(req, res) {
  try {
    const rawUrl = req.query?.url;
    const targetUrl = Array.isArray(rawUrl) ? rawUrl[0] : rawUrl;
    if (!targetUrl) {
      res.status(400).json({ error: "missing url" });
      return;
    }

    const parsed = new URL(targetUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      res.status(400).json({ error: "unsupported url" });
      return;
    }

    const response = await fetch(parsed.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; StockScoutHub/1.0; +https://stock-scout-hub.vercel.app)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      res.status(502).json({ error: "article unavailable" });
      return;
    }

    const html = await response.text();
    const articleText = extractArticleText(html);
    const summary = summarizeJapaneseText(articleText);

    if (!summary || summary.length < 20) {
      res.status(422).json({ error: "article text unavailable" });
      return;
    }

    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
    res.status(200).json({ summary });
  } catch {
    res.status(500).json({ error: "article summary failed" });
  }
}
