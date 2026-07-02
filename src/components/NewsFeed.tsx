import { useEffect, useState } from "react";
import { type NewsItem } from "@/data/stockData";
import { ExternalLink, Flame, Newspaper, Radio, Sparkles, TrendingUp } from "lucide-react";

interface NewsFeedProps {
  news?: NewsItem[];
}

interface GdeltArticle {
  url?: string;
  title?: string;
  seendate?: string;
  domain?: string;
}

type FeedStatus = "loading" | "live" | "fallback";

type FeedColumn = {
  id: "market" | "yahoo" | "gdelt";
  title: string;
  sourceLabel: string;
  status: FeedStatus;
  items: NewsItem[];
};

type ArticleSummaryState = {
  status: "loading" | "ready" | "error";
  summary?: string;
};

const TOP_NEWS_CACHE_KEY = "stock-scout-top-news-columns-v3";
const TOP_NEWS_CACHE_MS = 1000 * 60 * 45;
const COLUMN_LIMIT = 6;

const inferCategory = (title: string) =>
  /半導体|AI|NVIDIA|エヌビディア|キオクシア|アドバンテスト|東京エレクトロン/.test(title)
    ? "半導体"
    : /円|為替|金利|日銀|銀行|金融|ドル/.test(title)
      ? "金融"
      : /決算|業績|上方修正|下方修正|買収|提携|IPO|新規上場/.test(title)
        ? "企業"
        : "市況";

const normalizeNewsKey = (value = "") =>
  value
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, "")
    .replace(/[?#].*$/, "")
    .replace(/\s+/g, "");

const formatDateTime = (value: string | number | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return { date: undefined, time: "" };

  return {
    date: new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date),
    time: new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date),
  };
};

const formatGdeltDateTime = (seenDate = "") =>
  formatDateTime(
    seenDate.replace(
      /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
      "$1-$2-$3T$4:$5:$6Z"
    )
  );

const mapRssNews = (xmlText: string, provider: string, fallbackSource: string, idOffset = 0) => {
  const doc = new DOMParser().parseFromString(xmlText, "text/xml");
  return Array.from(doc.querySelectorAll("item")).map((item, index) => {
    const rawTitle = item.querySelector("title")?.textContent ?? "";
    const source = item.querySelector("source")?.textContent ?? fallbackSource;
    const url = item.querySelector("link")?.textContent ?? "";
    const pubDate = item.querySelector("pubDate")?.textContent ?? "";
    const title = rawTitle.replace(/\s+-\s+[^-]+$/, "").trim();
    const formatted = formatDateTime(pubDate);

    return {
      id: idOffset + index + 1,
      date: formatted.date,
      time: formatted.time,
      title,
      category: inferCategory(title),
      source,
      provider,
      url,
      summary: buildNewsSummary(title, inferCategory(title), source),
      isHot: index < 2,
      isNew: index < 1,
    } satisfies NewsItem;
  });
};

const mapGdeltNews = (articles: GdeltArticle[]) =>
  articles.map((article, index) => {
    const title = article.title?.replace(/\s+/g, " ").trim() ?? "";
    const formatted = formatGdeltDateTime(article.seendate);
    const source = article.domain?.replace(/^www\./, "") ?? "GDELT";

    return {
      id: 200 + index + 1,
      date: formatted.date,
      time: formatted.time,
      title,
      category: inferCategory(title),
      source,
      provider: "GDELT",
      url: article.url ?? "",
      summary: buildNewsSummary(title, inferCategory(title), source),
      isHot: index < 2,
      isNew: index < 1,
    } satisfies NewsItem;
  });

const joinSignals = (signals: string[]) => {
  const uniqueSignals = Array.from(new Set(signals));
  if (!uniqueSignals.length) return "市場への影響";
  if (uniqueSignals.length === 1) return uniqueSignals[0];
  return `${uniqueSignals.slice(0, -1).join("、")}、${uniqueSignals[uniqueSignals.length - 1]}`;
};

