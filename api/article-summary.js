const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const GENERIC_META_PATTERN =
  /Yahoo!ニュースは|最新のニュースをお届け|速報ニュース|公式ページ|ニュースサイト|経済ニュースを配信|記事一覧|Google ニュースが世界中のニュース提供元|Google ニュース|Google News/;

const stripHtml = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
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

const extractJsonLdBody = (html) => {
  const scripts = html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  for (const script of scripts) {
    const bodyMatch = script.match(/"articleBody"\s*:\s*"((?:[^"\\]|\\.)+)"/);
    if (bodyMatch?.[1] && bodyMatch[1].length >= 40) {
      try {
        return JSON.parse(`"${bodyMatch[1]}"`);
      } catch {
        return bodyMatch[1].replace(/\\n/g, " ").replace(/\\"/g, '"');
      }
    }
  }
  return "";
};

const detectCharset = (contentType = "", bytes) => {
  const headerCharset = contentType.match(/charset=([^;\s]+)/i)?.[1];
  if (headerCharset) return headerCharset;

  const head = new TextDecoder("latin1").decode(bytes.slice(0, 4096));
  return (
    head.match(/<meta[^>]+charset=["']?\s*([^"'\s/>]+)/i)?.[1] ??
    head.match(/<meta[^>]+content=["'][^"']*charset=([^"'\s;]+)/i)?.[1] ??
    "utf-8"
  );
};

const looksMojibake = (value = "") => {
  if (!value) return true;
  const replacementCount = (value.match(/\uFFFD/g) ?? []).length;
  const mojibakeRunCount = (value.match(/[ÂÃã]{2,}|(?:ã.|æ.|ç.|å.){2,}/g) ?? []).length;
  return replacementCount >= 2 || mojibakeRunCount >= 2;
};

const decodeHtmlResponse = async (response) => {
  const bytes = new Uint8Array(await response.arrayBuffer());
  const charset = detectCharset(response.headers.get("content-type") ?? "", bytes).toLowerCase();
  const candidates = [
    charset,
    charset.includes("shift") || charset.includes("sjis") ? "shift_jis" : "",
    charset.includes("euc") ? "euc-jp" : "",
    "utf-8",
    "shift_jis",
    "euc-jp",
  ].filter(Boolean);

  for (const candidate of [...new Set(candidates)]) {
    try {
      const decoded = new TextDecoder(candidate, { fatal: false }).decode(bytes);
      if (!looksMojibake(decoded)) return decoded;
    } catch {
      // Try next charset
    }
  }

  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
};

const extractParagraphs = (html) => {
  const cleanedHtml = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ");

  const articleBlocks = cleanedHtml.match(/<article[\s\S]*?<\/article>/gi) ?? [];
  const targetHtml = articleBlocks.length ? articleBlocks.join(" ") : cleanedHtml;

  const paragraphs = [...targetHtml.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => stripHtml(m[1]))
    .filter(
      (text) =>
        text.length >= 26 &&
        !/^(写真|画像|Copyright|©|関連記事|続きを読む|ログイン|会員登録|コメント|シェア|Yahoo!ニュース)/i.test(
          text
        ) &&
        !GENERIC_META_PATTERN.test(text)
    );

  return paragraphs.slice(0, 6).join(" ");
};

const extractArticleText = (html) => {
  const jsonLdBody = stripHtml(extractJsonLdBody(html));
  const paragraphText = extractParagraphs(html);
  const rawDescription = stripHtml(
    extractMetaContent(html, "og:description") ||
      extractMetaContent(html, "description") ||
      extractMetaContent(html, "twitter:description")
  );
  const description = GENERIC_META_PATTERN.test(rawDescription) ? "" : rawDescription;

  // 本文（JSON-LD / 段落）を優先し、十分な長さがない場合のみ記事個別のmeta descriptionを使用
  if (jsonLdBody.length >= 60) return jsonLdBody;
  if (paragraphText.length >= 60) return paragraphText;
  return [paragraphText, jsonLdBody, description]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)[0] ?? "";
};

