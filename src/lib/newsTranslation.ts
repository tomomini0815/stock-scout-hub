import { type NewsItem } from "@/data/stockData";

export const stripEnglishSourceSuffix = (title: string) =>
  title
    .replace(/\s*\|\s*.+$/, "")
    .replace(/\s+-\s+(?:The Asahi Shimbun|Reuters|Bloomberg|AP News|Yahoo News|Nikkei Asia|Financial Times).+$/i, "")
    .replace(/\s+/g, " ")
    .trim();

export const isMostlyEnglish = (text = "") => {
  const letters = text.match(/[A-Za-z]/g)?.length ?? 0;
  const japanese = text.match(/[\u3040-\u30ff\u3400-\u9fff]/g)?.length ?? 0;
  return letters >= 12 && letters > japanese * 2;
};

export const translateEnglishNewsTitle = (rawTitle: string) => {
  const title = stripEnglishSourceSuffix(rawTitle);
  if (!isMostlyEnglish(title)) return title;

  const patterns: Array<[RegExp, string]> = [
    [/Asian shares mostly higher tracking Wall Street gains and oil stabilizes/i, "アジア株はおおむね上昇、米株高と原油価格の安定を追い風"],
    [/Halved in value.*yen lost its power/i, "円の価値低下が鮮明に、購買力と為替の弱さが焦点"],
    [/US tariff refunds.*Japan Inc.*profits.*(?:\$|up to).*3bn/i, "米関税払い戻し、日本企業の利益を最大30億ドル押し上げる可能性"],
    [/Japan,\s*united kingdom and Italy.*fighter jet contract.*2027/i, "日英伊の次世代戦闘機契約、2027年まで延長へ"],
    [/Wall Street gains.*oil stabilizes/i, "米株高と原油安定を受け、海外株式市場は底堅い動き"],
    [/tariff refunds/i, "米関税払い戻しを巡るニュース、日本企業の利益影響に注目"],
    [/fighter jet contract/i, "次世代戦闘機の大型契約を巡るニュース、防衛関連への波及に注目"],
    [/yen.*(?:downward spiral|lost its power|halved)/i, "円の下落と購買力低下を巡るニュース、為替影響に注目"],
  ];

  const matched = patterns.find(([pattern]) => pattern.test(title));
  if (matched) return matched[1];

  if (/Asian shares|shares|stocks|Wall Street|market/i.test(title)) {
    return "海外株式市場に関するニュース、米株・為替・商品市況の日本株への波及を確認";
  }
  if (/yen|dollar|currency|Bank of Japan|interest rate/i.test(title)) {
    return "為替・金利に関する海外ニュース、円相場と金融株への影響を確認";
  }
  if (/tariff|trade|export|import|refund/i.test(title)) {
    return "通商政策に関する海外ニュース、日本企業の業績影響を確認";
  }
  if (/semiconductor|chip|AI|Nvidia/i.test(title)) {
    return "半導体・AI関連の海外ニュース、国内関連株への波及を確認";
  }
  return "海外発の市場ニュース、日本株・為替・金利への波及を確認";
};

export const normalizeArticleSummaryToJapanese = (
  summary: string,
  item: NewsItem,
  buildFallbackSummary: (title: string, category: string, source: string) => string
) => {
  const cleaned = summary.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (!isMostlyEnglish(cleaned)) return cleaned;
  if (/skip to content|browser does not support javascript|site policy|bookmark|copy link/i.test(cleaned)) {
    return buildFallbackSummary(item.title, item.category, item.source ?? "");
  }

  return buildFallbackSummary(item.title, item.category, item.source ?? "");
};