const inferNewsSignals = (title: string) => {
  const signals: string[] = [];
  if (/介入|円買い|円安阻止/.test(title)) signals.push("為替介入への警戒");
  if (/円安|ドル高|円相場.*(?:下落|反落|続落)|外為.*(?:下落|反落|続落)|1ドル\d+円|円台/.test(title)) signals.push("円安進行");
  if (/円高|円相場.*上昇|外為.*上昇/.test(title)) signals.push("円高方向の動き");
  if (/金利|利上げ|利下げ|日銀|FOMC|債券/.test(title)) signals.push("金利・金融政策");
  if (/日経平均|TOPIX|東証|株価|午前終値|大引け|先物/.test(title)) signals.push("指数の方向感");
  if (/半導体|AI|人工知能|NVIDIA|エヌビディア|メモリ/.test(title)) signals.push("半導体・AIテーマ");
  if (/決算|業績|上方修正|下方修正|増益|減益|赤字|黒字/.test(title)) signals.push("業績材料");
  if (/自社株|配当|増配|減配|株主還元/.test(title)) signals.push("株主還元");
  if (/買収|TOB|提携|合併|再編/.test(title)) signals.push("再編・提携材料");
  if (/IPO|新規上場|初値|公開価格|上場承認/.test(title)) signals.push("IPO材料");
  if (/原油|資源|金|銅|商品/.test(title)) signals.push("資源・商品市況");
  if (/中国|米国|欧州|海外|NY|ナスダック|ダウ/.test(title)) signals.push("海外市場との連動");
  if (/情報流出|漏えい|不正アクセス|サイバー/.test(title)) signals.push("信用・セキュリティリスク");
  if (/値上げ|物価|インフレ|価格転嫁/.test(title)) signals.push("物価・価格転嫁");
  if (/賃金|ボーナス|給与|人件費/.test(title)) signals.push("賃金・人件費");
  return signals;
};

const buildTitleSpecificPoint = (title: string, category: string) => {
  if (/介入/.test(title) && /円|ドル/.test(title)) {
    return "為替水準そのものより、政府・日銀によるけん制発言や実弾介入への警戒が市場心理を動かす局面です。輸出株には円安メリットが意識されやすい一方、急な円高反転が起きると先物主導で指数が振れやすくなります。";
  }
  if (/外為|円相場/.test(title) && /下落|反落|続落|円台/.test(title)) {
    return "円相場の弱さが意識されるニュースです。輸出株には追い風になりやすい一方、食品、外食、電力、紙パルプなど輸入コストの高い業種には逆風になりやすい点を見ます。日米金利差や介入警戒が同時に語られている場合は、相場が急反転するリスクもあります。";
  }
  if (/情報流出|漏えい|不正アクセス|サイバー/.test(title)) {
    return "顧客情報やシステム管理に関する信用リスクのニュースです。対象企業では一時的な売り材料になりやすく、金融、保険、通信、ITサービスなど個人情報を扱う業種では同様の管理コストや規制対応が意識される可能性があります。";
  }
  if (/値上げ|物価|インフレ|価格転嫁/.test(title)) {
    return "値上げや物価に関するニュースです。価格転嫁ができる企業には利益率改善の余地がありますが、消費者の節約志向が強まると小売、外食、食品、日用品の販売数量には重荷になることがあります。CPIや消費関連株の反応を合わせて確認します。";
  }
  if (/賃金|ボーナス|給与|人件費/.test(title)) {
    return "賃金や人件費に関するニュースです。所得増は消費関連株に追い風となる一方、企業側には人件費上昇による利益圧迫要因にもなります。小売、外食、サービス、人材関連の反応を見ると、好材料とコスト増のどちらが意識されているか分かります。";
  }
  if (/半導体/.test(title) && /売り|安|下落/.test(title)) {
    return "半導体株への売りが指数を押し下げている可能性があります。日経平均は値がさ半導体銘柄の影響を受けやすいため、TOPIXとの温度差や、装置・素材・電子部品まで売りが広がっているかを見ると地合いを判断しやすくなります。";
  }
  if (/半導体|AI|NVIDIA|エヌビディア/.test(title)) {
    return "AI・半導体テーマへの資金流入や利益確定の動きが焦点です。海外半導体株、SOX指数、為替、国内の値がさ株の寄与度を合わせて確認すると、テーマ買いが継続しているか見えやすくなります。";
  }
  if (/金利|日銀|利上げ|利下げ/.test(title)) {
    return "金利見通しが変わると、銀行・保険などの金融株と、PERの高いグロース株で反応が分かれやすくなります。長期金利、為替、先物の反応を合わせて見ると、単発ニュースか相場テーマ化しているか判断できます。";
  }
  if (/日経平均|TOPIX|東証|株価|先物/.test(title)) {
    return "指数の動きに関するニュースです。日経平均だけでなくTOPIX、値上がり銘柄数、売買代金を見て、指数寄与度の高い一部銘柄だけの動きか、市場全体に買い・売りが広がっているかを確認します。";
  }
  if (/決算|業績|上方修正|下方修正|増益|減益/.test(title)) {
    return "業績に関するニュースです。株価への影響は、実績値そのものよりも市場予想との差、通期見通し、利益率、受注や価格転嫁のコメントで変わります。同業他社へ波及するかも確認したい材料です。";
  }
  if (/自社株|配当|増配|株主還元/.test(title)) {
    return "株主還元に関するニュースです。増配や自社株買いは下値を支える材料になりやすい一方、業績の裏付けが弱い場合は一時的な反応にとどまることもあります。配当利回りと財務余力を合わせて見ます。";
  }
  if (/IPO|新規上場|初値|公開価格/.test(title)) {
    return "IPO関連のニュースです。公開価格、初値、需給、ロックアップ、吸収金額を確認すると、短期資金が入りやすい案件か、上場後に売り圧力が出やすい案件か判断しやすくなります。";
  }
  if (category === "金融") {
    return "金融・為替まわりのニュースです。輸出株、銀行株、内需株で反応が分かれやすいため、セクター別の騰落と指数先物の動きを合わせて確認します。";
  }
  if (category === "企業") {
    return "個別企業に関するニュースです。該当企業だけでなく、同業、取引先、テーマ株へ波及するかを見ると、材料の広がりを把握しやすくなります。";
  }
  return "市況全体に関するニュースです。指数、為替、金利、海外市場、売買代金を合わせて見て、短期的な需給要因か、相場の方向感を変える材料かを判断します。";
};

