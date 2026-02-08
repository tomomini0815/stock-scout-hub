import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import MarketPage from "./pages/MarketPage";
import StocksPage from "./pages/StocksPage";
import RankingPage from "./pages/RankingPage";
import EarningsPage from "./pages/EarningsPage";
import IpoPage from "./pages/IpoPage";
import ThemesPage from "./pages/ThemesPage";
import ScreeningPage from "./pages/ScreeningPage";
import ChartPage from "./pages/ChartPage";
import NewsPage from "./pages/NewsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/market" element={<MarketPage />} />
          <Route path="/stocks" element={<StocksPage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/earnings" element={<EarningsPage />} />
          <Route path="/ipo" element={<IpoPage />} />
          <Route path="/themes" element={<ThemesPage />} />
          <Route path="/screening" element={<ScreeningPage />} />
          <Route path="/chart" element={<ChartPage />} />
          <Route path="/news" element={<NewsPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
