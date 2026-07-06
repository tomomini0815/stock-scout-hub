import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";

const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MarketPage = lazy(() => import("./pages/MarketPage"));
const StocksPage = lazy(() => import("./pages/StocksPage"));
const RankingPage = lazy(() => import("./pages/RankingPage"));
const EarningsPage = lazy(() => import("./pages/EarningsPage"));
const IpoPage = lazy(() => import("./pages/IpoPage"));
const ThemesPage = lazy(() => import("./pages/ThemesPage"));
const ChartPage = lazy(() => import("./pages/ChartPage"));
const NewsPage = lazy(() => import("./pages/NewsPage"));
const SmartMoneyPage = lazy(() => import("./pages/SmartMoneyPage"));
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
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/market" element={<MarketPage />} />
            <Route path="/stocks" element={<StocksPage />} />
            <Route path="/ranking" element={<RankingPage />} />
            <Route path="/earnings" element={<EarningsPage />} />
            <Route path="/ipo" element={<IpoPage />} />
            <Route path="/themes" element={<ThemesPage />} />
            <Route path="/screening" element={<Navigate to="/market" replace />} />
            <Route path="/chart" element={<ChartPage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/smart-money" element={<SmartMoneyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