const buildNewsSummary = (title: string, category: string, source: string) => {
  const signals = inferNewsSignals(title);
  const point = buildTitleSpecificPoint(title, category);
  return `このニュースの主な材料は「${joinSignals(signals)}」です。${point} 見るべきポイントは、関連セクターの騰落、出来高の増減、先物や為替の反応、同じテーマ内で買いが広がっているかどうかです。出典は${source}です。`;
};

const trimNewsItems = (items: NewsItem[], limit = COLUMN_LIMIT) => {
  const seen = new Set<string>();
  return items
    .filter((item) => {
      const key = item.url ? normalizeNewsKey(item.url) : normalizeNewsKey(item.title);
      if (!key || seen.has(key) || !item.title) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit)
    .map((item, index) => ({
      ...item,
      id: index + 1,
      isHot: index < 2,
      isNew: index < 1,
    }));
};

const buildMarketSummaryItems = (items: NewsItem[]) => {
  const categories = [
    {
      label: "市況全体",
      category: "市況",
      pattern: /日経平均|TOPIX|東証|日本株|相場|株価|市場|先物/,
      summary:
        "日本株全体の地合いを見るセクションです。指数の方向感だけでなく、値上がり銘柄数、売買代金、先物、海外市場との連動を確認します。半導体など一部大型株だけで指数が動いているのか、幅広い銘柄に買いが入っているのかを分けて見るのがポイントです。",
    },
    {
      label: "為替・金利",
      category: "金融",
      pattern: /円|ドル|為替|金利|日銀|銀行|金融|債券/,
      summary:
        "為替と金利はセクターごとの強弱を左右しやすい材料です。円安は輸出株やインバウンドに追い風となりやすい一方、輸入コストの高い企業には重荷になります。金利上昇局面では銀行・保険が買われやすく、PERの高いグロース株は調整しやすい点を見ます。",
    },
    {
      label: "半導体・AI",
      category: "半導体",
      pattern: /半導体|AI|人工知能|NVIDIA|エヌビディア|メモリ|東京エレクトロン|アドバンテスト/,
      summary:
        "半導体・AI関連は日経平均への寄与が大きく、市場全体のムードを押し上げたり冷やしたりしやすいテーマです。海外半導体株、メモリ市況、設備投資、データセンター需要が関連銘柄へどう波及しているかを確認します。",
    },
    {
      label: "企業材料",
      category: "企業",
      pattern: /決算|業績|買収|提携|自社株|配当|IPO|新規上場/,
      summary:
        "個別企業の材料を拾うセクションです。決算、業績修正、配当、自社株買い、提携、IPOなどは短期の値動きに直結しやすいため、該当銘柄の出来高、寄り付き後の維持力、同業他社への波及を確認します。",
    },
  ];

  const summaryItems = categories
    .map((group, index) => {
      const matched = items.filter((item) => group.pattern.test(item.title)).slice(0, 3);
      if (!matched.length) return null;
      const lead = matched[0];
      const title = `${group.label}: ${lead.title}`;
      return {
        ...lead,
        id: index + 1,
        title,
        category: group.category,
        source: matched.length > 1 ? `${lead.source} ほか${matched.length - 1}件` : lead.source,
        provider: "市況サマリー",
        summary: `${group.summary} 関連見出しは${matched.length}件あります。主な確認対象は「${matched.map((item) => item.title).join("」「")}」です。`,
        isHot: index < 2,
        isNew: index === 0,
      } satisfies NewsItem;
    })
    .filter((item): item is NewsItem => Boolean(item));

  return trimNewsItems(summaryItems.length ? summaryItems : items, COLUMN_LIMIT);
};

const emptyColumns = (fallbackNews: NewsItem[] = []): FeedColumn[] => [
  {
    id: "market",
    title: "市況サマリー",
    sourceLabel: "Yahoo/GDELT横断",
    status: "loading",
    items: trimNewsItems(fallbackNews),
  },
  {
    id: "yahoo",
    title: "Yahoo!ニュース",
    sourceLabel: "Yahoo!ニュースRSS",
    status: "loading",
    items: [],
  },
  {
    id: "gdelt",
    title: "GDELT",
    sourceLabel: "GDELT",
    status: "loading",
    items: [],
  },
];

const loadCachedTopNews = () => {
  try {
    const raw = localStorage.getItem(TOP_NEWS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt: number; columns: FeedColumn[] };
    if (!parsed.columns?.length || Date.now() - parsed.savedAt > TOP_NEWS_CACHE_MS) return null;
    return parsed.columns;
  } catch {
    return null;
  }
};

const saveCachedTopNews = (columns: FeedColumn[]) => {
  try {
    localStorage.setItem(TOP_NEWS_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), columns }));
  } catch {
    // Cache failures should not block top page rendering.
  }
};

