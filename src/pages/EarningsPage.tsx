import { useMemo, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MarketTicker from "@/components/MarketTicker";
import { marketIndices, type NewsItem } from "@/data/stockData";
import { useLiveNewsSearch } from "@/hooks/useLiveNewsSearch";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  ExternalLink,
  FileText,
  Rocket,
  Search,
} from "lucide-react";

type MaterialType = "決算" | "IPO";
type MaterialSignal =
  | "上方修正"
  | "下方修正"
  | "決算発表"
  | "配当・還元"
  | "上場承認"
  | "仮条件・公開価格"
  | "初値"
  | "申込・抽選";

const titlePattern =
  /決算|業績|営業利益|純利益|売上高|上方修正|下方修正|増益|減益|赤字|黒字|増配|減配|配当|自社株|株主還元|IPO|新規上場|上場承認|仮条件|公開価格|売出価格|発行価格|初値|ブックビル|需要申告|抽選/;

const typeOptions: Array<MaterialType | "すべて"> = ["すべて", "決算", "IPO"];
const signalOptions: Array<MaterialSignal | "すべて"> = [
  "すべて",
  "上方修正",
  "下方修正",
  "決算発表",
  "配当・還元",
  "上場承認",
  "仮条件・公開価格",
  "初値",
  "申込・抽選",
];

const getMaterialType = (title: string): MaterialType =>
  /IPO|新規上場|上場承認|仮条件|公開価格|売出価格|発行価格|初値|ブックビル|需要申告|抽選/.test(title)
    ? "IPO"
    : "決算";

const getSignal = (title: string): MaterialSignal => {
  if (/上方修正|増益|最高益|上振れ|上回|黒字/.test(title)) return "上方修正";
  if (/下方修正|減益|赤字|下振れ|下回|減配/.test(title)) return "下方修正";
  if (/配当|自社株|還元|増配|復配/.test(title)) return "配当・還元";
  if (/上場承認|新規上場承認|東証.*承認/.test(title)) return "上場承認";
  if (/仮条件|公開価格|売出価格|発行価格/.test(title)) return "仮条件・公開価格";
  if (/初値|買い気配|売り気配|公開価格.*上回|公開価格.*下回/.test(title)) return "初値";
  if (/申込|抽選|ブックビル|BB|需要申告/.test(title)) return "申込・抽選";
  return "決算発表";
};

const signalTone: Record<MaterialSignal, string> = {
  上方修正: "bg-stock-up-bg text-stock-up",
  下方修正: "bg-stock-down-bg text-stock-down",
  決算発表: "bg-primary/10 text-primary",
  "配当・還元": "bg-stock-up-bg text-stock-up",
  上場承認: "bg-primary/10 text-primary",
  "仮条件・公開価格": "bg-stock-up-bg text-stock-up",
  初値: "bg-stock-up-bg text-stock-up",
  "申込・抽選": "bg-muted text-foreground",
};

const countBy = (news: NewsItem[], predicate: (item: NewsItem) => boolean) =>
  news.filter(predicate).length;

