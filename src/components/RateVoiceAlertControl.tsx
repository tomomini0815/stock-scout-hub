import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Plus, RotateCcw, Settings2, Trash2, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { marketIndices, type MarketIndex } from "@/data/stockData";
import { useLiveMarketData } from "@/hooks/useLiveMarketData";
import {
  ALL_VOICE_ALERT_TARGETS,
  buildPeriodicBriefingSpeech,
  buildSpikeSpeechText,
  computeSupportResistanceLevels,
  DEFAULT_VOICE_ALERT_SETTINGS,
  detectAutoRoundNumberCrosses,
  detectPriceLineCrosses,
  detectRateSpikes,
  detectSupportResistanceHits,
  formatSpokenPrice,
  getActiveIndexPrice,
  getAutoRoundStep,
  getJapaneseVoices,
  getPeriodicSlotKey,
  getSpokenIndexName,
  isInQuietHours,
  isSpeechSynthesisSupported,
  loadVoiceAlertSettings,
  playAlertChime,
  saveVoiceAlertSettings,
  speakJapaneseAlert,
  SR_CHART_SYMBOL_BY_INDEX,
  stopAllVoiceAlerts,
  unlockMobileAudio,
  VOICE_ALERT_EVENT_NAME,
  VOICE_ALERT_HISTORY_EVENT,
  type AutoRoundStepLevel,
  type ChimePreset,
  type PeriodicIntervalMinutes,
  type PriceLineAlert,
  type RateSpikeEvent,
  type RateVoiceAlertSettings,
  type SupportResistanceLevel,
  type SupportResistanceLookbackDays,
  type VoiceAlertStyle,
  type VoiceDirectionFilter,
} from "@/lib/rateVoiceAlert";

const SR_MARGIN_OPTIONS = [
  { label: "狭め (0.05%)", value: 0.05 },
  { label: "標準 (0.1%)", value: 0.1 },
  { label: "広め (0.2%)", value: 0.2 },
];

const SR_LOOKBACK_OPTIONS: Array<{ label: string; value: SupportResistanceLookbackDays }> = [
  { label: "直近60日", value: 60 },
  { label: "直近200日", value: 200 },
];

type SrCandle = { high: number; low: number; close: number };
const srCandlesCache = new Map<string, SrCandle[]>();
const srInflight = new Map<string, Promise<SrCandle[]>>();

const fetchSrCandles = (indexName: string): Promise<SrCandle[]> => {
  const cached = srCandlesCache.get(indexName);
  if (cached) return Promise.resolve(cached);
  const existing = srInflight.get(indexName);
  if (existing) return existing;

  const symbol = SR_CHART_SYMBOL_BY_INDEX[indexName];
  if (!symbol) return Promise.resolve([]);

  const req = fetch(`/api/stock-chart?symbol=${encodeURIComponent(symbol)}&range=2y&interval=1d`)
    .then((res) => (res.ok ? res.json() : null))
    .then((payload) => {
      const candles = Array.isArray(payload?.candles) ? (payload.candles as SrCandle[]) : [];
      if (candles.length > 0) srCandlesCache.set(indexName, candles);
      return candles;
    })
    .catch(() => [])
    .finally(() => {
      srInflight.delete(indexName);
    });

  srInflight.set(indexName, req);
  return req;
};

const formatSrLevelPrice = (indexName: string, price: number): string => {
  if (indexName === "USD/JPY") return price.toFixed(2);
  if (indexName === "TOPIX" || indexName === "S&P500") return price.toFixed(1);
  return Math.round(price).toLocaleString();
};

const useMultiIndexSrLevels = (
  indices: MarketIndex[],
  targets: string[],
  lookbackDays: SupportResistanceLookbackDays,
  enabled: boolean
): Record<string, SupportResistanceLevel[]> => {
  const [candlesByIndex, setCandlesByIndex] = useState<Record<string, SrCandle[]>>(() => {
    const init: Record<string, SrCandle[]> = {};
    srCandlesCache.forEach((v, k) => {
      init[k] = v;
    });
    return init;
  });

  const targetsKey = targets.join(",");

  useEffect(() => {
    if (!enabled || !targets.length) return;
    let active = true;

    targets.forEach((indexName) => {
      if (srCandlesCache.has(indexName)) {
        const cached = srCandlesCache.get(indexName)!;
        setCandlesByIndex((prev) => (prev[indexName] ? prev : { ...prev, [indexName]: cached }));
        return;
      }
      void fetchSrCandles(indexName).then((candles) => {
        if (!active || !candles.length) return;
        setCandlesByIndex((prev) => ({ ...prev, [indexName]: candles }));
      });
    });

    return () => {
      active = false;
    };
  }, [enabled, targetsKey]);

  return useMemo(() => {
    if (!enabled) return {};
    const result: Record<string, SupportResistanceLevel[]> = {};
    for (const indexName of targets) {
      const candles = candlesByIndex[indexName];
      const idx = indices.find((item) => item.name === indexName);
      if (!candles?.length || !idx) continue;
      const currentPrice = getActiveIndexPrice(idx);
      if (!Number.isFinite(currentPrice) || currentPrice <= 0) continue;
      result[indexName] = computeSupportResistanceLevels(
        indexName,
        candles,
        currentPrice,
        lookbackDays
      );
    }
    return result;
  }, [candlesByIndex, indices, targetsKey, lookbackDays, enabled]);
};

const PERIODIC_OPTIONS: Array<{ label: string; value: PeriodicIntervalMinutes }> = [
  { label: "OFF", value: 0 },
  { label: "15分ごと", value: 15 },
  { label: "30分ごと", value: 30 },
  { label: "1時間ごと", value: 60 },
];

const CHIME_OPTIONS: Array<{ label: string; value: ChimePreset }> = [
  { label: "ニュース速報（くっきり3音）", value: "news" },
  { label: "ベル（明瞭2音）", value: "bell" },
  { label: "ピコン（電子音）", value: "radar" },
  { label: "コイン（軽快）", value: "coin" },
  { label: "やわらかい（ソフト）", value: "soft" },
  { label: "なし（音声のみ）", value: "none" },
];

