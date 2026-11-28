import { useState, useEffect, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Activity,
  BookOpen,
  Cpu,
  PiggyBank,
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MarketTicker from "@/components/MarketTicker";
import { marketIndices } from "@/data/stockData";

const StockDecisionSimulator = lazy(() =>
  import("@/components/advisor/StockDecisionSimulator").then((m) => ({
    default: m.StockDecisionSimulator,
  }))
);
const StockHealthCheck = lazy(() =>
  import("@/components/advisor/StockHealthCheck").then((m) => ({
    default: m.StockHealthCheck,
  }))
);
const ProMetricsGuide = lazy(() =>
  import("@/components/advisor/ProMetricsGuide").then((m) => ({
    default: m.ProMetricsGuide,
  }))
);
const NewNisaSimulator = lazy(() =>
  import("@/components/advisor/NewNisaSimulator").then((m) => ({
    default: m.NewNisaSimulator,
  }))
);

const TabLoadingFallback = () => (
  <div className="flex min-h-[260px] items-center justify-center p-6 text-xs text-muted-foreground">
    読み込み中...
  </div>
);

type TabType = "simulator" | "nisa" | "health" | "guide";

const AdvisorPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const resolveTab = (param: string | null): TabType => {
    if (param === "nisa") return "nisa";
    if (param === "health" || param === "health-check" || param === "karute") return "health";
    if (param === "guide") return "guide";
    return "simulator";
  };

  const rawTab = searchParams.get("tab");
  const initialTab: TabType = resolveTab(rawTab);
  const initialCode = searchParams.get("code") || "7203";
  const initialMetric = searchParams.get("metric") || "overview";

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [selectedStockCode, setSelectedStockCode] = useState<string>(initialCode);
  const [selectedMetric, setSelectedMetric] = useState<string>(initialMetric);

  // URLパラメータの同期
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "wizard") {
      setActiveTab("simulator");
      setTimeout(() => {
        const el = document.getElementById("wizard-section");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    } else {
      setActiveTab(resolveTab(tabParam));
    }
    const metric = searchParams.get("metric");
    if (metric) {
      setSelectedMetric(metric);
    }
    const code = searchParams.get("code");
    if (code) {
      setSelectedStockCode(code);
    }
  }, [searchParams]);

  const handleTabChange = (tab: TabType, metric?: string) => {
    setActiveTab(tab);
    if (metric) setSelectedMetric(metric);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      if (metric) {
        next.set("metric", metric);
      } else if (tab !== "guide") {
        next.delete("metric");
      }
      return next;
    });
  };

  const handleInspectStockInHealthCheck = (code: string) => {
    setSelectedStockCode(code);
    setActiveTab("health");
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", "health");
      next.set("code", code);
      next.delete("metric");
      return next;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 80);
  };

  const handleAskAdvisorWithStock = (code: string) => {
    setSelectedStockCode(code);
    handleTabChange("simulator");
    setTimeout(() => {
      const el = document.getElementById("scenario-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  const handleOpenMetricsGuide = (metric: string) => {
    handleTabChange("guide", metric);
  };

  const tabs: Array<{
    id: TabType;
    label: string;
    badge?: string;
    icon: typeof Cpu;
  }> = [
    {
      id: "simulator",
      label: "投資シミュレーター & 診断",
      icon: Cpu,
    },
    {
      id: "health",
      label: "銘柄カルテ",
      icon: Activity,
    },
    {
      id: "nisa",
      label: "新NISAシミュレーター",
      badge: "1,800万",
      icon: PiggyBank,
    },
    {
      id: "guide",
      label: "指標ガイド",
      icon: BookOpen,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader activeTab="銘柄診断" />
      <MarketTicker indices={marketIndices} />

      <main className="container mx-auto px-3 py-3 sm:px-4">
        {/* サイト共通のフラット＆コンパクトな見出し行（スクリーニングページ準拠） */}
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Cpu className="h-4 w-4 shrink-0 text-primary" />
            <h1 className="whitespace-nowrap text-sm font-bold text-foreground">
              銘柄診断 & 投資シミュレーター
            </h1>
            <span className="whitespace-nowrap rounded border border-border bg-muted px-1.5 py-0.5 text-xxs font-semibold text-foreground/80">
              新NISA・カルテ対応
            </span>
          </div>
          <span className="hidden truncate text-xxs text-muted-foreground lg:inline">
            2銘柄比較・売買シナリオ・新NISA試算・銘柄カルテを1ページで確認
          </span>
        </div>

        {/* 下線タブの一体型カード（スクリーニングページ準拠） */}
        <section className="overflow-hidden rounded border border-border bg-card">
          <div
            role="tablist"
            aria-label="銘柄診断・投資シミュレーター機能切替"
            className="flex items-stretch overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x border-b border-border bg-muted/40 no-scrollbar"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleTabChange(tab.id)}
                  className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-4 px-3 py-2.5 text-xs transition-colors sm:px-4 ${
                    isActive
                      ? "border-primary bg-table-header-bg font-bold text-primary"
                      : "border-transparent font-semibold text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`rounded px-1 py-0.5 text-[10px] font-semibold tabular-nums leading-none ${
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "bg-background/80 text-muted-foreground"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 選択中タブの本体（タブ別に遅延読み込み） */}
          <Suspense fallback={<TabLoadingFallback />}>
            {activeTab === "nisa" && <NewNisaSimulator />}

            {activeTab === "simulator" && (
              <StockDecisionSimulator
                initialStockCode={selectedStockCode}
                onInspectStockInHealthCheck={handleInspectStockInHealthCheck}
              />
            )}

            {activeTab === "health" && (
              <div className="p-2.5 sm:p-3">
                <StockHealthCheck
                  initialCode={selectedStockCode}
                  onAskAdvisorWithStock={handleAskAdvisorWithStock}
                  onOpenMetricsGuide={handleOpenMetricsGuide}
                />
              </div>
            )}

            {activeTab === "guide" && (
              <ProMetricsGuide
                initialMetric={selectedMetric}
                onNavigateToStockSearch={(code) => handleInspectStockInHealthCheck(code)}
              />
            )}
          </Suspense>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default AdvisorPage;
