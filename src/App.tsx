import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route, useLocation } from "react-router-dom";
import { Component, type ReactNode, lazy, Suspense, useEffect } from "react";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import { RateVoiceAlertManager } from "@/components/RateVoiceAlertControl";

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message || "画面表示中にエラーが発生しました。" };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-5 text-center shadow-sm">
            <h2 className="text-sm font-extrabold text-foreground">画面の描画に失敗しました</h2>
            <p className="mt-2 break-all rounded bg-muted p-2 font-mono text-xxs text-muted-foreground">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, message: "" })}
              className="mt-3 rounded bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
            >
              元の画面を再表示
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    const root = document.getElementById("root");
    if (root) {
      root.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
};

const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MarketPage = lazy(() => import("./pages/MarketPage"));
const StocksPage = lazy(() => import("./pages/StocksPage"));
const EarningsPage = lazy(() => import("./pages/EarningsPage"));
const IpoPage = lazy(() => import("./pages/IpoPage"));
const ThemesPage = lazy(() => import("./pages/ThemesPage"));
const ChartPage = lazy(() => import("./pages/ChartPage"));
const NewsPage = lazy(() => import("./pages/NewsPage"));
const SmartMoneyPage = lazy(() => import("./pages/SmartMoneyPage"));
const AdvisorPage = lazy(() => import("./pages/AdvisorPage"));
const PatternsPage = lazy(() => import("./pages/PatternsPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <ScrollToTopButton />
        <RateVoiceAlertManager />
        <AppErrorBoundary>
          <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/market" element={<MarketPage />} />
              <Route path="/stocks" element={<StocksPage />} />
              <Route path="/ranking" element={<Navigate to="/market?index=ranking" replace />} />
              <Route path="/earnings" element={<EarningsPage />} />
              <Route path="/ipo" element={<IpoPage />} />
              <Route path="/themes" element={<ThemesPage />} />
              <Route path="/screening" element={<Navigate to="/market" replace />} />
              <Route path="/chart" element={<ChartPage />} />
              <Route path="/news" element={<NewsPage />} />
              <Route path="/smart-money" element={<SmartMoneyPage />} />
              <Route path="/advisor" element={<AdvisorPage />} />
              <Route path="/patterns" element={<PatternsPage />} />
              <Route path="/chart-patterns" element={<Navigate to="/patterns" replace />} />
              <Route path="/guide" element={<Navigate to="/advisor?tab=guide" replace />} />
              <Route path="/metrics-guide" element={<Navigate to="/advisor?tab=guide" replace />} />
              <Route path="/terms" element={<TermsPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AppErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
