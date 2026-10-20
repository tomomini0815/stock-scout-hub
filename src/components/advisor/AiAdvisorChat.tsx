import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Bot,
  ExternalLink,
  Flame,
  HelpCircle,
  RotateCcw,
  Send,
  Sparkles,
  TrendingUp,
  User,
} from "lucide-react";
import {
  promptSuggestions,
  generateAdvisorResponse,
  fetchStockNewsDirect,
  extractStockFromQuery,
  type ChatMessage,
} from "@/data/advisorData";
import { stockUniverse, type StockData, type NewsItem } from "@/data/stockData";

import { findSearchableStock } from "@/lib/stockSearch";

interface AiAdvisorChatProps {
  initialStockCode?: string;
  onInspectStockInHealthCheck?: (code: string) => void;
}

const initialMessages: ChatMessage[] = [
  {
    id: "welcome-1",
    sender: "advisor",
    text: `こんにちは！株Naviの **AI専属投資コンシェルジュ** です。

あなたの投資方針やお悩みに合わせて、個別銘柄の買い時診断、高配当株・成長株の厳選提案、相場環境の分析などをリアルタイムでお答えします。

気になる銘柄コード（例: **7203**）や、「配当利回り4%以上の割安株は？」「初心者におすすめの銘柄は？」など、何でも自由にご相談ください！`,
    timestamp: "たった今",
  },
];

// リッチで読みやすい簡易Markdownレンダラー
const renderFormattedMessage = (content: string) => {
  const lines = content.split("\n");
  return (
    <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={idx} className="font-black text-sm sm:text-base text-foreground mt-2 border-b border-border/40 pb-1">
              {trimmed.replace("### ", "")}
            </h3>
          );
        }
        if (trimmed.startsWith("#### ")) {
          return (
            <h4 key={idx} className="font-bold text-xs sm:text-sm text-foreground mt-1.5 text-header-accent">
              {trimmed.replace("#### ", "")}
            </h4>
          );
        }
        if (trimmed === "---") {
          return <hr key={idx} className="border-border/40 my-2" />;
        }
        if (trimmed.startsWith("- ")) {
          const itemText = trimmed.replace(/^- /, "");
          return (
            <div key={idx} className="flex items-start gap-1.5 ml-1 text-foreground/90">
              <span className="text-header-accent font-bold">•</span>
              <span dangerouslySetInnerHTML={{ __html: formatInline(itemText) }} />
            </div>
          );
        }
        if (/^\d+\.\s/.test(trimmed)) {
          return (
            <div key={idx} className="flex items-start gap-1.5 ml-1 text-foreground/90 font-medium">
              <span dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }} />
            </div>
          );
        }
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        return (
          <p key={idx} className="text-foreground/90" dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
        );
      })}
    </div>
  );
};

// **太字** を <strong> に変換
const formatInline = (text: string) => {
  return text.replace(/\*\*(.*?)\*\*/g, "<strong class='font-bold text-foreground'>$1</strong>");
};

