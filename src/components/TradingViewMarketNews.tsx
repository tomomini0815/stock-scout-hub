import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Radio } from "lucide-react";

interface TvNewsItem {
  id: string;
  title: string;
  published: number;
  provider: string;
  url: string;
  isFree: boolean;
  symbols: string[];
}

interface RawTvApiItem {
  id: string;
  title: string;
  published: number;
  provider: string;
  storyPath?: string;
  isFree?: boolean;
  symbols?: string[];
}

type TvSectorId = "all" | "jp-asia" | "us-tech" | "fx-rates" | "commodities" | "crypto";

interface TvSectorDef {
  id: Exclude<TvSectorId, "all">;
  label: string;
  description: string;
}

const TV_SECTORS: TvSectorDef[] = [
  { id: "jp-asia", label: "日本株・アジア株", description: "日経先物・東証・中国/アジア市場" },
  { id: "us-tech", label: "米国株・AI・半導体", description: "米株指数・ハイテク・個別決算" },
  { id: "fx-rates", label: "為替・金利", description: "ドル円・主要通貨・中銀政策" },
  { id: "commodities", label: "金・原油・資源", description: "NY金・WTI原油・コモディティ" },
  { id: "crypto", label: "暗号資産", description: "ビットコイン・主要アルト" },
];

const CACHE_KEY = "stock-scout-tv-ja-news-v2";
const CACHE_MS = 1000 * 60 * 5;
const PAYWALL_SOURCE_PATTERN = /日経電子版|日本経済新聞|ウォール・ストリート・ジャーナル|WSJ|Bloomberg.*有料|Financial Times/i;
const NOISE_PATTERN = /マリーゴールド|イルミネーション|ゴールド免許|ゴールドカード|ロト|宝くじ|競馬|プロレス/;

const classifySector = (item: TvNewsItem): Exclude<TvSectorId, "all"> => {
  const title = item.title;
  const sym = item.symbols.join(" ");

  if (
    /ビットコイン|BTC|イーサリアム|ETH|暗号資産|仮想通貨|リップル|XRP|ソラナ|コインベース/.test(title) ||
    /BITSTAMP:|BINANCE:|CRYPTO:|BTCUSD|ETHUSD/.test(sym)
  ) {
    return "crypto";
  }
  if (
    /金先物|NY金|金価格|金相場|WTI|原油|ブレント|OPEC|プラチナ|銀先物|銅相場|鉱業|エネルギー/.test(title) ||
    /XAUUSD|CL1!|USOIL|GOLD|SILVER|COPPER/.test(sym)
  ) {
    return "commodities";
  }
  if (
    /為替|ドル・円|ドル円|ユーロ|ポンド|豪ドル|NZ|スイスフラン|政策金利|中銀|FRB|日銀|FOMC|債券|利回り|国債/.test(title) ||
    /FX:|DXY|USDJPY|EURUSD/.test(sym)
  ) {
    return "fx-rates";
  }
  if (
    /米国|米株|NYダウ|NASDAQ|ナスダック|S&P|AI|オープンＡＩ|オープンAI|半導体|エヌビディア|NVIDIA|オラクル|アップル|マイクロソフト|テスラ|ウォール街/.test(title) ||
    /NASDAQ:|NYSE:|CME_MINI:|TVC:IXIC|SP:SPX/.test(sym)
  ) {
    return "us-tech";
  }
  if (
    /日経|TOPIX|東証|東京株|日本株|SGX|本土市場|香港|中国|上海|深セン|アジア|A株|決算/.test(title) ||
    /TSE:|HKEX:|SSE:|SZSE:|KRX:|TWSE:/.test(sym)
  ) {
    return "jp-asia";
  }
  return "jp-asia";
};

