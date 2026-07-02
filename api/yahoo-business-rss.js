export default async function handler(_req, res) {
  try {
    const response = await fetch("https://news.yahoo.co.jp/rss/topics/business.xml", {
      headers: {
        "User-Agent": "stock-scout-hub/1.0",
      },
    });

    if (!response.ok) {
      res.status(502).json({ error: "news rss unavailable" });
      return;
    }

    const text = await response.text();
    res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=180, stale-while-revalidate=600");
    res.status(200).send(text);
  } catch {
    res.status(500).json({ error: "news rss failed" });
  }
}