const VOICEVOX_SPEAKERS = [
  { label: "ずんだもん（あまあま）", id: 1 },
  { label: "ずんだもん（ノーマル）", id: 3 },
  { label: "四国めたん（あまあま）", id: 0 },
  { label: "春日部つむぎ（元気）", id: 8 },
  { label: "雨晴はう（やさしい）", id: 10 },
];

const THRESHOLD_OPTIONS = [
  { label: "0.2%（敏感）", value: 0.2 },
  { label: "0.3%（標準）", value: 0.3 },
  { label: "0.5%（大きめ）", value: 0.5 },
  { label: "1.0%（急変のみ）", value: 1.0 },
];

const DIRECTION_OPTIONS: Array<{ label: string; value: VoiceDirectionFilter }> = [
  { label: "上昇・下落どちらも", value: "both" },
  { label: "急上昇のみ", value: "up" },
  { label: "急落のみ", value: "down" },
];

const STYLE_OPTIONS: Array<{ label: string; desc: string; value: VoiceAlertStyle }> = [
  { label: "超簡潔", desc: "2〜3秒で要点のみ", value: "short" },
  { label: "標準", desc: "速報＋価格＋変動率", value: "standard" },
  { label: "詳細", desc: "前日比も含めて案内", value: "detailed" },
  { label: "カスタム", desc: "自由テンプレート", value: "custom" },
];

const TEMPLATE_TOKENS = ["{銘柄}", "{方向}", "{価格}", "{変動率}", "{前日比}", "{時刻}"];

/**
 * アプリ全体でレート急変・価格ライン到達をバックグラウンド監視し、音声読み上げ＋トースト通知を行うマネージャー
 */
export const RateVoiceAlertManager = () => {
  const { indices, status } = useLiveMarketData(marketIndices);
  const [settings, setSettings] = useState<RateVoiceAlertSettings>(() => loadVoiceAlertSettings());
  const previousPricesRef = useRef<Record<string, number>>({});
  const lastAlertAtRef = useRef<Record<string, number>>({});
  const lastRoundAtRef = useRef<Record<string, number>>({});
  const lastSrAtRef = useRef<Record<string, number>>({});
  const lastPeriodicSlotRef = useRef<string>("");
  const latestIndicesRef = useRef<MarketIndex[]>(indices);
  const hasSeededRef = useRef(false);

  const srLevelsByIndex = useMultiIndexSrLevels(
    indices,
    settings.srTargets,
    settings.srLookbackDays,
    settings.enabled && settings.srEnabled
  );

  useEffect(() => {
    latestIndicesRef.current = indices;
  }, [indices]);

  // 時間ごとの定時読み上げスケジューラ（20秒ごとにJST正時・区切りをチェック）
  useEffect(() => {
    if (!settings.enabled || !settings.periodicIntervalMinutes) return;

    const checkPeriodic = () => {
      const now = new Date();
      if (isInQuietHours(settings, now)) return;
      const slotKey = getPeriodicSlotKey(settings.periodicIntervalMinutes, now);
      if (!slotKey || lastPeriodicSlotRef.current === slotKey) return;
      lastPeriodicSlotRef.current = slotKey;

      const currentIndices = latestIndicesRef.current;
      if (!currentIndices.length) return;
      const speechText = buildPeriodicBriefingSpeech(currentIndices, settings, now);

      speakJapaneseAlert(speechText, {
        rate: settings.speechRate,
        volume: settings.volume,
        pitch: settings.pitch,
        voiceName: settings.voiceName,
        chime: settings.chimePreset !== "none" ? "up" : false,
        chimePreset: settings.chimePreset,
        voiceCharacter: settings.voiceCharacter,
        useVoicevox: settings.useVoicevox,
        voicevoxSpeakerId: settings.voicevoxSpeakerId,
      });

      const ev: RateSpikeEvent = {
        id: `periodic-${slotKey}`,
        kind: "periodic",
        indexName: "定時レポート",
        displayName: "定時レポート",
        price: 0,
        prevPrice: 0,
        deltaPercent: 0,
        direction: "up",
        speechText,
        detectedAt: now.toISOString(),
      };
      toast("定時レート読み上げ", { description: speechText, duration: 6000 });
      window.dispatchEvent(new CustomEvent(VOICE_ALERT_HISTORY_EVENT, { detail: [ev] }));
    };

    const timer = window.setInterval(checkPeriodic, 20 * 1000);
    return () => window.clearInterval(timer);
  }, [settings]);

  useEffect(() => {
    const onSettingsChange = (event: Event) => {
      const custom = event as CustomEvent<RateVoiceAlertSettings>;
      if (custom.detail) {
        setSettings(custom.detail);
      } else {
        setSettings(loadVoiceAlertSettings());
      }
    };
    window.addEventListener(VOICE_ALERT_EVENT_NAME, onSettingsChange);
    return () => window.removeEventListener(VOICE_ALERT_EVENT_NAME, onSettingsChange);
  }, []);

  useEffect(() => {
    if (status !== "live" || !indices.length) return;

    const currentPriceMap: Record<string, number> = {};
    for (const item of indices) {
      currentPriceMap[item.name] = getActiveIndexPrice(item);
    }

    if (!hasSeededRef.current) {
      previousPricesRef.current = currentPriceMap;
      hasSeededRef.current = true;
      return;
    }

    if (settings.enabled) {
      const nowMs = Date.now();
      const spikes = detectRateSpikes(
        indices,
        previousPricesRef.current,
        settings,
        lastAlertAtRef.current,
        nowMs
      );
      const lineCrosses = detectPriceLineCrosses(indices, settings, nowMs);
      const autoRounds = detectAutoRoundNumberCrosses(
        indices,
        previousPricesRef.current,
        settings,
        lastRoundAtRef.current,
        nowMs
      );
      const srHits = detectSupportResistanceHits(
        indices,
        previousPricesRef.current,
        srLevelsByIndex,
        settings,
        lastSrAtRef.current,
        nowMs
      );

      const allEvents = [...lineCrosses, ...srHits, ...autoRounds, ...spikes];
      if (allEvents.length > 0) {
        spikes.forEach((s) => {
          lastAlertAtRef.current[s.indexName] = nowMs;
        });
        autoRounds.forEach((r) => {
          if (r.alertId) lastRoundAtRef.current[r.alertId] = nowMs;
        });
        srHits.forEach((sr) => {
          if (sr.alertId) lastSrAtRef.current[sr.alertId] = nowMs;
        });

        // 到達した価格ラインアラートは triggered = true にして連続鳴動を防ぐ
        if (lineCrosses.length > 0) {
          const hitIds = new Set(lineCrosses.map((e) => e.alertId).filter(Boolean));
          const updatedSettings: RateVoiceAlertSettings = {
            ...settings,
            priceAlerts: settings.priceAlerts.map((a) =>
              hitIds.has(a.id) ? { ...a, triggered: true } : a
            ),
          };
          saveVoiceAlertSettings(updatedSettings);
        }

        const topEvent = allEvents[0];
        const combinedSpeech = allEvents
          .slice(0, 2)
          .map((e) => e.speechText)
          .join(" ");

        speakJapaneseAlert(combinedSpeech, {
          rate: settings.speechRate,
          volume: settings.volume,
          pitch: settings.pitch,
          voiceName: settings.voiceName,
          chime: settings.chimePreset !== "none" ? topEvent.direction : false,
          chimePreset: settings.chimePreset,
          voiceCharacter: settings.voiceCharacter,
          useVoicevox: settings.useVoicevox,
          voicevoxSpeakerId: settings.voicevoxSpeakerId,
        });

        toast(
          topEvent.kind === "price-line"
            ? `価格アラート: ${topEvent.displayName}`
            : topEvent.kind === "sr-line"
              ? `サポレジ到達: ${topEvent.displayName}`
              : topEvent.kind === "auto-round"
                ? `オートキリ番: ${topEvent.displayName}`
                : `${topEvent.displayName} ${topEvent.direction === "up" ? "急上昇" : "急落"} (${
                    topEvent.deltaPercent >= 0 ? "+" : ""
                  }${topEvent.deltaPercent.toFixed(2)}%)`,
          {
            description: topEvent.speechText,
            duration: 6000,
          }
        );

        window.dispatchEvent(new CustomEvent(VOICE_ALERT_HISTORY_EVENT, { detail: allEvents }));
      }
    }

    previousPricesRef.current = currentPriceMap;
  }, [indices, status, settings, srLevelsByIndex]);

  return null;
};

