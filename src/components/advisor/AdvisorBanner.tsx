import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Bot,
  Compass,
  Cpu,
  FileSearch,
  TrendingUp,
} from "lucide-react";

export const AdvisorBanner = () => {
  return (
    <section className="relative overflow-hidden rounded-xl border border-border/80 bg-card p-4 shadow-xs sm:p-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="space-y-1.5">
          <h2 className="text-base font-black tracking-tight text-foreground sm:text-lg">
            投資銘柄に迷ったら？ 銘柄診断 & 投資シミュレーター
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
            「2銘柄の対決でどちらが割安？」「買い指値や損切りラインは？」「予算に合った新NISA配分は？」— 外部API不要で瞬時に判定できる意思決定シミュレーターや、3分スタイル診断、銘柄カルテをご利用いただけます。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/advisor?tab=simulator"
            className="inline-flex items-center gap-1.5 rounded-lg bg-header-accent px-3.5 py-2 text-xs font-bold text-header-bg shadow-sm hover:opacity-90 transition-opacity"
          >
            <Cpu className="h-3.5 w-3.5" />
            <span>投資シミュレーター</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            to="/advisor?tab=wizard"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background/80 px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <Compass className="h-3.5 w-3.5 text-header-accent" />
            <span>3分スタイル診断</span>
          </Link>
          <Link
            to="/advisor?tab=health"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background/80 px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <Activity className="h-3.5 w-3.5 text-blue-500" />
            <span>銘柄カルテ発行</span>
          </Link>
        </div>
      </div>
    </section>
  );
};
