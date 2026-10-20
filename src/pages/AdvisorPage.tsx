import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Activity,
  BookOpen,
  Cpu,
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MarketTicker from "@/components/MarketTicker";
import { marketIndices } from "@/data/stockData";
import { StockDecisionSimulator } from "@/components/advisor/StockDecisionSimulator";
import { StockHealthCheck } from "@/components/advisor/StockHealthCheck";
import { ProMetricsGuide } from "@/components/advisor/ProMetricsGuide";

type TabType = "simulator" | "health" | "guide";

const AdvisorPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const resolveTab = (param: string | null): TabType => {
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
    handleTabChange("health");
  };

  const handleAskAdvisorWithStock = (code: string) => {
    setSelectedStockCode(code);
    handleTabChange("simulator");
    // シナリオ判定セクションへスクロール
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
      id: "guide",
      label: "指標ガイド",
      icon: BookOpen,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader activeTab="銘柄診断" />
      <MarketTicker indices={marketIndices} />

      <main className="container mx-auto space-y-3 px-2 py-2 sm:px-4 sm:py-3">
        {/* ページタイトル & タブナビゲーション（背景なし） */}
        <div className="flex flex-col gap-2 py-1 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Cpu className="h-4 w-4 shrink-0 text-foreground" />
            <h1 className="text-xs sm:text-sm font-bold text-foreground whitespace-nowrap">
              銘柄診断 & 投資シミュレーター
            </h1>
            <span className="hidden xl:inline text-xxs text-muted-foreground truncate">
              「2銘柄ガチンコ比較」「売買シナリオ」「予算別ポートフォリオ」「銘柄カルテ」で投資判断をサポート
            </span>
          </div>

          {/* セグメントコントロール・タブナビゲーション */}
          <div className="flex items-center">
            <div className="flex max-w-full rounded-md border border-border/70 bg-card p-0.5 text-xs font-semibold whitespace-nowrap shadow-2xs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className={`relative flex shrink-0 items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-colors ${
                      isActive
                        ? "bg-muted text-foreground font-bold shadow-2xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium"
                    }`}
                  >
                    <Icon
                      className={`h-3.5 w-3.5 transition-colors ${
                        isActive ? "text-header-accent" : "text-muted-foreground/70"
                      }`}
                    />
                    <span>{tab.label}</span>
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-header-accent"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* タブコンテンツ */}
        <div>
          {activeTab === "simulator" && (
            <div className="animate-in fade-in-50 duration-200">
              <StockDecisionSimulator
                initialStockCode={selectedStockCode}
                onInspectStockInHealthCheck={handleInspectStockInHealthCheck}
              />
            </div>
          )}

          {activeTab === "health" && (
            <div className="animate-in fade-in-50 duration-200">
              <StockHealthCheck
                initialCode={selectedStockCode}
                onAskAdvisorWithStock={handleAskAdvisorWithStock}
                onOpenMetricsGuide={handleOpenMetricsGuide}
              />
            </div>
          )}

          {activeTab === "guide" && (
            <div className="animate-in fade-in-50 duration-200">
              <ProMetricsGuide
                initialMetric={selectedMetric}
                onNavigateToStockSearch={(code) => handleInspectStockInHealthCheck(code)}
              />
            </div>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default AdvisorPage;