const trimSummaryAtSentence = (text, maxLength) => {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned;

  const clipped = cleaned.slice(0, maxLength);
  const sentenceEnd = Math.max(
    clipped.lastIndexOf("。"),
    clipped.lastIndexOf("！"),
    clipped.lastIndexOf("？"),
    clipped.lastIndexOf("!"),
    clipped.lastIndexOf("?")
  );

  if (sentenceEnd >= 90) {
    return clipped.slice(0, sentenceEnd + 1).trim();
  }

  return `${clipped.replace(/[、,。\s]+$/, "")}…`;
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
    .filter((sentence) => sentence.length >= 16 && !/^(写真|画像|Copyright|©)/i.test(sentence));

  const summary = (sentences.length ? sentences.slice(0, 3).join("") : normalized).trim();
  return trimSummaryAtSentence(summary, 320);
};

const fetchArticleHtml = async (url) => {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
    },
  });
  if (!response.ok) return null;
  return decodeHtmlResponse(response);
};

const resolveGoogleNewsUrl = async (html) => {
  const sg = html.match(/data-n-a-sg="([^"]+)"/)?.[1];
  const ts = html.match(/data-n-a-ts="([^"]+)"/)?.[1];
  const id = html.match(/data-n-a-id="([^"]+)"/)?.[1];
  if (!sg || !ts || !id) return "";

  const payload = [
    "garturlreq",
    [
      ["X", "X", ["X", "X"], null, null, 1, 1, "JP:ja", null, 1, null, null, null, null, null, 0, 1],
      "X",
      "X",
      1,
      [1, 1, 1],
      1,
      1,
      null,
      0,
      0,
      null,
      0,
    ],
    id,
    Number(ts),
    sg,
  ];
  const body = new URLSearchParams({
    "f.req": JSON.stringify([[["Fbv4je", JSON.stringify(payload), null, "generic"]]]),
  });

  const response = await fetch("https://news.google.com/_/DotsSplashUi/data/batchexecute", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      "User-Agent": BROWSER_UA,
    },
    body: body.toString(),
  });
  if (!response.ok) return "";

  const text = await response.text();
  for (const line of text.split("\n")) {
    if (!line.includes("garturlres")) continue;
    try {
      const outer = JSON.parse(line);
      const innerStr = outer?.[0]?.[2];
      if (typeof innerStr === "string") {
        const inner = JSON.parse(innerStr);
        if (typeof inner?.[1] === "string" && /^https?:\/\//.test(inner[1])) {
          return inner[1];
        }
      }
    } catch {
      // ignore malformed line
    }
  }
  return "";
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

    let html = await fetchArticleHtml(parsed.toString());
    if (!html) {
      res.status(502).json({ error: "article unavailable" });
      return;
    }

    // Google News RSS リダイレクトURLを元記事URLへ解決して本文を取得
    if (parsed.hostname === "news.google.com" && parsed.pathname.includes("/articles/")) {
      const resolvedUrl = await resolveGoogleNewsUrl(html);
      if (resolvedUrl) {
        const resolvedHtml = await fetchArticleHtml(resolvedUrl);
        if (resolvedHtml) {
          html = resolvedHtml;
        }
      }
    }

    // Yahoo!ニュースのトピックス(/pickup/)ページなら、実際の記事本文ページ(/articles/)を辿る
    if (parsed.hostname === "news.yahoo.co.jp" && parsed.pathname.startsWith("/pickup/")) {
      const articleLinkMatch = html.match(/https:\/\/news\.yahoo\.co\.jp\/articles\/[0-9a-f]+/);
      if (articleLinkMatch?.[0]) {
        const fullArticleHtml = await fetchArticleHtml(articleLinkMatch[0]);
        if (fullArticleHtml) {
          html = fullArticleHtml;
        }
      }
    }

    const articleText = extractArticleText(html);
    const summary = summarizeJapaneseText(articleText);

    if (!summary || summary.length < 24 || looksMojibake(summary)) {
      res.status(422).json({ error: "article text unavailable" });
      return;
    }

    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
    res.status(200).json({ summary });
  } catch {
    res.status(500).json({ error: "article summary failed" });
  }
}