interface RateVoiceAlertControlProps {
  indices: MarketIndex[];
}

export const RateVoiceAlertControl = ({ indices }: RateVoiceAlertControlProps) => {
  const [settings, setSettings] = useState<RateVoiceAlertSettings>(() => loadVoiceAlertSettings());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"monitor" | "voice" | "lines">("monitor");
  const [history, setHistory] = useState<RateSpikeEvent[]>([]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [newLineIndex, setNewLineIndex] = useState<string>("USD/JPY");
  const [newLinePrice, setNewLinePrice] = useState<string>("");
  const [newLineCondition, setNewLineCondition] = useState<"above" | "below">("above");
  const [testTargetName, setTestTargetName] = useState<string>("日経平均");
  const supported = isSpeechSynthesisSupported();
  const srLevelsByIndex = useMultiIndexSrLevels(
    indices,
    settings.srTargets,
    settings.srLookbackDays,
    dialogOpen && settings.srEnabled
  );

  useEffect(() => {
    const syncVoices = () => setVoices(getJapaneseVoices());
    syncVoices();
    if (supported) {
      window.speechSynthesis.addEventListener?.("voiceschanged", syncVoices);
    }
    return () => {
      if (supported) {
        window.speechSynthesis.removeEventListener?.("voiceschanged", syncVoices);
      }
    };
  }, [supported]);

  useEffect(() => {
    const onSettingsChange = (event: Event) => {
      const custom = event as CustomEvent<RateVoiceAlertSettings>;
      if (custom.detail) setSettings(custom.detail);
    };
    const onHistory = (event: Event) => {
      const custom = event as CustomEvent<RateSpikeEvent[]>;
      if (Array.isArray(custom.detail)) {
        setHistory((prev) => [...custom.detail, ...prev].slice(0, 8));
      }
    };
    window.addEventListener(VOICE_ALERT_EVENT_NAME, onSettingsChange);
    window.addEventListener(VOICE_ALERT_HISTORY_EVENT, onHistory);
    return () => {
      window.removeEventListener(VOICE_ALERT_EVENT_NAME, onSettingsChange);
      window.removeEventListener(VOICE_ALERT_HISTORY_EVENT, onHistory);
    };
  }, []);

  const updateSettings = (next: RateVoiceAlertSettings) => {
    setSettings(next);
    saveVoiceAlertSettings(next);
  };

  const sampleIndex = useMemo(
    () => indices.find((item) => item.name === testTargetName) ?? indices[0] ?? marketIndices[0],
    [indices, testTargetName]
  );

  const previewUpText = useMemo(
    () => buildSpikeSpeechText(sampleIndex, getActiveIndexPrice(sampleIndex), 0.45, settings),
    [sampleIndex, settings]
  );

  const quietNow = isInQuietHours(settings);

  const handleToggle = () => {
    if (!supported && !settings.useVoicevox) {
      toast.error("お使いのブラウザは音声読み上げ機能に対応していません。");
      return;
    }
    const nextEnabled = !settings.enabled;
    const next = { ...settings, enabled: nextEnabled };
    updateSettings(next);

    if (nextEnabled) {
      unlockMobileAudio();
      const briefing = buildPeriodicBriefingSpeech(indices, next);
      speakJapaneseAlert(
        `音声読み上げをオンにしました。監視対象は${next.targets.length}銘柄です。${briefing}`,
        {
          rate: next.speechRate,
          volume: next.volume,
          pitch: next.pitch,
          voiceName: next.voiceName,
          chime: next.chimePreset !== "none" ? "up" : false,
          chimePreset: next.chimePreset,
          voiceCharacter: next.voiceCharacter,
          useVoicevox: next.useVoicevox,
          voicevoxSpeakerId: next.voicevoxSpeakerId,
        }
      );
    } else {
      stopAllVoiceAlerts();
    }
  };

  const handleTestSpeak = (direction: "up" | "down") => {
    if (!supported && !settings.useVoicevox) {
      toast.error("お使いのブラウザは音声読み上げ機能に対応していません。");
      return;
    }
    unlockMobileAudio();
    const text = buildSpikeSpeechText(
      sampleIndex,
      getActiveIndexPrice(sampleIndex),
      direction === "up" ? 0.45 : -0.45,
      settings
    );
    speakJapaneseAlert(text, {
      rate: settings.speechRate,
      volume: settings.volume,
      pitch: settings.pitch,
      voiceName: settings.voiceName,
      chime: settings.chimePreset !== "none" ? direction : false,
      chimePreset: settings.chimePreset,
      voiceCharacter: settings.voiceCharacter,
      useVoicevox: settings.useVoicevox,
      voicevoxSpeakerId: settings.voicevoxSpeakerId,
    });
  };

  const toggleTarget = (name: string) => {
    const exists = settings.targets.includes(name);
    const nextTargets = exists
      ? settings.targets.filter((t) => t !== name)
      : [...settings.targets, name];
    if (nextTargets.length === 0) return;
    updateSettings({ ...settings, targets: nextTargets });
  };

  const toggleSrTarget = (name: string) => {
    const exists = settings.srTargets.includes(name);
    const nextTargets = exists
      ? settings.srTargets.filter((t) => t !== name)
      : [...settings.srTargets, name];
    if (nextTargets.length === 0) return;
    updateSettings({ ...settings, srTargets: nextTargets });
  };

  const handleAddPriceAlert = () => {
    const parsed = Number(newLinePrice.replace(/,/g, "").trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("有効な価格を入力してください。");
      return;
    }
    const nextAlert: PriceLineAlert = {
      id: `${newLineIndex}-${parsed}-${Date.now()}`,
      indexName: newLineIndex,
      targetPrice: parsed,
      condition: newLineCondition,
      triggered: false,
    };
    updateSettings({
      ...settings,
      priceAlerts: [nextAlert, ...settings.priceAlerts],
    });
    setNewLinePrice("");
  };

  const handleRemovePriceAlert = (id: string) => {
    updateSettings({
      ...settings,
      priceAlerts: settings.priceAlerts.filter((a) => a.id !== id),
    });
  };

  const handleResetTriggered = (id: string) => {
    updateSettings({
      ...settings,
      priceAlerts: settings.priceAlerts.map((a) =>
        a.id === id ? { ...a, triggered: false } : a
      ),
    });
  };

  const handleResetAll = () => {
    updateSettings({ ...DEFAULT_VOICE_ALERT_SETTINGS, enabled: settings.enabled });
    toast("音声読み上げ設定を初期値に戻しました。");
  };

  const activeLineCount = settings.priceAlerts.filter((a) => !a.triggered).length;

  return (
    <>
      <div className="inline-flex h-7 items-center overflow-hidden rounded border border-border bg-background">
        <button
          type="button"
          onClick={handleToggle}
          className={`inline-flex h-full items-center gap-1 px-2 text-xxs font-bold transition-colors ${
            settings.enabled
              ? "bg-primary text-primary-foreground"
              : "text-foreground/80 hover:bg-muted"
          }`}
          title={
            settings.enabled
              ? quietNow
                ? "音声ON（現在は静音時間帯）"
                : "レート急変の音声読み上げをオフにする"
              : "レート急変時に音声で読み上げる"
          }
        >
          {settings.enabled ? (
            <Volume2 className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <VolumeX className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className="whitespace-nowrap">
            音声{settings.enabled ? (quietNow ? "静音中" : "ON") : "OFF"}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          aria-label="音声読み上げの詳細設定を開く"
          title="音声読み上げの詳細設定"
          className="inline-flex h-full items-center gap-1 border-l border-border px-1.5 text-xxs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Settings2 className="h-3 w-3" />
          {activeLineCount > 0 && (
            <span className="rounded bg-primary/15 px-1 text-[10px] font-bold text-primary">
              {activeLineCount}
            </span>
          )}
        </button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[86vh] w-[94vw] max-w-xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-border bg-table-header-bg px-5 py-3.5 pr-11 text-left">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-sm sm:text-base font-extrabold text-foreground">
                レート急変 音声読み上げカスタマイズ
              </DialogTitle>
              <button
                type="button"
                onClick={handleToggle}
                className={`rounded border px-2 py-0.5 text-xxs font-bold transition-colors ${
                  settings.enabled
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {settings.enabled ? "ON（監視中）" : "OFF"}
              </button>
            </div>
            <DialogDescription className="text-xxs text-muted-foreground">
              読み上げ文面・声・チャイム音・価格ライン・静音時間帯を自由に設定できます。
            </DialogDescription>
          </DialogHeader>

          {/* タブ切替 */}
          <div className="flex border-b border-border bg-muted/20 px-4 pt-2 text-xs font-bold">
            {(
              [
                { id: "monitor", label: "1. 監視・静音" },
                { id: "voice", label: "2. 文面・声・音" },
                {
                  id: "lines",
                  label: `3. 価格ライン${settings.priceAlerts.length ? ` (${settings.priceAlerts.length})` : ""}`,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`border-b-2 px-3 py-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="always-scrollbar flex-1 space-y-4 px-5 py-4 text-xs">
            {activeTab === "monitor" && (
              <>
                {/* 急変しきい値 */}
                <div>
                  <div className="mb-1.5 font-bold text-foreground">急変の判定基準（1分あたりの変動率）</div>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {THRESHOLD_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateSettings({ ...settings, thresholdPercent: opt.value })}
                        className={`rounded border px-2 py-1.5 text-xxs font-bold transition-colors ${
                          settings.thresholdPercent === opt.value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-foreground/80 hover:bg-muted"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 方向フィルター */}
                <div>
                  <div className="mb-1.5 font-bold text-foreground">読み上げる方向</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {DIRECTION_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateSettings({ ...settings, directionFilter: opt.value })}
                        className={`rounded border px-2 py-1.5 text-xxs font-bold transition-colors ${
                          settings.directionFilter === opt.value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-foreground/80 hover:bg-muted"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 監視対象 */}
                <div>
                  <div className="mb-1.5 font-bold text-foreground">監視する銘柄（タップでON/OFF）</div>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_VOICE_ALERT_TARGETS.map((name) => {
                      const active = settings.targets.includes(name);
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => toggleTarget(name)}
                          className={`rounded border px-2.5 py-1 text-xxs font-bold transition-colors ${
                            active
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border bg-muted/40 text-muted-foreground"
                          }`}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 時間ごとの定時読み上げ */}
                <div className="rounded-md border border-border bg-muted/20 p-3">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-foreground">時間ごとの定時読み上げ</div>
                      <div className="text-xxs text-muted-foreground">
                        毎正時や30分ごとなど、定期的に主要レートをまとめて読み上げます
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        unlockMobileAudio();
                        const text = buildPeriodicBriefingSpeech(indices, settings);
                        speakJapaneseAlert(text, {
                          rate: settings.speechRate,
                          volume: settings.volume,
                          pitch: settings.pitch,
                          voiceName: settings.voiceName,
                          chime: settings.chimePreset !== "none" ? "up" : false,
                          chimePreset: settings.chimePreset,
                          voiceCharacter: settings.voiceCharacter,
                          useVoicevox: settings.useVoicevox,
                          voicevoxSpeakerId: settings.voicevoxSpeakerId,
                        });
                      }}
                      className="inline-flex shrink-0 items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xxs font-bold text-primary hover:bg-muted"
                    >
                      <Play className="h-2.5 w-2.5" />
                      定時テスト
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {PERIODIC_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          updateSettings({ ...settings, periodicIntervalMinutes: opt.value })
                        }
                        className={`rounded border px-2 py-1.5 text-xxs font-bold transition-colors ${
                          settings.periodicIntervalMinutes === opt.value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-foreground/80 hover:bg-muted"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 静音時間帯（おやすみモード） */}
                <div className="rounded-md border border-border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-foreground">静音時間帯（おやすみモード）</div>
                      <div className="text-xxs text-muted-foreground">
                        指定した時間帯（日本時間）は自動で音声を鳴らしません
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateSettings({ ...settings, quietHoursEnabled: !settings.quietHoursEnabled })
                      }
                      className={`shrink-0 rounded border px-2.5 py-1 text-xxs font-bold transition-colors ${
                        settings.quietHoursEnabled
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground"
                      }`}
                    >
                      {settings.quietHoursEnabled ? "ON" : "OFF"}
                    </button>
                  </div>
                  {settings.quietHoursEnabled && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xxs">
                      <label className="flex items-center gap-1.5 font-semibold text-foreground">
                        開始
                        <input
                          type="time"
                          value={settings.quietStart}
                          onChange={(e) => updateSettings({ ...settings, quietStart: e.target.value })}
                          className="rounded border border-border bg-background px-2 py-1 font-mono text-xs"
                        />
                      </label>
                      <span className="text-muted-foreground">〜</span>
                      <label className="flex items-center gap-1.5 font-semibold text-foreground">
                        終了
                        <input
                          type="time"
                          value={settings.quietEnd}
                          onChange={(e) => updateSettings({ ...settings, quietEnd: e.target.value })}
                          className="rounded border border-border bg-background px-2 py-1 font-mono text-xs"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === "voice" && (
              <>
                {/* キャラクター・口調（標準 / ずんだもん風） */}
                <div className="rounded-md border border-border bg-muted/20 p-3 space-y-2">
                  <div className="font-bold text-foreground">声のキャラクター・口調</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        updateSettings({
                          ...settings,
                          voiceCharacter: "normal",
                          pitch: 1.0,
                        })
                      }
                      className={`rounded border px-2.5 py-1.5 text-left transition-colors ${
                        settings.voiceCharacter === "normal"
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground/85 hover:bg-muted"
                      }`}
                    >
                      <div className="text-xxs font-bold">標準アナウンサー</div>
                      <div
                        className={`text-[10px] ${
                          settings.voiceCharacter === "normal"
                            ? "text-primary-foreground/85"
                            : "text-muted-foreground"
                        }`}
                      >
                        落ち着いたニュース口調
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateSettings({
                          ...settings,
                          voiceCharacter: "zunda",
                          pitch: 1.75,
                          speechRate: Math.max(settings.speechRate, 1.2),
                        })
                      }
                      className={`rounded border px-2.5 py-1.5 text-left transition-colors ${
                        settings.voiceCharacter === "zunda"
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-border bg-background text-foreground/85 hover:bg-muted"
                      }`}
                    >
                      <div className="text-xxs font-bold">高め・キュート声</div>
                      <div
                        className={`text-[10px] ${
                          settings.voiceCharacter === "zunda"
                            ? "text-white/90"
                            : "text-muted-foreground"
                        }`}
                      >
                        高めピッチ＋軽快テンポ（標準語尾）
                      </div>
                    </button>
                  </div>

                  <div className="space-y-1.5 rounded border border-border bg-background p-2 text-[10px]">
                    <label className="flex cursor-pointer items-center justify-between gap-2">
                      <span className="text-foreground/85">
                        <strong>VOICEVOX アニメ音声（PC・スマホ対応）</strong>（本番・スマホはWEB版VOICEVOXで自動再生／PCアプリ起動時はローカル優先）
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.useVoicevox}
                        onChange={(e) =>
                          updateSettings({ ...settings, useVoicevox: e.target.checked })
                        }
                        className="shrink-0 accent-emerald-600"
                      />
                    </label>
                    {settings.useVoicevox && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="shrink-0 font-bold text-muted-foreground">キャラ:</span>
                        <select
                          value={settings.voicevoxSpeakerId}
                          onChange={(e) =>
                            updateSettings({
                              ...settings,
                              voicevoxSpeakerId: Number(e.target.value),
                            })
                          }
                          className="h-7 flex-1 rounded border border-border bg-background px-2 text-xxs text-foreground"
                        >
                          {VOICEVOX_SPEAKERS.map((sp) => (
                            <option key={sp.id} value={sp.id}>
                              {sp.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* 読み上げスタイル */}
                <div>
                  <div className="mb-1.5 font-bold text-foreground">読み上げスタイル</div>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {STYLE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateSettings({ ...settings, style: opt.value })}
                        className={`rounded border px-2 py-1.5 text-left transition-colors ${
                          settings.style === opt.value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-foreground/85 hover:bg-muted"
                        }`}
                      >
                        <div className="text-xxs font-bold">{opt.label}</div>
                        <div
                          className={`text-[10px] ${
                            settings.style === opt.value
                              ? "text-primary-foreground/85"
                              : "text-muted-foreground"
                          }`}
                        >
                          {opt.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 読み上げ項目チェック（カスタム以外） */}
                {settings.style !== "custom" ? (
                  <div>
                    <div className="mb-1.5 font-bold text-foreground">読み上げる項目</div>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          { key: "includePrice", label: "現在価格" },
                          { key: "includeDelta", label: "直近変動率" },
                          { key: "includeDailyChange", label: "前日比" },
                          { key: "includeTime", label: "現在時刻" },
                        ] as const
                      ).map((item) => (
                        <label
                          key={item.key}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-border bg-background px-2.5 py-1 text-xxs font-semibold"
                        >
                          <input
                            type="checkbox"
                            checked={settings[item.key]}
                            onChange={(e) =>
                              updateSettings({ ...settings, [item.key]: e.target.checked })
                            }
                            className="accent-primary"
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="mb-1 font-bold text-foreground">カスタム読み上げテンプレート</div>
                    <textarea
                      rows={2}
                      value={settings.customTemplate}
                      onChange={(e) => updateSettings({ ...settings, customTemplate: e.target.value })}
                      className="w-full rounded border border-border bg-background p-2 text-xs text-foreground focus:border-primary focus:outline-none"
                      placeholder="例: 速報。{銘柄}が{方向}。現在{価格}、直近比{変動率}。"
                    />
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">挿入:</span>
                      {TEMPLATE_TOKENS.map((token) => (
                        <button
                          key={token}
                          type="button"
                          onClick={() =>
                            updateSettings({
                              ...settings,
                              customTemplate: `${settings.customTemplate}${token}`,
                            })
                          }
                          className="rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-foreground hover:bg-muted"
                        >
                          {token}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* リアルタイム文面プレビュー */}
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
                  <div className="text-[10px] font-bold text-muted-foreground">読み上げプレビュー</div>
                  <div className="mt-0.5 text-xs font-semibold text-foreground">{previewUpText}</div>
                </div>

                {/* 声・チャイム・スライダー */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block font-bold text-foreground">声（ボイス）</label>
                    <select
                      value={settings.voiceName}
                      onChange={(e) => updateSettings({ ...settings, voiceName: e.target.value })}
                      className="h-8 w-full rounded border border-border bg-background px-2 text-xs text-foreground"
                    >
                      <option value="">自動（おすすめ日本語音声）</option>
                      {voices.map((v) => (
                        <option key={v.name} value={v.name}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block font-bold text-foreground">
                      先頭チャイム音（上昇＝高音 / 下落＝低音）
                    </label>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={settings.chimePreset}
                        onChange={(e) => {
                          const preset = e.target.value as ChimePreset;
                          updateSettings({
                            ...settings,
                            chimePreset: preset,
                            chimeEnabled: preset !== "none",
                          });
                          if (preset !== "none") {
                            playAlertChime("up", settings.volume, preset);
                          }
                        }}
                        className="h-8 flex-1 rounded border border-border bg-background px-2 text-xs text-foreground"
                      >
                        {CHIME_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={settings.chimePreset === "none"}
                        onClick={() => playAlertChime("up", settings.volume, settings.chimePreset)}
                        className="inline-flex h-8 shrink-0 items-center gap-1 rounded border border-border bg-background px-2 text-xxs font-bold text-primary hover:bg-muted disabled:opacity-40"
                        title="チャイム音を視聴"
                      >
                        <Play className="h-3 w-3" />
                        視聴
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <div className="mb-1 flex justify-between text-xxs font-bold">
                      <span>速度</span>
                      <span className="tabular-nums text-primary">{settings.speechRate.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.7}
                      max={1.5}
                      step={0.05}
                      value={settings.speechRate}
                      onChange={(e) =>
                        updateSettings({ ...settings, speechRate: Number(e.target.value) })
                      }
                      className="w-full accent-primary"
                    />
                  </div>

                  <div>
                    <div className="mb-1 flex justify-between text-xxs font-bold">
                      <span>音量</span>
                      <span className="tabular-nums text-primary">{Math.round(settings.volume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={1.0}
                      step={0.05}
                      value={settings.volume}
                      onChange={(e) =>
                        updateSettings({ ...settings, volume: Number(e.target.value) })
                      }
                      className="w-full accent-primary"
                    />
                  </div>

                  <div>
                    <div className="mb-1 flex justify-between text-xxs font-bold">
                      <span>声の高さ</span>
                      <span className="tabular-nums text-primary">{settings.pitch.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.75}
                      max={2.0}
                      step={0.05}
                      value={settings.pitch}
                      onChange={(e) =>
                        updateSettings({ ...settings, pitch: Number(e.target.value) })
                      }
                      className="w-full accent-primary"
                    />
                  </div>
                </div>
              </>
            )}

            {activeTab === "lines" && (
              <>
                {/* オートキリ番（指定なし自動検知＋スライダー調整） */}
                <div className="rounded-md border border-border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-foreground">オートキリ番（指定なしで自動読み上げ）</div>
                      <div className="text-xxs text-muted-foreground">
                        価格を手動入力しなくても、節目の価格帯を通過したら自動で読み上げます
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateSettings({
                          ...settings,
                          autoRoundNumbersEnabled: !settings.autoRoundNumbersEnabled,
                        })
                      }
                      className={`shrink-0 rounded border px-2.5 py-1 text-xxs font-bold transition-colors ${
                        settings.autoRoundNumbersEnabled
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground"
                      }`}
                    >
                      {settings.autoRoundNumbersEnabled ? "ON" : "OFF"}
                    </button>
                  </div>
                  {settings.autoRoundNumbersEnabled && (
                    <div className="mt-2.5 space-y-2 border-t border-border/60 pt-2">
                      <div className="flex items-center justify-between text-xxs font-bold">
                        <span>節目の広さ</span>
                        <span className="text-primary">
                          {settings.autoRoundStepLevel === 1
                            ? "とても細かい"
                            : settings.autoRoundStepLevel === 1.5
                              ? "細かい"
                              : settings.autoRoundStepLevel === 2.5
                                ? "やや大きい"
                                : settings.autoRoundStepLevel === 3
                                  ? "大きな節目のみ"
                                  : "標準"}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.5}
                        value={settings.autoRoundStepLevel}
                        onChange={(e) =>
                          updateSettings({
                            ...settings,
                            autoRoundStepLevel: Number(e.target.value) as AutoRoundStepLevel,
                          })
                        }
                        onInput={(e) =>
                          updateSettings({
                            ...settings,
                            autoRoundStepLevel: Number(
                              (e.target as HTMLInputElement).value
                            ) as AutoRoundStepLevel,
                          })
                        }
                        className="h-2 w-full cursor-pointer accent-primary"
                      />
                      <div className="grid grid-cols-5 gap-1 text-[10px]">
                        {(
                          [
                            { value: 1, label: "超細かい" },
                            { value: 1.5, label: "細かい" },
                            { value: 2, label: "標準" },
                            { value: 2.5, label: "やや大" },
                            { value: 3, label: "大きい" },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              updateSettings({
                                ...settings,
                                autoRoundStepLevel: opt.value,
                              })
                            }
                            className={`rounded border px-1 py-0.5 font-bold transition-colors ${
                              settings.autoRoundStepLevel === opt.value
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        目安: 日経 {getAutoRoundStep("日経平均", settings.autoRoundStepLevel).toLocaleString()}円 / ドル円 {getAutoRoundStep("USD/JPY", settings.autoRoundStepLevel)}円 / BTC {getAutoRoundStep("BTC/USDT", settings.autoRoundStepLevel).toLocaleString()}ドルごと
                      </p>
                    </div>
                  )}
                </div>

                {/* 全銘柄対応 自動サポレジライン到達読み上げ（60日 / 200日） */}
                <div className="rounded-md border border-border bg-muted/20 p-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-foreground">
                        サポレジライン自動監視（{settings.srLookbackDays}日）
                      </div>
                      <div className="text-xxs text-muted-foreground">
                        選択した銘柄の直近{settings.srLookbackDays}日高値・安値から抵抗線/支持線を自動算出し、接近・突破時に読み上げます
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateSettings({
                          ...settings,
                          srEnabled: !settings.srEnabled,
                          usdJpySrEnabled: !settings.srEnabled,
                        })
                      }
                      className={`shrink-0 rounded border px-2.5 py-1 text-xxs font-bold transition-colors ${
                        settings.srEnabled
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground"
                      }`}
                    >
                      {settings.srEnabled ? "ON" : "OFF"}
                    </button>
                  </div>

                  {settings.srEnabled && (
                    <>
                      {/* 算出期間（60日 / 200日） */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2">
                        <span className="text-xxs font-bold text-foreground">算出期間</span>
                        <div className="inline-flex gap-1">
                          {SR_LOOKBACK_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() =>
                                updateSettings({ ...settings, srLookbackDays: opt.value })
                              }
                              className={`rounded border px-2.5 py-1 text-xxs font-bold transition-colors ${
                                settings.srLookbackDays === opt.value
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background text-foreground/80 hover:bg-muted"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 監視銘柄選択 */}
                      <div>
                        <div className="mb-1 text-xxs font-bold text-foreground">
                          サポレジ監視する銘柄（タップでON/OFF）
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {ALL_VOICE_ALERT_TARGETS.map((name) => {
                            const active = settings.srTargets.includes(name);
                            return (
                              <button
                                key={name}
                                type="button"
                                onClick={() => toggleSrTarget(name)}
                                className={`rounded border px-2 py-0.5 text-[10px] font-bold transition-colors ${
                                  active
                                    ? "border-primary/40 bg-primary/10 text-primary"
                                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                                }`}
                              >
                                {name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 選択銘柄ごとのサポレジ一覧 */}
                      <div className="space-y-2">
                        {settings.srTargets.map((targetName) => {
                          const targetIdx = indices.find((item) => item.name === targetName);
                          const currentPrice = targetIdx ? getActiveIndexPrice(targetIdx) : 0;
                          const levels = srLevelsByIndex[targetName] ?? [];
                          return (
                            <div
                              key={targetName}
                              className="rounded border border-border/70 bg-background/80 p-2 space-y-1.5"
                            >
                              <div className="flex items-center justify-between text-xxs">
                                <span className="font-bold text-foreground">{targetName}</span>
                                {currentPrice > 0 && (
                                  <span className="font-mono text-[10px] font-semibold text-muted-foreground tabular-nums">
                                    現在: {formatSrLevelPrice(targetName, currentPrice)}
                                  </span>
                                )}
                              </div>
                              {levels.length > 0 ? (
                                <div className="grid grid-cols-2 gap-1">
                                  {levels.map((lv) => {
                                    const diffPct =
                                      currentPrice > 0
                                        ? ((lv.price - currentPrice) / currentPrice) * 100
                                        : 0;
                                    return (
                                      <div
                                        key={lv.id}
                                        className={`flex items-center justify-between rounded border px-2 py-0.5 text-[10px] ${
                                          lv.kind === "resistance"
                                            ? "border-red-200 bg-red-50/70 text-red-800"
                                            : "border-blue-200 bg-blue-50/70 text-blue-800"
                                        }`}
                                      >
                                        <span className="font-bold">
                                          {lv.label.replace("上値抵抗線 ", "").replace("下値支持線 ", "")}
                                        </span>
                                        <span className="font-mono font-extrabold tabular-nums">
                                          {formatSrLevelPrice(targetName, lv.price)}
                                          {currentPrice > 0 && (
                                            <span className="ml-1 font-semibold opacity-75">
                                              ({diffPct >= 0 ? "+" : ""}
                                              {diffPct.toFixed(1)}%)
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-[10px] text-muted-foreground">
                                  直近{settings.srLookbackDays}日チャートから算出中...
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-muted-foreground">通知範囲:</span>
                          {SR_MARGIN_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() =>
                                updateSettings({ ...settings, srMarginPercent: opt.value })
                              }
                              className={`rounded border px-2 py-0.5 text-[10px] font-bold transition-colors ${
                                settings.srMarginPercent === opt.value
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background text-foreground/80 hover:bg-muted"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            unlockMobileAudio();
                            const targetName = settings.srTargets[0] ?? "USD/JPY";
                            const targetIdx =
                              indices.find((item) => item.name === targetName) ??
                              marketIndices.find((item) => item.name === targetName) ??
                              marketIndices[0];
                            const currentPrice = getActiveIndexPrice(targetIdx);
                            const sampleLv = srLevelsByIndex[targetName]?.[0];
                            const lvPrice = sampleLv?.price ?? currentPrice;
                            const lvLabel = sampleLv?.label ?? "上値抵抗線 R1";
                            const spokenName = getSpokenIndexName(targetIdx);
                            const text = `サポレジ到達。${spokenName}が${settings.srLookbackDays}日${lvLabel}、${formatSpokenPrice(
                              targetName,
                              lvPrice
                            )}付近に到達しました。現在${formatSpokenPrice(
                              targetName,
                              currentPrice
                            )}です。`;
                            speakJapaneseAlert(text, {
                              rate: settings.speechRate,
                              volume: settings.volume,
                              pitch: settings.pitch,
                              voiceName: settings.voiceName,
                              chime: settings.chimePreset !== "none" ? "up" : false,
                              chimePreset: settings.chimePreset,
                              voiceCharacter: settings.voiceCharacter,
                              useVoicevox: settings.useVoicevox,
                              voicevoxSpeakerId: settings.voicevoxSpeakerId,
                            });
                          }}
                          className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-0.5 text-[10px] font-bold text-primary hover:bg-muted"
                        >
                          <Play className="h-2.5 w-2.5" />
                          サポレジテスト
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <div className="rounded-md border border-border bg-muted/20 p-3">
                  <div className="mb-2 font-bold text-foreground">個別の指定価格アラートを追加</div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                    <select
                      value={newLineIndex}
                      onChange={(e) => setNewLineIndex(e.target.value)}
                      className="h-8 rounded border border-border bg-background px-2 text-xs sm:col-span-4"
                    >
                      {ALL_VOICE_ALERT_TARGETS.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="any"
                      placeholder="例: 160 / 55000"
                      value={newLinePrice}
                      onChange={(e) => setNewLinePrice(e.target.value)}
                      className="h-8 rounded border border-border bg-background px-2 font-mono text-xs sm:col-span-4"
                    />
                    <select
                      value={newLineCondition}
                      onChange={(e) => setNewLineCondition(e.target.value as "above" | "below")}
                      className="h-8 rounded border border-border bg-background px-2 text-xs sm:col-span-2"
                    >
                      <option value="above">以上</option>
                      <option value="below">以下</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleAddPriceAlert}
                      className="inline-flex h-8 items-center justify-center gap-1 rounded bg-primary px-2.5 text-xxs font-bold text-primary-foreground hover:bg-primary/90 sm:col-span-2"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      追加
                    </button>
                  </div>
                </div>

                {settings.priceAlerts.length > 0 ? (
                  <div className="divide-y divide-border rounded-md border border-border">
                    {settings.priceAlerts.map((alert) => (
                      <div key={alert.id} className="flex items-center justify-between gap-2 px-3 py-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-foreground">{alert.indexName}</span>
                          <span className="font-mono font-bold text-primary">
                            {alert.targetPrice.toLocaleString()}
                          </span>
                          <span
                            className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${
                              alert.condition === "above"
                                ? "border-red-200 bg-red-50 text-red-700"
                                : "border-blue-200 bg-blue-50 text-blue-700"
                            }`}
                          >
                            {alert.condition === "above" ? "以上（突破）" : "以下（割れ）"}
                          </span>
                          {alert.triggered && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                              到達済み
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {alert.triggered && (
                            <button
                              type="button"
                              onClick={() => handleResetTriggered(alert.id)}
                              className="rounded border border-border bg-background px-2 py-0.5 text-[10px] font-semibold text-primary hover:bg-muted"
                            >
                              再監視
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemovePriceAlert(alert.id)}
                            aria-label="削除"
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-md border border-dashed border-border py-4 text-center text-xxs text-muted-foreground">
                    登録された価格ラインはありません（例: USD/JPY 160 以上、日経平均 55000 以下）
                  </p>
                )}

                {history.length > 0 && (
                  <div className="border-t border-border pt-3">
                    <div className="mb-1.5 font-bold text-foreground">直近の読み上げ履歴</div>
                    <div className="space-y-1">
                      {history.slice(0, 5).map((ev) => (
                        <div
                          key={ev.id}
                          className="rounded bg-muted/40 px-2.5 py-1.5 text-xxs leading-snug text-foreground/85"
                        >
                          {ev.speechText}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/20 px-5 py-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <select
                value={testTargetName}
                onChange={(e) => setTestTargetName(e.target.value)}
                aria-label="テスト読み上げ銘柄"
                className="h-7 rounded border border-border bg-background px-1.5 text-xxs font-bold text-foreground"
              >
                {ALL_VOICE_ALERT_TARGETS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleTestSpeak("up")}
                className="inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2.5 py-1 text-xxs font-bold text-red-700 hover:bg-red-100"
              >
                <Play className="h-3 w-3" />
                テスト（上昇）
              </button>
              <button
                type="button"
                onClick={() => handleTestSpeak("down")}
                className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2.5 py-1 text-xxs font-bold text-blue-700 hover:bg-blue-100"
              >
                <Play className="h-3 w-3" />
                テスト（下落）
              </button>
              <button
                type="button"
                onClick={handleResetAll}
                className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xxs font-semibold text-muted-foreground hover:text-foreground"
                title="設定を初期値に戻す"
              >
                <RotateCcw className="h-3 w-3" />
                初期化
              </button>
            </div>
            <button
              type="button"
              onClick={() => setDialogOpen(false)}
              className="rounded bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
            >
              閉じる
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