const statusLabel = (status: FeedStatus, hasItems: boolean) => {
  if (status === "live") return "更新済み";
  if (status === "loading") return "取得中";
  return hasItems ? "前回値" : "確認中";
};

const categoryColors: Record<string, string> = {
  市況: "bg-primary text-primary-foreground",
  決算: "bg-stock-up text-primary-foreground",
  企業: "bg-muted text-muted-foreground",
  "M&A": "bg-header-accent text-foreground",
  金融: "bg-stock-down text-primary-foreground",
  医薬品: "bg-muted text-foreground",
  半導体: "bg-stock-up-bg text-stock-up",
};

const NewsColumn = ({
  column,
  articleSummaries,
}: {
  column: FeedColumn;
  articleSummaries: Record<string, ArticleSummaryState>;
}) => (
  <section className="flex flex-col bg-card">
    <div className="flex items-center justify-between border-b border-border bg-muted/20 px-3 py-1.5">
      <div className="flex min-w-0 items-center gap-1.5">
        {column.id === "market" ? (
          <TrendingUp className="h-3.5 w-3.5 shrink-0 text-primary" />
        ) : column.id === "gdelt" ? (
          <Radio className="h-3.5 w-3.5 shrink-0 text-primary" />
        ) : (
          <Newspaper className="h-3.5 w-3.5 shrink-0 text-primary" />
        )}
        <div className="min-w-0">
          <h3 className="truncate text-xs font-bold text-foreground">{column.title}</h3>
          <div className="truncate text-xxs font-medium text-muted-foreground">{column.sourceLabel}</div>
        </div>
      </div>
      <span
        className={`shrink-0 rounded px-1.5 py-0.5 text-xxs font-bold ${
          column.status === "live"
            ? "bg-stock-up-bg text-stock-up"
            : column.status === "loading"
              ? "bg-muted text-muted-foreground"
              : "bg-stock-down-bg text-stock-down"
        }`}
      >
        {statusLabel(column.status, column.items.length > 0)}
      </span>
    </div>
    <div className="min-h-0 flex-1 divide-y divide-border">
      {!column.items.length && (
        <div className="px-3 py-4 text-xs text-muted-foreground">
          ニュースを確認しています。
        </div>
      )}
      {column.items.map((item) => {
        const articleState = item.url ? articleSummaries[item.url] : undefined;
        const visibleSummary = articleState?.summary ?? "記事本文要約を取得できませんでした。";

        return (
          <a
            key={`${column.id}-${item.id}-${item.url}`}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="block px-3 py-2.5 transition-colors hover:bg-muted/50"
            aria-label={`${item.title}。要約: ${visibleSummary}`}
          >
            <div className="mb-1 flex items-center gap-1.5">
              <span className="shrink-0 tabular-nums text-xxs font-medium text-muted-foreground">
                {item.time || "--:--"}
              </span>
              <span
                className={`shrink-0 rounded px-1 py-0 text-xxs font-bold ${
                  categoryColors[item.category] || "bg-muted text-muted-foreground"
                }`}
              >
                {item.category}
              </span>
              {item.isNew && (
                <span className="flex shrink-0 items-center gap-0.5 rounded bg-badge-new px-1 py-0 text-xxs font-bold text-primary-foreground">
                  <Sparkles className="h-2.5 w-2.5" />
                  NEW
                </span>
              )}
              {item.isHot && (
                <span className="flex shrink-0 items-center gap-0.5 rounded bg-badge-hot px-1 py-0 text-xxs font-bold text-primary-foreground">
                  <Flame className="h-2.5 w-2.5" />
                  注目
                </span>
              )}
              {item.url && <ExternalLink className="ml-auto h-3 w-3 shrink-0 text-muted-foreground" />}
            </div>
            <div className="line-clamp-2 text-xs font-medium leading-relaxed text-foreground hover:text-primary">
              {item.title}
            </div>
            <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
              <span className="mr-1 text-xxs font-bold text-foreground">記事本文要約</span>
              {articleState?.status === "loading" ? (
                <span className="text-muted-foreground">記事本文を取得して要約しています。</span>
              ) : articleState?.status === "error" || !articleState ? (
                <span className="text-muted-foreground">記事本文要約を取得できませんでした。</span>
              ) : (
                visibleSummary
              )}
            </div>
          </a>
        );
      })}
    </div>
  </section>
);

