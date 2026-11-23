// 主要市場の取引時間外判定（JSTベース）

const JP_HOLIDAYS = new Set([
  // 2026年 日本の祝日・年末年始（東証・大証休場日）
  "2026-01-01", "2026-01-02", "2026-01-03", "2026-01-12", "2026-02-11", "2026-02-23",
  "2026-03-20", "2026-04-29", "2026-05-03", "2026-05-04", "2026-05-05", "2026-05-06",
  "2026-07-20", "2026-08-11", "2026-09-21", "2026-09-22", "2026-09-23", "2026-10-12",
  "2026-11-03", "2026-11-23", "2026-12-31",
  // 2027年 日本の祝日・年末年始
  "2027-01-01", "2027-01-02", "2027-01-03", "2027-01-11", "2027-02-11", "2027-02-23",
  "2027-03-21", "2027-03-22", "2027-04-29", "2027-05-03", "2027-05-04", "2027-05-05",
  "2027-07-19", "2027-08-11", "2027-09-20", "2027-09-23", "2027-10-11", "2027-11-03",
  "2027-11-23", "2027-12-31",
]);

const getJstParts = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = Number(get("hour")) % 24;
  const minute = Number(get("minute"));
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const weekday = weekdayMap[get("weekday")] ?? 0;

  return {
    dateKey: `${year}-${month}-${day}`,
    weekday,
    minutesOfDay: hour * 60 + minute,
    monthNum: Number(month),
  };
};

/**
 * 指定された指数が現在「取引時間外（休場含む）」かどうかを返す
 */
export const isIndexMarketAfterHours = (indexName: string, now = new Date()): boolean => {
  // 暗号資産（BTC）は24時間365日取引
  if (/BTC|ビットコイン/i.test(indexName)) return false;

  const { dateKey, weekday, minutesOfDay, monthNum } = getJstParts(now);

  // TOPIX先物（大阪取引所 OSE:TOPIX1!）
  // 日中: 8:45-15:45 / 夜間: 17:00-翌6:00（土日・日本の祝日は休場）
  if (/TOPIX/i.test(indexName)) {
    // 日曜日は終日休場
    if (weekday === 0) return true;
    // 土曜日は6:00以降休場（金曜夜間立会は6:00まで）
    if (weekday === 6) return minutesOfDay >= 6 * 60;
    // 日本の祝日は休場
    if (JP_HOLIDAYS.has(dateKey)) return true;
    const inDaySession = minutesOfDay >= 8 * 60 + 45 && minutesOfDay < 15 * 60 + 45;
    const inNightSession = minutesOfDay >= 17 * 60 || minutesOfDay < 6 * 60;
    return !(inDaySession || inNightSession);
  }

  // 為替（FX:USDJPY）: 月曜7:00頃〜土曜6:55頃（夏時間は6:00）
  const isUsDst = monthNum >= 4 && monthNum <= 10;
  const fxCutoff = isUsDst ? 6 * 60 : 7 * 60;

  if (/USD|JPY|ドル/i.test(indexName)) {
    if (weekday === 0) return true;
    if (weekday === 6 && minutesOfDay >= fxCutoff) return true;
    if (weekday === 1 && minutesOfDay < fxCutoff) return true;
    return false;
  }

  // CME/CBOT先物（日経225先物・NYダウ先物・NASDAQ100先物・S&P500先物・GOLD）
  // 月曜7:00〜土曜7:00（夏時間は6:00）＋ 毎日1時間のメンテナンス休止
  if (/日経|ダウ|NASDAQ|S&P|GOLD|金/i.test(indexName)) {
    if (weekday === 0) return true;
    if (weekday === 6 && minutesOfDay >= fxCutoff) return true;
    if (weekday === 1 && minutesOfDay < fxCutoff) return true;
    // 毎日のメンテナンス時間（冬時間 7:00-8:00 JST / 夏時間 6:00-7:00 JST）
    const inMaintenance = minutesOfDay >= fxCutoff && minutesOfDay < fxCutoff + 60;
    return inMaintenance;
  }

  return false;
};