const parseRssFreeNews = (xmlText: string, fallbackProvider: string, limit = 18): TvNewsItem[] => {
  const doc = new DOMParser().parseFromString(xmlText, "text/xml");
  return Array.from(doc.querySelectorAll("item"))
    .slice(0, limit)
    .map((node, index) => {
      const rawTitle = node.querySelector("title")?.textContent ?? "";
      const title = rawTitle.replace(/\s+-\s+[^-]+$/, "").replace(/\u3000/g, " ").trim();
      const source = node.querySelector("source")?.textContent?.trim() || fallbackProvider;
      const url = node.querySelector("link")?.textContent?.trim() || "";
      const pubDate = node.querySelector("pubDate")?.textContent?.trim() || "";
      const publishedMs = Date.parse(pubDate);
      const published = Number.isFinite(publishedMs) ? Math.floor(publishedMs / 1000) : 0;

      return {
        id: `free-${fallbackProvider}-${index}-${title.slice(0, 16)}`,
        title,
        published,
        provider: source,
        url,
        isFree: !PAYWALL_SOURCE_PATTERN.test(source),
        symbols: [],
      } satisfies TvNewsItem;
    })
    .filter((item) => item.title && item.url && !NOISE_PATTERN.test(item.title));
};

const formatPublished = (unixSeconds: number) => {
  if (!unixSeconds || !Number.isFinite(unixSeconds)) return "";
  const date = new Date(unixSeconds * 1000);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

const shortSymbol = (symbol: string) => (symbol.includes(":") ? symbol.split(":")[1] : symbol);

const loadCached = (): { items: TvNewsItem[]; updatedAt: string } | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { items?: TvNewsItem[]; updatedAt?: string };
    if (!Array.isArray(parsed.items) || !parsed.items.length) return null;
    return { items: parsed.items, updatedAt: parsed.updatedAt ?? "" };
  } catch {
    return null;
  }
};