const EarningsPage = () => {
  const [selectedType, setSelectedType] = useState<MaterialType | "すべて">("すべて");
  const [selectedSignal, setSelectedSignal] = useState<MaterialSignal | "すべて">("すべて");
  const [searchQuery, setSearchQuery] = useState("");
  const { news, status, updatedAt } = useLiveNewsSearch({
    query:
      "日本株 決算 業績 上方修正 下方修正 増配 自社株買い IPO 新規上場 上場承認 仮条件 公開価格 初値 when:30d",
    gdeltQuery:
      '(earnings OR profit OR forecast OR dividend OR IPO OR "initial public offering" OR "new listing") (Japan OR Nikkei OR "Tokyo Stock Exchange") sourceCountry:JA',
    timespan: "30d",
    titlePattern,
    includeTdnet: true,
    limit: 40,
  });

  const relevantNews = useMemo(() => news.filter((item) => titlePattern.test(item.title)), [news]);

  const filteredNews = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return relevantNews.filter((item) => {
      const type = getMaterialType(item.title);
      const signal = getSignal(item.title);
      const matchesType = selectedType === "すべて" || type === selectedType;
      const matchesSignal = selectedSignal === "すべて" || signal === selectedSignal;
      const matchesSearch =
        !query ||
        [item.title, item.source ?? "", item.category].some((value) =>
          value.toLowerCase().includes(query)
        );
      return matchesType && matchesSignal && matchesSearch;
    });
  }, [relevantNews, searchQuery, selectedSignal, selectedType]);

  const summaryCards = [
    {
      label: "決算材料",
      value: countBy(relevantNews, (item) => getMaterialType(item.title) === "決算"),
      icon: FileText,
      className: "text-primary",
    },
    {
      label: "上方・還元",
      value: countBy(relevantNews, (item) => ["上方修正", "配当・還元"].includes(getSignal(item.title))),
      icon: ArrowUpRight,
      className: "text-stock-up",
    },
    {
      label: "警戒材料",
      value: countBy(relevantNews, (item) => getSignal(item.title) === "下方修正"),
      icon: ArrowDownRight,
      className: "text-stock-down",
    },
    {
      label: "IPO材料",
      value: countBy(relevantNews, (item) => getMaterialType(item.title) === "IPO"),
      icon: Rocket,
      className: "text-header-accent",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader activeTab="決算・IPO" />
      <MarketTicker indices={marketIndices} />

      <main className="container mx-auto space-y-3 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <CalendarDays className="h-4 w-4 text-primary" />
          決算・IPO材料
        </h2>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded border border-border bg-card p-3">
                <div className="flex items-center justify-between">
                  <div className="text-xxs font-semibold text-muted-foreground">{card.label}</div>
                  <Icon className={`h-4 w-4 ${card.className}`} />
                </div>
                <div className={`mt-1 text-2xl font-black tabular-nums ${card.className}`}>
                  {card.value}
                </div>
              </div>
            );
          })}
        </div>

        <section className="rounded border border-border bg-card">
          <div className="flex flex-col gap-2 border-b border-border bg-table-header-bg px-3 py-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-xs font-bold text-foreground">タイトル一致ニュース</h3>
              <div className="mt-1 flex items-center gap-2 text-xxs font-semibold text-muted-foreground">
                <span
                  className={`rounded px-1.5 py-0.5 ${
                    status === "live"
                      ? "bg-stock-up-bg text-stock-up"
                      : status === "loading"
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {status === "live" ? "LIVE" : status === "loading" ? "取得中" : "代替取得"}
                </span>
                {updatedAt && <span>更新 {updatedAt}</span>}
              </div>
            </div>
            <div className="relative w-full lg:w-80">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="企業名・材料・媒体で検索"
                className="h-8 w-full rounded border border-border bg-background pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 border-b border-border px-3 py-2">
            {typeOptions.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={`h-7 rounded border px-2 text-xxs font-semibold ${
                  selectedType === type
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted/60"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5 border-b border-border px-3 py-2">
            {signalOptions.map((signal) => (
              <button
                key={signal}
                type="button"
                onClick={() => setSelectedSignal(signal)}
                className={`h-7 rounded border px-2 text-xxs font-semibold ${
                  selectedSignal === signal
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted/60"
                }`}
              >
                {signal}
              </button>
            ))}
          </div>

          <div className="divide-y divide-border">
            {!filteredNews.length && (
              <div className="flex items-center gap-2 px-3 py-8 text-xs font-semibold text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                タイトルに一致する決算・IPO材料がありません。
              </div>
            )}
            {filteredNews.map((item) => {
              const type = getMaterialType(item.title);
              const signal = getSignal(item.title);
              return (
                <a
                  key={`${item.id}-${item.url}`}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="grid gap-2 px-3 py-2 transition-colors hover:bg-muted/50 md:grid-cols-[6rem_4.5rem_7.5rem_1fr_8rem]"
                >
                  <div className="tabular-nums text-xxs font-medium text-muted-foreground">
                    {item.date} {item.time}
                  </div>
                  <div>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xxs font-bold text-foreground">
                      {type}
                    </span>
                  </div>
                  <div>
                    <span className={`rounded px-1.5 py-0.5 text-xxs font-bold ${signalTone[signal]}`}>
                      {signal}
                    </span>
                  </div>
                  <div className="text-xs font-medium leading-relaxed text-foreground">{item.title}</div>
                  <div className="flex items-center justify-end gap-1 text-xxs text-muted-foreground">
                    {item.source}
                    <ExternalLink className="h-3 w-3" />
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        <section className="rounded border border-border bg-card">
          <div className="border-b border-border bg-table-header-bg px-3 py-2">
            <h3 className="text-xs font-bold text-foreground">見るポイント</h3>
          </div>
          <div className="grid gap-2 p-3 md:grid-cols-2">
            <div className="rounded border border-border bg-background p-2">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <FileText className="h-3.5 w-3.5 text-primary" />
                決算
              </div>
              <p className="mt-1 text-xxs font-medium leading-relaxed text-muted-foreground">
                上方・下方修正、増配、自社株買い、赤字転落、最高益など、株価材料になりやすい語句を優先して拾います。
              </p>
            </div>
            <div className="rounded border border-border bg-background p-2">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <CircleDollarSign className="h-3.5 w-3.5 text-stock-up" />
                IPO
              </div>
              <p className="mt-1 text-xxs font-medium leading-relaxed text-muted-foreground">
                上場承認、仮条件、公開価格、初値、ブックビルディングなど、IPOの進行段階が分かるタイトルだけに絞ります。
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
};

export default EarningsPage;
