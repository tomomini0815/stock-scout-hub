const getJstDateKey = () =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replaceAll("-", "");

export default async function handler(req, res) {
  try {
    const requestUrl = new URL(req.url ?? "", "http://localhost");
    const requestedDate = requestUrl.searchParams.get("date") ?? getJstDateKey();
    const date = /^\d{8}$/.test(requestedDate) ? requestedDate : getJstDateKey();
    const response = await fetch(`https://www.release.tdnet.info/inbs/I_list_001_${date}.html`, {
      headers: {
        "User-Agent": "stock-scout-hub/1.0",
      },
    });

    if (!response.ok) {
      res.status(502).json({ items: [], error: `tdnet unavailable: ${response.status}` });
      return;
    }

    const text = await response.text();
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=180, stale-while-revalidate=600");
    res.status(200).send(text);
  } catch {
    res.status(500).json({ items: [], error: "tdnet failed" });
  }
}