export const AiAdvisorChat = ({
  initialStockCode,
  onInspectStockInHealthCheck,
}: AiAdvisorChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputQuery, setInputQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (initialStockCode) {
      handleSendMessage(`${initialStockCode} の銘柄診断と買い時シナリオを教えてください。`);
    }
  }, [initialStockCode]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend ?? inputQuery).trim();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit" }).format(new Date()),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputQuery("");
    setIsTyping(true);

    // 1. クエリから対象銘柄（コード・社名・通称）を抽出
    let stockForNews = extractStockFromQuery(query);

    // 2. 銘柄名・コードが直接含まれないカテゴリ質問の場合、代表本命銘柄を設定
    const qLower = query.toLowerCase();
    if (!stockForNews) {
      if (
        qLower.includes("割安") ||
        qLower.includes("バリュー") ||
        qLower.includes("低pbr") ||
        qLower.includes("1倍割れ")
      ) {
        stockForNews = stockUniverse.find((s) => s.code === "8058") ?? {
          code: "8058",
          name: "三菱商事",
          market: "プライム",
          price: 0,
          change: 0,
          changePercent: 0,
          volume: 0,
          open: 0,
          high: 0,
          low: 0,
          previousClose: 0,
        };
      } else if (
        qLower.includes("成長") ||
        qLower.includes("グロース") ||
        qLower.includes("テンバガー")
      ) {
        stockForNews = stockUniverse.find((s) => s.code === "6146") ?? {
          code: "6146",
          name: "ディスコ",
          market: "プライム",
          price: 0,
          change: 0,
          changePercent: 0,
          volume: 0,
          open: 0,
          high: 0,
          low: 0,
          previousClose: 0,
        };
      } else if (
        qLower.includes("配当") ||
        qLower.includes("インカム") ||
        qLower.includes("利回り") ||
        qLower.includes("増配")
      ) {
        stockForNews = stockUniverse.find((s) => s.code === "8306") ?? {
          code: "8306",
          name: "三菱UFJ",
          market: "プライム",
          price: 0,
          change: 0,
          changePercent: 0,
          volume: 0,
          open: 0,
          high: 0,
          low: 0,
          previousClose: 0,
        };
      } else if (
        qLower.includes("半導体") ||
        qLower.includes("ai") ||
        qLower.includes("チップ") ||
        qLower.includes("nvidia")
      ) {
        stockForNews = stockUniverse.find((s) => s.code === "8035") ?? {
          code: "8035",
          name: "東京エレクトロン",
          market: "プライム",
          price: 0,
          change: 0,
          changePercent: 0,
          volume: 0,
          open: 0,
          high: 0,
          low: 0,
          previousClose: 0,
        };
      } else if (qLower.includes("防衛") || qLower.includes("重工")) {
        stockForNews = stockUniverse.find((s) => s.code === "7011") ?? {
          code: "7011",
          name: "三菱重工業",
          market: "プライム",
          price: 0,
          change: 0,
          changePercent: 0,
          volume: 0,
          open: 0,
          high: 0,
          low: 0,
          previousClose: 0,
        };
      } else if (
        qLower.includes("おすすめ") ||
        qLower.includes("注目") ||
        qLower.includes("何買")
      ) {
        stockForNews = stockUniverse.find((s) => s.code === "7203") ?? {
          code: "7203",
          name: "トヨタ自動車",
          market: "プライム",
          price: 0,
          change: 0,
          changePercent: 0,
          volume: 0,
          open: 0,
          high: 0,
          low: 0,
          previousClose: 0,
        };
      }
    }

    let liveQuoteStock: StockData | undefined;
    let fetchedNews: NewsItem[] = [];

    if (stockForNews) {
      const code = stockForNews.code;
      const companyName = stockForNews.name || code;

      try {
        const symbol = `${code}.T`;
        const [quoteRes, newsData] = await Promise.allSettled([
          fetch(`/api/stock-quotes?symbols=${encodeURIComponent(symbol)}`),
          fetchStockNewsDirect(code, companyName),
        ]);

        if (quoteRes.status === "fulfilled" && quoteRes.value.ok) {
          const payload = await quoteRes.value.json();
          const q = payload.quotes?.[0];
          if (q && Number.isFinite(q.price) && q.price > 0) {
            liveQuoteStock = {
              code: q.code,
              name: stockForNews.name || q.code,
              market: stockForNews.market || "プライム",
              price: q.price,
              change: q.change,
              changePercent: q.changePercent,
              volume: q.volume,
              open: q.open,
              high: q.high,
              low: q.low,
              previousClose: q.previousClose,
            };
          }
        }

        if (newsData.status === "fulfilled" && newsData.value.length > 0) {
          fetchedNews = newsData.value;
        }
      } catch {
        // fallback
      }
    }

    setTimeout(() => {
      const response = generateAdvisorResponse(query, liveQuoteStock, fetchedNews);
      const advisorMsg: ChatMessage = {
        id: `advisor-${Date.now()}`,
        sender: "advisor",
        text: response.text,
        timestamp: new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit" }).format(new Date()),
        attachedStock: response.attachedStock,
        attachedNews: response.attachedNews,
      };

      setMessages((prev) => [...prev, advisorMsg]);
      setIsTyping(false);
    }, 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleResetChat = () => {
    setMessages(initialMessages);
  };

  return (
    <div className="flex h-[660px] flex-col rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
      {/* チャットサブヘッダー（シンプル & クリーン） */}
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex h-7 w-7 items-center justify-center rounded-md bg-header-accent text-header-bg">
            <Bot className="h-4 w-4" />
            <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-card bg-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-foreground">AI投資コンシェルジュ</span>
              <span className="rounded bg-emerald-500/10 px-1 py-0.2 text-xxs font-semibold text-emerald-600 dark:text-emerald-400">
                東証全銘柄・シグナル連動
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetChat}
          className="inline-flex items-center gap-1 rounded border border-border/60 px-2 py-0.5 text-xxs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="対話をリセット"
        >
          <RotateCcw className="h-2.5 w-2.5" />
          履歴クリア
        </button>
      </div>

      {/* サジェスト質問チップバー */}
      <div className="border-b border-border/40 bg-background/40 px-3 py-1.5 overflow-x-auto flex items-center gap-1.5 no-scrollbar">
        <span className="text-xxs font-semibold text-muted-foreground shrink-0 flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-header-accent" />
          おすすめの相談:
        </span>
        {promptSuggestions.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(item.query)}
            className="shrink-0 rounded-md border border-border/60 bg-card px-2.5 py-1 text-xs text-foreground/90 hover:border-header-accent hover:bg-header-accent/5 hover:text-header-accent transition-colors"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* メッセージ表示エリア */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* アバター */}
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs ${
                  isUser
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-header-accent text-header-bg"
                }`}
              >
                {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              </div>

              {/* メッセージ本文 */}
              <div className={`max-w-[90%] space-y-2 sm:max-w-[82%]`}>
                <div
                  className={`rounded-xl px-4 py-3 text-xs leading-relaxed shadow-xs ${
                    isUser
                      ? "rounded-tr-none bg-primary text-primary-foreground"
                      : "rounded-tl-none border border-border/80 bg-background/90 text-foreground"
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  ) : (
                    renderFormattedMessage(msg.text)
                  )}
                </div>

                {/* 関連銘柄カード（AIからの回答に付随する場合） */}
                {msg.attachedStock && (
                  <div className="rounded-lg border border-border/80 bg-background/70 p-2.5 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xxs font-mono font-bold text-muted-foreground">
                          {msg.attachedStock.code}
                        </span>
                        <span className="font-bold text-xs text-foreground">
                          {msg.attachedStock.name}
                        </span>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-xs font-bold">
                          ¥{msg.attachedStock.price.toLocaleString()}
                        </span>
                        <span
                          className={`ml-1 text-xxs font-semibold ${
                            msg.attachedStock.change >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {msg.attachedStock.change >= 0 ? "+" : ""}
                          {msg.attachedStock.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                      {onInspectStockInHealthCheck && (
                        <button
                          type="button"
                          onClick={() => onInspectStockInHealthCheck(msg.attachedStock!.code)}
                          className="flex-1 rounded bg-header-accent/10 py-1 text-center text-xxs font-semibold text-header-accent hover:bg-header-accent/20 transition-colors"
                        >
                          銘柄カルテを開く
                        </button>
                      )}
                      <Link
                        to={`/chart?q=${msg.attachedStock.code}`}
                        className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xxs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <span>チャート</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                )}

                {/* 関連最新ニュースカード */}
                {msg.attachedNews && msg.attachedNews.length > 0 && (
                  <div className="rounded-lg border border-border/80 bg-background/70 p-2.5 shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between text-xxs font-bold text-muted-foreground border-b border-border/40 pb-1">
                      <span className="flex items-center gap-1">
                        <Flame className="h-3 w-3 text-amber-500" />
                        この銘柄の直近重要ニュース（クリックで開く）
                      </span>
                      <span className="text-xxs font-mono">{msg.attachedNews.length}件</span>
                    </div>
                    <div className="space-y-1">
                      {msg.attachedNews.map((news) => (
                        <a
                          key={news.id}
                          href={news.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group block rounded p-1 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-1 text-xs">
                            <span className="text-foreground group-hover:text-header-accent transition-colors font-medium line-clamp-1 leading-snug">
                              {news.title}
                            </span>
                            <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-header-accent mt-0.5" />
                          </div>
                          <div className="flex items-center gap-2 text-xxs text-muted-foreground mt-0.5 font-mono">
                            <span>{news.source}</span>
                            <span>•</span>
                            <span>{news.date}</span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  className={`text-xxs text-muted-foreground font-mono ${
                    isUser ? "text-right" : "text-left"
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {/* タイピングインジケーター */}
        {isTyping && (
          <div className="flex items-start gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-header-accent text-header-bg text-xs">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="rounded-xl rounded-tl-none border border-border/80 bg-background/80 px-3.5 py-2.5 shadow-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-header-accent animate-bounce" />
                <span className="h-2 w-2 rounded-full bg-header-accent animate-bounce [animation-delay:0.2s]" />
                <span className="h-2 w-2 rounded-full bg-header-accent animate-bounce [animation-delay:0.4s]" />
                <span className="ml-1 text-xxs font-medium text-muted-foreground">分析中...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 入力フォーム */}
      <div className="border-t border-border/60 bg-muted/20 p-2.5 sm:p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="銘柄コード（例: 7203）や投資の相談を入力..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isTyping}
            className="h-9 flex-1 rounded-md border border-border/80 bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-header-accent focus:outline-none focus:ring-1 focus:ring-header-accent disabled:opacity-50 sm:text-sm"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isTyping}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-header-accent text-header-bg transition-opacity hover:opacity-90 disabled:opacity-40"
            title="送信"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <p className="mt-1 text-center text-xxs text-muted-foreground">
          ※ AIの回答は投資の客観的参考情報であり、特定銘柄の売買を勧誘・保証するものではありません。
        </p>
      </div>
    </div>
  );
};