const NewsFeed = ({ news = [] }: NewsFeedProps) => {
  const [columns, setColumns] = useState<FeedColumn[]>(() => loadCachedTopNews() ?? emptyColumns(news));
  const [articleSummaries, setArticleSummaries] = useState<Record<string, ArticleSummaryState>>({});
  const [activeColumnId, setActiveColumnId] = useState<FeedColumn["id"]>("yahoo");
  const orderedColumns = [...columns].sort((a, b) => {
    const order: Record<FeedColumn["id"], number> = { yahoo: 0, market: 1, gdelt: 2 };
    return order[a.id] - order[b.id];
  });
  const activeColumn = columns.find((column) => column.id === activeColumnId) ?? orderedColumns[0] ?? columns[0];

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;
    const timeout = window.setTimeout(() => controller.abort(), 14000);

    const loadNews = async () => {
      const googleParams = new URLSearchParams({
        q: "日本株 OR 日経平均 OR 東証 OR 半導体 OR AI OR 為替 OR 金利 when:3d",
        hl: "ja",
        gl: "JP",
        ceid: "JP:ja",
      });
      const gdeltParams = new URLSearchParams({
        query:
          "(Japan stocks OR Nikkei OR Tokyo Stock Exchange OR Japanese shares OR semiconductor OR AI OR yen OR Bank of Japan) sourceCountry:JA",
        mode: "artlist",
        format: "json",
        maxrecords: "18",
        sort: "hybrid",
        timespan: "3d",
      });

      const fetchText = async (url: string) => {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      };

      const fetchJson = async (url: string) => {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      };

      const results = await Promise.allSettled([
        fetchText(`/api/google-news?${googleParams.toString()}`).then((text) =>
          trimNewsItems(mapRssNews(text, "Google News RSS", "Google News", 200))
        ),
        fetchText("/api/yahoo-business-rss").then((text) =>
          trimNewsItems(mapRssNews(text, "Yahoo!ニュースRSS", "Yahoo!ニュース", 100))
        ),
        fetchJson(`/api/gdelt?${gdeltParams.toString()}`).then((payload) =>
          trimNewsItems(mapGdeltNews(payload.articles ?? []))
        ),
      ]);

      if (!isActive) return;

      const googleItems = results[0].status === "fulfilled" ? results[0].value : [];
      const yahooItems = results[1].status === "fulfilled" ? results[1].value : [];
      const gdeltItems = results[2].status === "fulfilled" ? results[2].value : [];
      const cachedColumns = loadCachedTopNews();
      const marketItems = buildMarketSummaryItems([...googleItems, ...yahooItems, ...gdeltItems, ...news]);
      const marketSourceLabel = googleItems.length ? "Google/Yahoo/GDELT横断" : "Yahoo/GDELT横断";

      const nextColumns: FeedColumn[] = [
        {
          ...emptyColumns(news)[0],
          sourceLabel: marketSourceLabel,
          status: marketItems.length ? "live" : "fallback",
          items: marketItems.length ? marketItems : cachedColumns?.find((column) => column.id === "market")?.items ?? [],
        },
        {
          ...emptyColumns()[1],
          status: yahooItems.length ? "live" : "fallback",
          items: yahooItems.length ? yahooItems : cachedColumns?.find((column) => column.id === "yahoo")?.items ?? [],
        },
        {
          ...emptyColumns()[2],
          status: gdeltItems.length ? "live" : "fallback",
          items: gdeltItems.length ? gdeltItems : cachedColumns?.find((column) => column.id === "gdelt")?.items ?? [],
        },
      ];

      setColumns(nextColumns);
      if (nextColumns.some((column) => column.items.length)) {
        saveCachedTopNews(nextColumns);
      }
    };

    loadNews().finally(() => window.clearTimeout(timeout));

    return () => {
      isActive = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [news]);

  useEffect(() => {
    const targets = activeColumn.items.filter((item) => item.url && !articleSummaries[item.url]);
    if (!targets.length) return;

    setArticleSummaries((previous) => ({
      ...previous,
      ...Object.fromEntries(targets.map((item) => [item.url as string, { status: "loading" as const }])),
    }));

    targets.forEach((item) => {
      fetch(`/api/article-summary?url=${encodeURIComponent(item.url as string)}`)
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        })
        .then((payload) => {
          const summary = typeof payload.summary === "string" ? payload.summary.trim() : "";
          setArticleSummaries((previous) => ({
            ...previous,
            [item.url as string]: summary ? { status: "ready", summary } : { status: "error" },
          }));
        })
        .catch(() => {
          setArticleSummaries((previous) => ({
            ...previous,
            [item.url as string]: { status: "error" },
          }));
        });
    });
  }, [activeColumn]);

  return (
    <div className="rounded border border-border bg-card">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border bg-table-header-bg px-2 py-1.5">
        {orderedColumns.map((column) => (
          <button
            key={column.id}
            type="button"
            onClick={() => setActiveColumnId(column.id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded px-2 py-1 text-xs font-bold transition-colors ${
              activeColumn.id === column.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {column.id === "market" ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : column.id === "gdelt" ? (
              <Radio className="h-3.5 w-3.5" />
            ) : (
              <Newspaper className="h-3.5 w-3.5" />
            )}
            {column.title}
            <span
              className={`rounded px-1 py-0 text-xxs ${
                activeColumn.id === column.id
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {column.items.length || statusLabel(column.status, false)}
            </span>
          </button>
        ))}
      </div>
      <div className="p-2">
        <NewsColumn
          key={activeColumn.id}
          column={activeColumn}
          articleSummaries={articleSummaries}
        />
      </div>
    </div>
  );
};

export default NewsFeed;
