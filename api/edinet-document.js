import { fetchEdinetDocumentArchive } from "./_shared/smart-money.js";
import { sendJson } from "./_shared/market.js";

export const config = {
  regions: ["hnd1"],
};

export default async function handler(req, res) {
  try {
    const requestUrl = new URL(req.url ?? "", "http://localhost");
    const archive = await fetchEdinetDocumentArchive(
      requestUrl.searchParams.get("docId") ?? "",
      requestUrl.searchParams.get("type") ?? "1"
    );
    const disposition = requestUrl.searchParams.get("inline") === "1" ? "inline" : "attachment";
    res.statusCode = 200;
    res.setHeader("Content-Type", archive.contentType);
    res.setHeader("Content-Disposition", `${disposition}; filename="${archive.filename}"`);
    res.setHeader("Link", '</favicon.ico?v=3>; rel="icon"; type="image/x-icon"');
    res.end(archive.buffer);
  } catch (error) {
    const statusCode =
      error?.statusCode === 401 || error?.statusCode === 403
        ? 502
        : error?.statusCode || 502;
    sendJson(res, { error: "edinet document unavailable" }, statusCode);
  }
}
