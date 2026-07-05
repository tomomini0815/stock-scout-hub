import { fetchSmartMoneyData } from "./_shared/smart-money.js";
import { sendJson } from "./_shared/market.js";

export const config = {
  regions: ["hnd1"],
};

export default async function handler(req, res) {
  try {
    const force = req.url?.includes("force=1") ?? false;
    const payload = await fetchSmartMoneyData({ force });
    sendJson(res, payload);
  } catch {
    sendJson(res, { funds: [], signals: [], error: "smart money unavailable", source: "error" }, 502);
  }
}
