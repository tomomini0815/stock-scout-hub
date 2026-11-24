import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

const SCROLL_THRESHOLD = 300;

const ScrollToTopButton = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const root = document.getElementById("root");

    const updateVisibility = () => {
      const rootTop = root ? root.scrollTop : 0;
      const winTop = window.scrollY || document.documentElement.scrollTop || 0;
      setVisible(Math.max(rootTop, winTop) > SCROLL_THRESHOLD);
    };

    updateVisibility();
    root?.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("scroll", updateVisibility, { passive: true });

    return () => {
      root?.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("scroll", updateVisibility);
    };
  }, []);

  const handleScrollTop = () => {
    const root = document.getElementById("root");
    root?.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={handleScrollTop}
      aria-label="ページ上部へ戻る"
      title="ページ上部へ戻る"
      className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-50 inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-full border border-border bg-primary px-3.5 text-xs font-bold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/50 sm:h-10 sm:min-w-10"
    >
      <ArrowUp className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">TOPへ</span>
    </button>
  );
};

export default ScrollToTopButton;