const TradingViewMarketNews = () => {
  const cached = useMemo(() => loadCached(), []);
  const [items, setItems] = useState<TvNewsItem[]>(cached?.items ?? []);
  const [status, setStatus] = useState<"live" | "cached" | "loading">(cached ? "cached" : "loading");
  const [updatedAt, setUpdatedAt] = useState<string>(cached?.updatedAt ?? "");
  const [activeSector, setActiveSector] = useState<TvSectorId>("all");
  const [freeOnly, setFreeOnly] = useState(false);

  useEffect(() => {
    const isFresh = cached?.updatedAt && Date.now() - Date.parse(cached.updatedAt) < CACHE_MS;
    if (isFresh) {
      setStatus("live");
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 9000);

    const load = async () => {
      try {
        const googleFreeParams = new URLSearchParams({
          q: "(日経平均 OR 米国株 OR ドル円 OR 金価格 OR 原油 OR ビットコイン) (ロイター OR ブルームバーグ OR 株探 OR みんかぶ OR CoinPost OR Yahoo) when:3d",
          hl: "ja",
          gl: "JP",
          ceid: "JP:ja",
        });

        const [tvRes, yahooRes, googleRes] = await Promise.allSettled([
          fetch("/api/news-feeds?source=tradingview", { signal: controller.signal }).then(async (r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const payload = (await r.json()) as { items?: RawTvApiItem[]; updatedAt?: string };
            return (payload.items ?? []).map((item) => ({
              id: item.id,
              title: item.title,
              published: item.published,
              provider: item.provider,
              url: item.storyPath
                ? `https://jp.tradingview.com${item.storyPath}`
                : "https://jp.tradingview.com/news/",
              isFree: Boolean(item.isFree),
              symbols: item.symbols ?? [],
            }));
          }),
          fetch("/api/news-feeds?source=yahoo", { signal: controller.signal }).then(async (r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return parseRssFreeNews(await r.text(), "Yahoo!ニュース", 20);
          }),
          fetch(`/api/news-feeds?source=google&${googleFreeParams.toString()}`, {
            signal: controller.signal,
          }).then(async (r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return parseRssFreeNews(await r.text(), "無料経済ニュース", 20);
          }),
        ]);

        const mergedRaw = [
          ...(tvRes.status === "fulfilled" ? tvRes.value : []),
          ...(yahooRes.status === "fulfilled" ? yahooRes.value : []),
          ...(googleRes.status === "fulfilled" ? googleRes.value : []),
        ];

        const seenTitle = new Set<string>();
        const merged = mergedRaw
          .filter((item) => {
            const key = item.title.toLowerCase().replace(/\s+/g, "");
            if (!key || seenTitle.has(key)) return false;
            seenTitle.add(key);
            return true;
          })
          .sort((a, b) => b.published - a.published)
          .slice(0, 90);

        if (!merged.length) throw new Error("empty");
        const ts = new Date().toISOString();
        setItems(merged);
        setUpdatedAt(ts);
        setStatus("live");
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ items: merged, updatedAt: ts }));
        } catch {
          // ignore storage quota errors
        }
      } catch {
        if (!controller.signal.aborted) {
          setStatus((prev) => (prev === "cached" ? "cached" : "loading"));
        }
      } finally {
        window.clearTimeout(timeout);
      }
    };

    load();
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [cached]);

  const filteredItems = useMemo(
    () => (freeOnly ? items.filter((item) => item.isFree) : items),
    [items, freeOnly]
  );

  const grouped = useMemo(() => {
    const map: Record<Exclude<TvSectorId, "all">, TvNewsItem[]> = {
      "jp-asia": [],
      "us-tech": [],
      "fx-rates": [],
      commodities: [],
      crypto: [],
    };
    const sorted = [...filteredItems].sort((a, b) => b.published - a.published);
    for (const item of sorted) {
      map[classifySector(item)].push(item);
    }
    return map;
  }, [filteredItems]);

  const freeCount = useMemo(() => items.filter((item) => item.isFree).length, [items]);

  const updatedLabel = updatedAt
    ? new Intl.DateTimeFormat("ja-JP", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(updatedAt))
    : "";

  const renderNewsRow = (item: TvNewsItem) => (
    <li key={item.id} className="border-b border-border/70 py-2 last:border-b-0">
      <div className="mb-0.5 flex flex-wrap items-center gap-1.5 text-xxs text-muted-foreground">
        <span className="font-mono font-semibold tabular-nums text-foreground/80">
          {formatPublished(item.published)}
        </span>
        <span
          className={`rounded border px-1.5 py-0.2 text-[11px] font-bold leading-none ${
            item.isFree
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border-border bg-muted text-muted-foreground"
          }`}
        >
          {item.isFree ? "無料" : "有料/要登録"}
        </span>
        <span className="truncate">{item.provider}</span>
        {item.symbols.slice(0, 2).map((sym) => (
          <span
            key={sym}
            className="rounded border border-border bg-muted/60 px-1.5 py-0.2 font-mono text-[11px] font-semibold text-foreground/80"
          >
            {shortSymbol(sym)}
          </span>
        ))}
      </div>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-start gap-1 text-xs sm:text-[13px] font-semibold leading-snug text-foreground hover:text-primary hover:underline"
      >
        <span>{item.title}</span>
        <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 opacity-60 group-hover:opacity-100" />
      </a>
    </li>
  );

  return (
    <section className="mt-3 flex flex-col rounded border border-border bg-card">
      {/* ヘッダー */}
      <div className="flex flex-col gap-1.5 border-b border-border bg-table-header-bg px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <Radio className="h-4 w-4 shrink-0 text-primary" />
            <h3 className="truncate text-xs sm:text-sm font-bold text-foreground">
              TradingView 市況ニュース
            </h3>
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-xxs font-bold sm:hidden ${
              status === "live"
                ? "border border-red-600 bg-white text-red-600"
                : "bg-muted text-muted-foreground"
            }`}
            title={updatedLabel ? `更新 ${updatedLabel}` : undefined}
          >
            {status === "live" && <span className="h-1.5 w-1.5 rounded-full bg-red-600" />}
            {status === "live" ? "LIVE" : status === "cached" ? "前回値" : "確認中"}
          </span>
        </div>

        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:shrink-0">
          <a
            href="https://jp.tradingview.com/news/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xxs font-semibold text-primary hover:underline"
          >
            TradingView日本語版
            <ExternalLink className="h-3 w-3" />
          </a>
          <button
            type="button"
            aria-pressed={freeOnly}
            onClick={() => setFreeOnly((prev) => !prev)}
            className={`shrink-0 whitespace-nowrap rounded border px-2 py-0.5 text-xxs font-bold transition-colors ${
              freeOnly
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-border bg-background text-foreground/85 hover:bg-muted"
            }`}
          >
            無料記事のみ（{freeCount}）
          </button>
          <span
            className={`hidden shrink-0 items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-xxs font-bold sm:inline-flex ${
              status === "live"
                ? "border border-red-600 bg-white text-red-600"
                : "bg-muted text-muted-foreground"
            }`}
            title={updatedLabel ? `更新 ${updatedLabel}` : undefined}
          >
            {status === "live" && <span className="h-1.5 w-1.5 rounded-full bg-red-600" />}
            {status === "live" ? "LIVE" : status === "cached" ? "前回値" : "確認中"}
          </span>
        </div>
      </div>

      {/* セクター切替タブ */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/30 px-3 py-2">
        <button
          type="button"
          onClick={() => setActiveSector("all")}
          className={`rounded border px-2.5 py-1 text-xs font-bold transition-colors ${
            activeSector === "all"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-foreground/80 hover:bg-muted"
          }`}
        >
          すべて（{filteredItems.length}）
        </button>
        {TV_SECTORS.map((sector) => (
          <button
            key={sector.id}
            type="button"
            onClick={() => setActiveSector(sector.id)}
            className={`rounded border px-2.5 py-1 text-xs font-bold transition-colors ${
              activeSector === sector.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground/80 hover:bg-muted"
            }`}
          >
            {sector.label}（{grouped[sector.id].length}）
          </button>
        ))}
      </div>

      {/* コンテンツ */}
      <div className="p-3">
        {items.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            市況ニュースを取得しています...
          </div>
        ) : activeSector === "all" ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {TV_SECTORS.map((sector) => {
              const sectorItems = grouped[sector.id];
              return (
                <div
                  key={sector.id}
                  className="flex flex-col rounded border border-border bg-background p-3"
                >
                  <div className="mb-2 flex items-center justify-between border-b border-border pb-1.5">
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-foreground">
                        {sector.label}
                      </h4>
                      <div className="text-[11px] text-muted-foreground">{sector.description}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveSector(sector.id)}
                      className="shrink-0 text-xxs font-bold text-primary hover:underline"
                    >
                      全{sectorItems.length}件 →
                    </button>
                  </div>
                  {sectorItems.length > 0 ? (
                    <ul className="flex-1">{sectorItems.slice(0, 5).map(renderNewsRow)}</ul>
                  ) : (
                    <p className="py-4 text-xs text-muted-foreground">
                      直近の該当ニュースはありません。
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded border border-border bg-background p-3">
            <div className="mb-2 flex items-center justify-between border-b border-border pb-1.5">
              <h4 className="text-sm font-extrabold text-foreground">
                {TV_SECTORS.find((s) => s.id === activeSector)?.label}の最新ニュース（新しい順）
              </h4>
              <button
                type="button"
                onClick={() => setActiveSector("all")}
                className="text-xs font-bold text-primary hover:underline"
              >
                全セクター一覧に戻る
              </button>
            </div>
            {grouped[activeSector].length > 0 ? (
              <ul>{grouped[activeSector].map(renderNewsRow)}</ul>
            ) : (
              <p className="py-6 text-center text-xs text-muted-foreground">
                現在、このセクターに該当する最新ニュースはありません。
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default TradingViewMarketNews;
