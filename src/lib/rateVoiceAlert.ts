import { type MarketIndex } from "@/data/stockData";

export type VoiceAlertStyle = "short" | "standard" | "detailed" | "custom";
export type VoiceDirectionFilter = "both" | "up" | "down";

export interface PriceLineAlert {
  id: string;
  indexName: string;
  targetPrice: number;
  condition: "above" | "below";
  triggered?: boolean;
}

export type PeriodicIntervalMinutes = 0 | 15 | 30 | 60;
export type AutoRoundStepLevel = 1 | 1.5 | 2 | 2.5 | 3; // 1: とても細かい, 1.5: 細かい, 2: 標準, 2.5: やや大きい, 3: 大きな節目のみ
export type ChimePreset = "none" | "bell" | "news" | "radar" | "coin" | "soft";
export type VoiceCharacter = "normal" | "zunda";
export type SupportResistanceLookbackDays = 60 | 200;

export interface SupportResistanceLevel {
  id: string;
  indexName?: string;
  kind: "resistance" | "support";
  label: string;
  price: number;
  lookbackDays?: SupportResistanceLookbackDays;
}

export const SR_CHART_SYMBOL_BY_INDEX: Record<string, string> = {
  日経平均: "^N225",
  TOPIX: "1306.T",
  NYダウ: "^DJI",
  NASDAQ: "^IXIC",
  "S&P500": "^GSPC",
  "USD/JPY": "JPY=X",
  GOLD: "GC=F",
  "BTC/USDT": "BTC-USD",
};

export interface RateVoiceAlertSettings {
  enabled: boolean;
  thresholdPercent: number;
  directionFilter: VoiceDirectionFilter;
  targets: string[];
  style: VoiceAlertStyle;
  includePrice: boolean;
  includeDelta: boolean;
  includeDailyChange: boolean;
  includeTime: boolean;
  customTemplate: string;
  voiceCharacter: VoiceCharacter;
  useVoicevox: boolean;
  voicevoxSpeakerId: number;
  voiceName: string;
  speechRate: number;
  volume: number;
  pitch: number;
  chimeEnabled: boolean;
  chimePreset: ChimePreset;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
  autoRoundNumbersEnabled: boolean;
  autoRoundStepLevel: AutoRoundStepLevel;
  usdJpySrEnabled: boolean;
  usdJpySrMarginYen: number;
  srEnabled: boolean;
  srTargets: string[];
  srLookbackDays: SupportResistanceLookbackDays;
  srMarginPercent: number;
  periodicIntervalMinutes: PeriodicIntervalMinutes;
  priceAlerts: PriceLineAlert[];
}

export interface RateSpikeEvent {
  id: string;
  kind: "spike" | "price-line" | "auto-round" | "periodic" | "sr-line";
  indexName: string;
  displayName: string;
  price: number;
  prevPrice: number;
  deltaPercent: number;
  direction: "up" | "down";
  speechText: string;
  detectedAt: string;
  alertId?: string;
}

export const AUTO_ROUND_STEP_BY_INDEX: Record<string, number> = {
  日経平均: 500,
  TOPIX: 50,
  NYダウ: 500,
  NASDAQ: 250,
  "S&P500": 50,
  "USD/JPY": 1,
  GOLD: 50,
  "BTC/USDT": 1000,
};

export const getAutoRoundStep = (indexName: string, level: AutoRoundStepLevel = 2): number => {
  const base = AUTO_ROUND_STEP_BY_INDEX[indexName];
  if (!base) return 0;
  if (level === 1) return Number((base * 0.2).toFixed(4));
  if (level === 1.5) return Number((base * 0.5).toFixed(4));
  if (level === 2.5) return Number((base * 2).toFixed(4));
  if (level === 3) return Number((base * 5).toFixed(4));
  return base;
};

export const VOICE_ALERT_STORAGE_KEY = "stock-scout-voice-alert-v1";
export const VOICE_ALERT_EVENT_NAME = "stock-scout-voice-alert-settings-change";
export const VOICE_ALERT_HISTORY_EVENT = "stock-scout-voice-alert-history-change";

export const ALL_VOICE_ALERT_TARGETS = [
  "日経平均",
  "TOPIX",
  "NYダウ",
  "NASDAQ",
  "S&P500",
  "USD/JPY",
  "GOLD",
  "BTC/USDT",
] as const;

export const DEFAULT_CUSTOM_TEMPLATE = "速報。{銘柄}が{方向}。現在{価格}、直近比{変動率}。";

export const DEFAULT_VOICE_ALERT_SETTINGS: RateVoiceAlertSettings = {
  enabled: false,
  thresholdPercent: 0.3,
  directionFilter: "both",
  targets: [...ALL_VOICE_ALERT_TARGETS],
  style: "standard",
  includePrice: true,
  includeDelta: true,
  includeDailyChange: false,
  includeTime: false,
  customTemplate: DEFAULT_CUSTOM_TEMPLATE,
  voiceCharacter: "normal",
  useVoicevox: true,
  voicevoxSpeakerId: 1, // 1: ずんだもん（あまあま）
  voiceName: "",
  speechRate: 1.1,
  volume: 0.9,
  pitch: 1.0,
  chimeEnabled: true,
  chimePreset: "news",
  quietHoursEnabled: false,
  quietStart: "23:00",
  quietEnd: "07:00",
  autoRoundNumbersEnabled: true,
  autoRoundStepLevel: 2,
  usdJpySrEnabled: true,
  usdJpySrMarginYen: 0.1,
  srEnabled: true,
  srTargets: ["USD/JPY", "日経平均"],
  srLookbackDays: 60,
  srMarginPercent: 0.1,
  periodicIntervalMinutes: 0,
  priceAlerts: [],
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const loadVoiceAlertSettings = (): RateVoiceAlertSettings => {
  if (typeof window === "undefined") return DEFAULT_VOICE_ALERT_SETTINGS;
  try {
    const raw = localStorage.getItem(VOICE_ALERT_STORAGE_KEY);
    if (!raw) return DEFAULT_VOICE_ALERT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<RateVoiceAlertSettings>;
    const validStyles: VoiceAlertStyle[] = ["short", "standard", "detailed", "custom"];
    const validDirs: VoiceDirectionFilter[] = ["both", "up", "down"];

    return {
      enabled: Boolean(parsed.enabled),
      thresholdPercent:
        typeof parsed.thresholdPercent === "number" && parsed.thresholdPercent > 0
          ? parsed.thresholdPercent
          : DEFAULT_VOICE_ALERT_SETTINGS.thresholdPercent,
      directionFilter:
        parsed.directionFilter && validDirs.includes(parsed.directionFilter)
          ? parsed.directionFilter
          : DEFAULT_VOICE_ALERT_SETTINGS.directionFilter,
      targets:
        Array.isArray(parsed.targets) && parsed.targets.length > 0
          ? parsed.targets
          : [...ALL_VOICE_ALERT_TARGETS],
      style:
        parsed.style && validStyles.includes(parsed.style)
          ? parsed.style
          : DEFAULT_VOICE_ALERT_SETTINGS.style,
      includePrice:
        typeof parsed.includePrice === "boolean"
          ? parsed.includePrice
          : DEFAULT_VOICE_ALERT_SETTINGS.includePrice,
      includeDelta:
        typeof parsed.includeDelta === "boolean"
          ? parsed.includeDelta
          : DEFAULT_VOICE_ALERT_SETTINGS.includeDelta,
      includeDailyChange:
        typeof parsed.includeDailyChange === "boolean"
          ? parsed.includeDailyChange
          : DEFAULT_VOICE_ALERT_SETTINGS.includeDailyChange,
      includeTime:
        typeof parsed.includeTime === "boolean"
          ? parsed.includeTime
          : DEFAULT_VOICE_ALERT_SETTINGS.includeTime,
      customTemplate:
        typeof parsed.customTemplate === "string" && parsed.customTemplate.trim()
          ? parsed.customTemplate
          : DEFAULT_CUSTOM_TEMPLATE,
      voiceCharacter: parsed.voiceCharacter === "zunda" ? "zunda" : "normal",
      useVoicevox:
        typeof parsed.useVoicevox === "boolean"
          ? parsed.useVoicevox
          : DEFAULT_VOICE_ALERT_SETTINGS.useVoicevox,
      voicevoxSpeakerId:
        typeof parsed.voicevoxSpeakerId === "number" && Number.isFinite(parsed.voicevoxSpeakerId)
          ? parsed.voicevoxSpeakerId
          : DEFAULT_VOICE_ALERT_SETTINGS.voicevoxSpeakerId,
      voiceName: typeof parsed.voiceName === "string" ? parsed.voiceName : "",
      speechRate:
        typeof parsed.speechRate === "number" && Number.isFinite(parsed.speechRate)
          ? clamp(parsed.speechRate, 0.7, 1.6)
          : DEFAULT_VOICE_ALERT_SETTINGS.speechRate,
      volume:
        typeof parsed.volume === "number" && Number.isFinite(parsed.volume)
          ? clamp(parsed.volume, 0.1, 1.0)
          : DEFAULT_VOICE_ALERT_SETTINGS.volume,
      pitch:
        typeof parsed.pitch === "number" && Number.isFinite(parsed.pitch)
          ? clamp(parsed.pitch, 0.7, 2.0)
          : DEFAULT_VOICE_ALERT_SETTINGS.pitch,
      chimeEnabled:
        typeof parsed.chimeEnabled === "boolean"
          ? parsed.chimeEnabled
          : DEFAULT_VOICE_ALERT_SETTINGS.chimeEnabled,
      chimePreset:
        parsed.chimePreset &&
        (["none", "bell", "news", "radar", "coin", "soft"] as ChimePreset[]).includes(
          parsed.chimePreset
        )
          ? parsed.chimePreset
          : parsed.chimeEnabled === false
            ? "none"
            : DEFAULT_VOICE_ALERT_SETTINGS.chimePreset,
      quietHoursEnabled: Boolean(parsed.quietHoursEnabled),
      quietStart:
        typeof parsed.quietStart === "string" && /^\d{2}:\d{2}$/.test(parsed.quietStart)
          ? parsed.quietStart
          : DEFAULT_VOICE_ALERT_SETTINGS.quietStart,
      quietEnd:
        typeof parsed.quietEnd === "string" && /^\d{2}:\d{2}$/.test(parsed.quietEnd)
          ? parsed.quietEnd
          : DEFAULT_VOICE_ALERT_SETTINGS.quietEnd,
      autoRoundNumbersEnabled:
        typeof parsed.autoRoundNumbersEnabled === "boolean"
          ? parsed.autoRoundNumbersEnabled
          : DEFAULT_VOICE_ALERT_SETTINGS.autoRoundNumbersEnabled,
      autoRoundStepLevel:
        parsed.autoRoundStepLevel === 1 ||
        parsed.autoRoundStepLevel === 1.5 ||
        parsed.autoRoundStepLevel === 2 ||
        parsed.autoRoundStepLevel === 2.5 ||
        parsed.autoRoundStepLevel === 3
          ? parsed.autoRoundStepLevel
          : DEFAULT_VOICE_ALERT_SETTINGS.autoRoundStepLevel,
      usdJpySrEnabled:
        typeof parsed.usdJpySrEnabled === "boolean"
          ? parsed.usdJpySrEnabled
          : DEFAULT_VOICE_ALERT_SETTINGS.usdJpySrEnabled,
      usdJpySrMarginYen:
        typeof parsed.usdJpySrMarginYen === "number" && parsed.usdJpySrMarginYen > 0
          ? clamp(parsed.usdJpySrMarginYen, 0.02, 0.5)
          : DEFAULT_VOICE_ALERT_SETTINGS.usdJpySrMarginYen,
      srEnabled:
        typeof parsed.srEnabled === "boolean"
          ? parsed.srEnabled
          : typeof parsed.usdJpySrEnabled === "boolean"
            ? parsed.usdJpySrEnabled
            : DEFAULT_VOICE_ALERT_SETTINGS.srEnabled,
      srTargets:
        Array.isArray(parsed.srTargets) && parsed.srTargets.length > 0
          ? parsed.srTargets.filter((t) =>
              (ALL_VOICE_ALERT_TARGETS as readonly string[]).includes(t)
            )
          : [...DEFAULT_VOICE_ALERT_SETTINGS.srTargets],
      srLookbackDays: parsed.srLookbackDays === 200 ? 200 : 60,
      srMarginPercent:
        typeof parsed.srMarginPercent === "number" && parsed.srMarginPercent > 0
          ? clamp(parsed.srMarginPercent, 0.02, 0.5)
          : DEFAULT_VOICE_ALERT_SETTINGS.srMarginPercent,
      periodicIntervalMinutes:
        parsed.periodicIntervalMinutes === 0 ||
        parsed.periodicIntervalMinutes === 15 ||
        parsed.periodicIntervalMinutes === 30 ||
        parsed.periodicIntervalMinutes === 60
          ? parsed.periodicIntervalMinutes
          : DEFAULT_VOICE_ALERT_SETTINGS.periodicIntervalMinutes,
      priceAlerts: Array.isArray(parsed.priceAlerts)
        ? parsed.priceAlerts.filter(
            (a): a is PriceLineAlert =>
              Boolean(a?.id && a?.indexName && Number.isFinite(a?.targetPrice)) &&
              (a.condition === "above" || a.condition === "below")
          )
        : [],
    };
  } catch {
    return DEFAULT_VOICE_ALERT_SETTINGS;
  }
};

export const saveVoiceAlertSettings = (settings: RateVoiceAlertSettings) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VOICE_ALERT_STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent(VOICE_ALERT_EVENT_NAME, { detail: settings }));
  } catch {
    // ignore storage quota errors
  }
};

export const getActiveIndexPrice = (index: MarketIndex): number =>
  typeof index.futuresValue === "number" && Number.isFinite(index.futuresValue)
    ? index.futuresValue
    : index.value;

export const getActiveDailyPercent = (index: MarketIndex): number =>
  typeof index.futuresChangePercent === "number" && Number.isFinite(index.futuresChangePercent)
    ? index.futuresChangePercent
    : index.changePercent;

export const getSpokenIndexName = (index: MarketIndex): string => {
  const hasFutures = typeof index.futuresValue === "number";
  switch (index.name) {
    case "日経平均":
      return hasFutures ? "日経平均先物" : "日経平均";
    case "TOPIX":
      return "トピックス";
    case "NYダウ":
      return hasFutures ? "ニューヨークダウ先物" : "ニューヨークダウ";
    case "NASDAQ":
      return hasFutures ? "ナスダック100先物" : "ナスダック";
    case "S&P500":
      return hasFutures ? "エスアンドピー500先物" : "エスアンドピー500";
    case "USD/JPY":
      return "ドル円";
    case "GOLD":
      return "ゴールド";
    case "BTC/USDT":
      return "ビットコイン";
    default:
      return index.name;
  }
};

export const formatSpokenPrice = (indexName: string, price: number): string => {
  if (indexName === "USD/JPY") {
    const yen = Math.floor(price);
    const sen = Math.round((price - yen) * 100);
    return sen > 0 ? `${yen}円${sen}銭` : `${yen}円`;
  }
  if (indexName === "日経平均") {
    return `${Math.round(price).toLocaleString("ja-JP")}円`;
  }
  if (indexName === "GOLD" || indexName === "BTC/USDT" || indexName === "NYダウ") {
    return `${Math.round(price).toLocaleString("ja-JP")}ドル`;
  }
  return `${Number(price.toFixed(1)).toLocaleString("ja-JP")}`;
};

const formatJstTimeSpoken = (now: Date): string => {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const h = parts.find((p) => p.type === "hour")?.value ?? "0";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${Number(h)}時${Number(m)}分`;
};

const parseHHMM = (value: string): number => {
  const [h, m] = value.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
};

/**
 * JST時刻が静音時間帯（おやすみモード）に入っているか判定
 */
export const isInQuietHours = (
  settings: Pick<RateVoiceAlertSettings, "quietHoursEnabled" | "quietStart" | "quietEnd">,
  now = new Date()
): boolean => {
  if (!settings.quietHoursEnabled) return false;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const current = hour * 60 + minute;
  const start = parseHHMM(settings.quietStart);
  const end = parseHHMM(settings.quietEnd);

  if (start === end) return false;
  if (start < end) {
    return current >= start && current < end;
  }
  // 日またぎ（例: 23:00〜07:00）
  return current >= start || current < end;
};

export const applyZundaTone = (text: string): string => {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return trimmed
    .replace(/しました。/g, "したのだ！")
    .replace(/です。/g, "なのだ！")
    .replace(/速報。/g, "速報なのだ！")
    .replace(/価格アラート。/g, "価格アラートなのだ！")
    .replace(/キリ番到達。/g, "キリ番到達なのだ！")
    .replace(/パーセント。/g, "パーセントなのだ！")
    .replace(/円。/g, "円なのだ！")
    .replace(/ドル。/g, "ドルなのだ！")
    .replace(/急上昇。/g, "急上昇なのだ！")
    .replace(/急落。/g, "急落なのだ！")
    .replace(/([^！。のだ])$/, "$1なのだ！");
};

export const buildSpikeSpeechText = (
  index: MarketIndex,
  price: number,
  deltaPercent: number,
  settings: RateVoiceAlertSettings = DEFAULT_VOICE_ALERT_SETTINGS,
  now = new Date()
): string => {
  const name = getSpokenIndexName(index);
  const directionWord = deltaPercent >= 0 ? "急上昇" : "急落";
  const signWord = deltaPercent >= 0 ? "プラス" : "マイナス";
  const absPct = Math.abs(deltaPercent).toFixed(2);
  const deltaText = `${signWord}${absPct}パーセント`;
  const priceText = formatSpokenPrice(index.name, price);
  const dailyPct = getActiveDailyPercent(index);
  const dailySign = dailyPct >= 0 ? "プラス" : "マイナス";
  const dailyText = `前日比${dailySign}${Math.abs(dailyPct).toFixed(2)}パーセント`;
  const timeText = formatJstTimeSpoken(now);

  const finalize = (raw: string) => raw;

  if (settings.style === "custom") {
    const tpl = settings.customTemplate.trim() || DEFAULT_CUSTOM_TEMPLATE;
    return finalize(
      tpl
        .replace(/\{銘柄\}/g, name)
        .replace(/\{方向\}/g, directionWord)
        .replace(/\{価格\}/g, priceText)
        .replace(/\{変動率\}/g, deltaText)
        .replace(/\{前日比\}/g, dailyText)
        .replace(/\{時刻\}/g, timeText)
        .trim()
    );
  }

  const chunks: string[] = [];
  if (settings.includeTime) {
    chunks.push(`${timeText}。`);
  }

  if (settings.style === "short") {
    chunks.push(`${name}、${directionWord}。`);
    if (settings.includePrice) chunks.push(`${priceText}。`);
    if (settings.includeDelta) chunks.push(`${deltaText}。`);
    if (settings.includeDailyChange) chunks.push(`${dailyText}。`);
    return finalize(chunks.join(""));
  }

  if (settings.style === "detailed") {
    chunks.push(`速報。${name}が${directionWord}しました。`);
    const details: string[] = [];
    if (settings.includePrice) details.push(`現在${priceText}`);
    if (settings.includeDelta) details.push(`直近比${deltaText}`);
    details.push(dailyText);
    chunks.push(`${details.join("、")}です。`);
    return finalize(chunks.join(""));
  }

  // standard
  chunks.push(`速報。${name}が${directionWord}。`);
  const parts: string[] = [];
  if (settings.includePrice) parts.push(priceText);
  if (settings.includeDelta) parts.push(`直近比${deltaText}`);
  if (settings.includeDailyChange) parts.push(dailyText);
  if (parts.length > 0) {
    chunks.push(`${parts.join("、")}。`);
  }
  return finalize(chunks.join(""));
};

export const detectRateSpikes = (
  currentIndices: MarketIndex[],
  previousPrices: Record<string, number>,
  settings: RateVoiceAlertSettings,
  lastAlertAt: Record<string, number>,
  nowMs = Date.now(),
  cooldownMs = 3 * 60 * 1000
): RateSpikeEvent[] => {
  const nowDate = new Date(nowMs);
  if (isInQuietHours(settings, nowDate)) return [];

  const allowedTargets = new Set(settings.targets);
  const spikes: RateSpikeEvent[] = [];

  for (const index of currentIndices) {
    if (!allowedTargets.has(index.name)) continue;
    const price = getActiveIndexPrice(index);
    const prevPrice = previousPrices[index.name];
    if (!Number.isFinite(price) || !Number.isFinite(prevPrice) || prevPrice <= 0) continue;

    const deltaPercent = ((price - prevPrice) / prevPrice) * 100;
    if (Math.abs(deltaPercent) < settings.thresholdPercent) continue;

    const direction: "up" | "down" = deltaPercent >= 0 ? "up" : "down";
    if (settings.directionFilter === "up" && direction !== "up") continue;
    if (settings.directionFilter === "down" && direction !== "down") continue;

    const prevAlertTime = lastAlertAt[index.name] ?? 0;
    if (nowMs - prevAlertTime < cooldownMs) continue;

    spikes.push({
      id: `${index.name}-${nowMs}`,
      kind: "spike",
      indexName: index.name,
      displayName: getSpokenIndexName(index),
      price,
      prevPrice,
      deltaPercent,
      direction,
      speechText: buildSpikeSpeechText(index, price, deltaPercent, settings, nowDate),
      detectedAt: nowDate.toISOString(),
    });
  }

  return spikes.sort((a, b) => Math.abs(b.deltaPercent) - Math.abs(a.deltaPercent));
};

/**
 * 指定価格ライン（キリ番）到達を検知
 */
export const detectPriceLineCrosses = (
  currentIndices: MarketIndex[],
  settings: RateVoiceAlertSettings,
  nowMs = Date.now()
): RateSpikeEvent[] => {
  const nowDate = new Date(nowMs);
  if (isInQuietHours(settings, nowDate) || !settings.priceAlerts.length) return [];

  const indexMap = new Map(currentIndices.map((idx) => [idx.name, idx]));
  const events: RateSpikeEvent[] = [];

  for (const alert of settings.priceAlerts) {
    if (alert.triggered) continue;
    const index = indexMap.get(alert.indexName);
    if (!index) continue;
    const price = getActiveIndexPrice(index);
    if (!Number.isFinite(price)) continue;

    const hit =
      alert.condition === "above" ? price >= alert.targetPrice : price <= alert.targetPrice;
    if (!hit) continue;

    const spokenName = getSpokenIndexName(index);
    const targetText = formatSpokenPrice(index.name, alert.targetPrice);
    const currentText = formatSpokenPrice(index.name, price);
    const actionWord = alert.condition === "above" ? "突破しました" : "割り込みました";

    const rawSpeech = `価格アラート。${spokenName}が${targetText}を${actionWord}。現在${currentText}です。`;
    events.push({
      id: `line-${alert.id}-${nowMs}`,
      kind: "price-line",
      alertId: alert.id,
      indexName: index.name,
      displayName: spokenName,
      price,
      prevPrice: alert.targetPrice,
      deltaPercent: alert.targetPrice > 0 ? ((price - alert.targetPrice) / alert.targetPrice) * 100 : 0,
      direction: alert.condition === "above" ? "up" : "down",
      speechText: rawSpeech,
      detectedAt: nowDate.toISOString(),
    });
  }

  return events;
};

/**
 * 指定なしのオートキリ番（日経500円・ドル円1円・BTC1000ドル刻み等）の突破・割れを自動検知
 */
export const detectAutoRoundNumberCrosses = (
  currentIndices: MarketIndex[],
  previousPrices: Record<string, number>,
  settings: RateVoiceAlertSettings,
  lastLevelAlertAt: Record<string, number>,
  nowMs = Date.now(),
  cooldownMs = 5 * 60 * 1000
): RateSpikeEvent[] => {
  const nowDate = new Date(nowMs);
  if (!settings.autoRoundNumbersEnabled || isInQuietHours(settings, nowDate)) return [];

  const allowedTargets = new Set(settings.targets);
  const events: RateSpikeEvent[] = [];

  for (const index of currentIndices) {
    if (!allowedTargets.has(index.name)) continue;
    const step = getAutoRoundStep(index.name, settings.autoRoundStepLevel);
    if (!step) continue;

    const price = getActiveIndexPrice(index);
    const prevPrice = previousPrices[index.name];
    if (!Number.isFinite(price) || !Number.isFinite(prevPrice) || prevPrice <= 0) continue;

    const prevBucket = Math.floor(prevPrice / step);
    const currBucket = Math.floor(price / step);
    if (prevBucket === currBucket) continue;

    const direction: "up" | "down" = price > prevPrice ? "up" : "down";
    if (settings.directionFilter === "up" && direction !== "up") continue;
    if (settings.directionFilter === "down" && direction !== "down") continue;

    const crossedLevel = direction === "up" ? currBucket * step : (currBucket + 1) * step;
    const levelKey = `${index.name}:${crossedLevel}`;
    if (nowMs - (lastLevelAlertAt[levelKey] ?? 0) < cooldownMs) continue;

    const spokenName = getSpokenIndexName(index);
    const levelText = formatSpokenPrice(index.name, crossedLevel);
    const currentText = formatSpokenPrice(index.name, price);
    const actionWord = direction === "up" ? "を突破しました" : "を割り込みました";

    const rawSpeech = `キリ番到達。${spokenName}が${levelText}${actionWord}。現在${currentText}です。`;
    events.push({
      id: `auto-round-${levelKey}-${nowMs}`,
      kind: "auto-round",
      alertId: levelKey,
      indexName: index.name,
      displayName: spokenName,
      price,
      prevPrice,
      deltaPercent: ((price - prevPrice) / prevPrice) * 100,
      direction,
      speechText: rawSpeech,
      detectedAt: nowDate.toISOString(),
    });
  }

  return events;
};

/**
 * 現在のJST時刻が定時読み上げスロット（15/30/60分ごと）に一致した場合、一意のキーを返す
 */
export const getPeriodicSlotKey = (
  intervalMinutes: PeriodicIntervalMinutes,
  now = new Date()
): string | null => {
  if (!intervalMinutes) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const minute = Number(get("minute"));
  if (minute % intervalMinutes !== 0) return null;
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
};

/**
 * 定時読み上げ用のマーケット概要テキストを生成（監視対象から主要最大4銘柄）
 */
export const buildPeriodicBriefingSpeech = (
  indices: MarketIndex[],
  settings: RateVoiceAlertSettings,
  now = new Date()
): string => {
  const allowed = new Set(settings.targets);
  const picked = indices.filter((idx) => allowed.has(idx.name));
  const timeText = formatJstTimeSpoken(now);
  if (!picked.length) return `${timeText}の定時レポートです。`;

  const summaries = picked.map((idx) => {
    const name = getSpokenIndexName(idx);
    const price = formatSpokenPrice(idx.name, getActiveIndexPrice(idx));
    const pct = getActiveDailyPercent(idx);
    const sign = pct >= 0 ? "プラス" : "マイナス";
    return `${name}は${price}、前日比${sign}${Math.abs(pct).toFixed(1)}パーセント`;
  });

  return `${timeText}の定時レポートです。${summaries.join("。")}です。`;
};

const roundSrPrice = (indexName: string, price: number): number => {
  if (indexName === "USD/JPY") return Number(price.toFixed(2));
  if (indexName === "TOPIX" || indexName === "S&P500") return Number(price.toFixed(1));
  return Math.round(price);
};

/**
 * 任意銘柄の日足ローソク足から直近60日または200日のサポート・レジスタンスライン（R1/R2, S1/S2）を自動算出
 */
export const computeSupportResistanceLevels = (
  indexName: string,
  candles: Array<{ high: number; low: number; close: number }>,
  currentPrice: number,
  lookbackDays: SupportResistanceLookbackDays = 60
): SupportResistanceLevel[] => {
  if (!candles.length || !Number.isFinite(currentPrice) || currentPrice <= 0) return [];

  // ETF代理シンボル（例: TOPIXの1306.T）などでスケールが大きく異なる場合は現在値比率で正規化
  const lastClose = candles[candles.length - 1]?.close;
  const needsScale =
    Number.isFinite(lastClose) &&
    lastClose > 0 &&
    Math.abs(currentPrice - lastClose) / currentPrice > 0.2;
  const scale = needsScale ? currentPrice / lastClose : 1;

  const scaled = candles.map((c) => ({
    high: c.high * scale,
    low: c.low * scale,
    close: c.close * scale,
  }));

  const shortWindow = lookbackDays === 200 ? 60 : 20;
  const recentShort = scaled.slice(-shortWindow);
  const recentLong = scaled.slice(-lookbackDays);

  const swingHighs: number[] = [];
  const swingLows: number[] = [];
  const pivotSpan = lookbackDays === 200 ? 3 : 2;

  for (let i = pivotSpan; i < recentLong.length - pivotSpan; i += 1) {
    const h = recentLong[i].high;
    const l = recentLong[i].low;
    let isHigh = true;
    let isLow = true;
    let strictHigh = false;
    let strictLow = false;
    for (let offset = 1; offset <= pivotSpan; offset += 1) {
      if (h < recentLong[i - offset].high || h < recentLong[i + offset].high) isHigh = false;
      if (h > recentLong[i - offset].high && h > recentLong[i + offset].high) strictHigh = true;
      if (l > recentLong[i - offset].low || l > recentLong[i + offset].low) isLow = false;
      if (l < recentLong[i - offset].low && l < recentLong[i + offset].low) strictLow = true;
    }
    if (isHigh && strictHigh) swingHighs.push(h);
    if (isLow && strictLow) swingLows.push(l);
  }

  const maxShort = Math.max(...recentShort.map((c) => c.high));
  const minShort = Math.min(...recentShort.map((c) => c.low));
  const maxLong = Math.max(...recentLong.map((c) => c.high));
  const minLong = Math.min(...recentLong.map((c) => c.low));

  const nearBuffer = currentPrice * 0.001;
  const minGap = currentPrice * (lookbackDays === 200 ? 0.006 : 0.0025);

  const resistanceCandidates = [...swingHighs, maxShort, maxLong]
    .filter((p) => Number.isFinite(p) && p > currentPrice - nearBuffer)
    .sort((a, b) => a - b);
  const supportCandidates = [...swingLows, minShort, minLong]
    .filter((p) => Number.isFinite(p) && p < currentPrice + nearBuffer)
    .sort((a, b) => b - a);

  const pickDistinct = (sorted: number[]): number[] => {
    const picked: number[] = [];
    for (const p of sorted) {
      if (!picked.some((existing) => Math.abs(existing - p) < minGap)) {
        picked.push(roundSrPrice(indexName, p));
        if (picked.length >= 2) break;
      }
    }
    return picked;
  };

  const rLevels = pickDistinct(resistanceCandidates);
  const sLevels = pickDistinct(supportCandidates);

  const result: SupportResistanceLevel[] = [];
  if (rLevels[0] !== undefined) {
    result.push({
      id: `${indexName}-${lookbackDays}d-r1-${rLevels[0]}`,
      indexName,
      kind: "resistance",
      label: "上値抵抗線 R1",
      price: rLevels[0],
      lookbackDays,
    });
  }
  if (rLevels[1] !== undefined) {
    result.push({
      id: `${indexName}-${lookbackDays}d-r2-${rLevels[1]}`,
      indexName,
      kind: "resistance",
      label: "上値抵抗線 R2",
      price: rLevels[1],
      lookbackDays,
    });
  }
  if (sLevels[0] !== undefined) {
    result.push({
      id: `${indexName}-${lookbackDays}d-s1-${sLevels[0]}`,
      indexName,
      kind: "support",
      label: "下値支持線 S1",
      price: sLevels[0],
      lookbackDays,
    });
  }
  if (sLevels[1] !== undefined) {
    result.push({
      id: `${indexName}-${lookbackDays}d-s2-${sLevels[1]}`,
      indexName,
      kind: "support",
      label: "下値支持線 S2",
      price: sLevels[1],
      lookbackDays,
    });
  }

  return result;
};

/**
 * ドル円の日足ローソク足から直近サポート・レジスタンスライン（R1/R2, S1/S2）を自動算出（互換関数）
 */
export const computeUsdJpySupportResistance = (
  candles: Array<{ high: number; low: number; close: number }>,
  currentPrice: number,
  lookbackDays: SupportResistanceLookbackDays = 60
): SupportResistanceLevel[] =>
  computeSupportResistanceLevels("USD/JPY", candles, currentPrice, lookbackDays);

/**
 * 全選択銘柄のサポート・レジスタンスライン接近・到達・突破を検知
 */
export const detectSupportResistanceHits = (
  currentIndices: MarketIndex[],
  previousPrices: Record<string, number>,
  levelsByIndex: Record<string, SupportResistanceLevel[]>,
  settings: RateVoiceAlertSettings,
  lastSrAlertAt: Record<string, number>,
  nowMs = Date.now(),
  cooldownMs = 10 * 60 * 1000
): RateSpikeEvent[] => {
  const nowDate = new Date(nowMs);
  if (!settings.srEnabled || isInQuietHours(settings, nowDate) || !settings.srTargets.length) {
    return [];
  }

  const allowed = new Set(settings.srTargets);
  const marginPct = settings.srMarginPercent;
  const periodLabel = `${settings.srLookbackDays}日`;
  const events: RateSpikeEvent[] = [];

  for (const index of currentIndices) {
    if (!allowed.has(index.name)) continue;
    const levels = levelsByIndex[index.name];
    if (!levels?.length) continue;

    const currentPrice = getActiveIndexPrice(index);
    const prevPrice = previousPrices[index.name];
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) continue;

    const spokenName = getSpokenIndexName(index);

    for (const level of levels) {
      if (nowMs - (lastSrAlertAt[level.id] ?? 0) < cooldownMs) continue;
      const distPct = (Math.abs(currentPrice - level.price) / level.price) * 100;

      if (level.kind === "resistance") {
        if (settings.directionFilter === "down") continue;
        const crossed =
          typeof prevPrice === "number" && prevPrice < level.price && currentPrice >= level.price;
        const near = distPct <= marginPct;
        if (!crossed && !near) continue;

        const levelText = formatSpokenPrice(index.name, level.price);
        const currText = formatSpokenPrice(index.name, currentPrice);
        const raw = crossed
          ? `サポレジ突破。${spokenName}が${periodLabel}${level.label}、${levelText}を突破しました。現在${currText}です。`
          : `サポレジ到達。${spokenName}が${periodLabel}${level.label}、${levelText}付近に到達しました。現在${currText}です。`;

        events.push({
          id: `sr-${level.id}-${nowMs}`,
          kind: "sr-line",
          alertId: level.id,
          indexName: index.name,
          displayName: `${spokenName} ${level.label}`,
          price: currentPrice,
          prevPrice: level.price,
          deltaPercent: ((currentPrice - level.price) / level.price) * 100,
          direction: "up",
          speechText: raw,
          detectedAt: nowDate.toISOString(),
        });
      } else {
        if (settings.directionFilter === "up") continue;
        const crossed =
          typeof prevPrice === "number" && prevPrice > level.price && currentPrice <= level.price;
        const near = distPct <= marginPct;
        if (!crossed && !near) continue;

        const levelText = formatSpokenPrice(index.name, level.price);
        const currText = formatSpokenPrice(index.name, currentPrice);
        const raw = crossed
          ? `サポレジ割れ。${spokenName}が${periodLabel}${level.label}、${levelText}を割り込みました。現在${currText}です。`
          : `サポレジ到達。${spokenName}が${periodLabel}${level.label}、${levelText}付近に到達しました。現在${currText}です。`;

        events.push({
          id: `sr-${level.id}-${nowMs}`,
          kind: "sr-line",
          alertId: level.id,
          indexName: index.name,
          displayName: `${spokenName} ${level.label}`,
          price: currentPrice,
          prevPrice: level.price,
          deltaPercent: ((currentPrice - level.price) / level.price) * 100,
          direction: "down",
          speechText: raw,
          detectedAt: nowDate.toISOString(),
        });
      }
    }
  }

  return events;
};

/**
 * ドル円がサポート・レジスタンスラインへ接近・到達・突破したかを検知
 */
export const detectUsdJpySupportResistanceHits = (
  currentPrice: number,
  prevPrice: number | undefined,
  levels: SupportResistanceLevel[],
  settings: RateVoiceAlertSettings,
  lastSrAlertAt: Record<string, number>,
  nowMs = Date.now(),
  cooldownMs = 10 * 60 * 1000
): RateSpikeEvent[] => {
  const nowDate = new Date(nowMs);
  if (
    !settings.usdJpySrEnabled ||
    isInQuietHours(settings, nowDate) ||
    !Number.isFinite(currentPrice) ||
    !levels.length
  ) {
    return [];
  }

  const margin = settings.usdJpySrMarginYen;
  const events: RateSpikeEvent[] = [];

  for (const level of levels) {
    if (nowMs - (lastSrAlertAt[level.id] ?? 0) < cooldownMs) continue;

    if (level.kind === "resistance") {
      if (settings.directionFilter === "down") continue;
      const crossed = typeof prevPrice === "number" && prevPrice < level.price && currentPrice >= level.price;
      const near = Math.abs(currentPrice - level.price) <= margin;
      if (!crossed && !near) continue;

      const levelText = formatSpokenPrice("USD/JPY", level.price);
      const currText = formatSpokenPrice("USD/JPY", currentPrice);
      const raw = crossed
        ? `サポレジ突破。ドル円が${level.label}、${levelText}を突破しました。現在${currText}です。`
        : `サポレジ到達。ドル円が${level.label}、${levelText}付近に到達しました。現在${currText}です。`;

      events.push({
        id: `sr-${level.id}-${nowMs}`,
        kind: "sr-line",
        alertId: level.id,
        indexName: "USD/JPY",
        displayName: `ドル円 ${level.label}`,
        price: currentPrice,
        prevPrice: level.price,
        deltaPercent: ((currentPrice - level.price) / level.price) * 100,
        direction: "up",
        speechText: raw,
        detectedAt: nowDate.toISOString(),
      });
    } else {
      if (settings.directionFilter === "up") continue;
      const crossed = typeof prevPrice === "number" && prevPrice > level.price && currentPrice <= level.price;
      const near = Math.abs(currentPrice - level.price) <= margin;
      if (!crossed && !near) continue;

      const levelText = formatSpokenPrice("USD/JPY", level.price);
      const currText = formatSpokenPrice("USD/JPY", currentPrice);
      const raw = crossed
        ? `サポレジ割れ。ドル円が${level.label}、${levelText}を割り込みました。現在${currText}です。`
        : `サポレジ到達。ドル円が${level.label}、${levelText}付近に到達しました。現在${currText}です。`;

      events.push({
        id: `sr-${level.id}-${nowMs}`,
        kind: "sr-line",
        alertId: level.id,
        indexName: "USD/JPY",
        displayName: `ドル円 ${level.label}`,
        price: currentPrice,
        prevPrice: level.price,
        deltaPercent: ((currentPrice - level.price) / level.price) * 100,
        direction: "down",
        speechText: raw,
        detectedAt: nowDate.toISOString(),
      });
    }
  }

  return events;
};

export const isSpeechSynthesisSupported = (): boolean =>
  typeof window !== "undefined" &&
  "speechSynthesis" in window &&
  typeof SpeechSynthesisUtterance !== "undefined";

export const getJapaneseVoices = (): SpeechSynthesisVoice[] => {
  if (!isSpeechSynthesisSupported()) return [];
  const voices = window.speechSynthesis.getVoices();
  return voices.filter((v) => v.lang.toLowerCase().startsWith("ja"));
};

/**
 * Web Audio API による先頭チャイム（5種類のプリセット＋上昇/下落の音程差別化）
 */
export const playAlertChime = (
  direction: "up" | "down" = "up",
  volume = 0.9,
  preset: ChimePreset = "news"
): number => {
  if (typeof window === "undefined" || preset === "none") return 0;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return 0;
    const ctx = new AudioCtx();
    const peakGain = Math.min(0.55, Math.max(0.12, volume * 0.48));

    type ToneStep = {
      freq: number;
      start: number;
      dur: number;
      type: OscillatorType;
      gainScale?: number;
      harmonic?: number;
    };

    let steps: ToneStep[] = [];
    if (preset === "news") {
      // ニュース速報風のくっきり3音（上昇: E6-G#6-B6 / 下落: B5-G5-E5）
      const freqs = direction === "up" ? [1318.51, 1661.22, 1975.53] : [987.77, 783.99, 659.25];
      steps = freqs.map((freq, idx) => ({
        freq,
        start: idx * 0.11,
        dur: idx === 2 ? 0.34 : 0.14,
        type: "triangle",
        harmonic: freq * 2,
      }));
    } else if (preset === "bell") {
      // 明瞭な2音ベル（上昇: C6-G6 / 下落: G5-C5）
      const freqs = direction === "up" ? [1046.5, 1567.98] : [783.99, 523.25];
      steps = freqs.map((freq, idx) => ({
        freq,
        start: idx * 0.14,
        dur: 0.38,
        type: "sine",
        harmonic: freq * 2,
      }));
    } else if (preset === "radar") {
      // クリアな電子ピコン（上昇: B5-E6 / 下落: F#5-C#5）
      const freqs = direction === "up" ? [987.77, 1318.51] : [739.99, 554.37];
      steps = freqs.map((freq, idx) => ({
        freq,
        start: idx * 0.09,
        dur: idx === 1 ? 0.28 : 0.1,
        type: "triangle",
      }));
    } else if (preset === "coin") {
      // 軽快なコイン音（上昇: B5-E6高速 / 下落: E5-B4）
      const freqs = direction === "up" ? [987.77, 1318.51, 1975.53] : [659.25, 493.88];
      steps = freqs.map((freq, idx) => ({
        freq,
        start: idx * 0.075,
        dur: idx === freqs.length - 1 ? 0.32 : 0.09,
        type: "square",
        gainScale: 0.45,
      }));
    } else {
      // soft: やわらかい2音（上昇: G5-C6 / 下落: E5-C5）
      const freqs = direction === "up" ? [783.99, 1046.5] : [659.25, 523.25];
      steps = freqs.map((freq, idx) => ({
        freq,
        start: idx * 0.13,
        dur: 0.32,
        type: "sine",
        gainScale: 0.75,
      }));
    }

    let maxEnd = 0;
    steps.forEach((step) => {
      const startAt = ctx.currentTime + step.start;
      const endAt = startAt + step.dur;
      maxEnd = Math.max(maxEnd, step.start + step.dur);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const g = peakGain * (step.gainScale ?? 1);
      osc.type = step.type;
      osc.frequency.setValueAtTime(step.freq, startAt);
      gain.gain.setValueAtTime(0.001, startAt);
      gain.gain.linearRampToValueAtTime(g, startAt + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, endAt);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startAt);
      osc.stop(endAt + 0.02);

      if (step.harmonic) {
        const over = ctx.createOscillator();
        const overGain = ctx.createGain();
        over.type = "sine";
        over.frequency.setValueAtTime(step.harmonic, startAt);
        overGain.gain.setValueAtTime(0.001, startAt);
        overGain.gain.linearRampToValueAtTime(g * 0.28, startAt + 0.01);
        overGain.gain.exponentialRampToValueAtTime(0.001, startAt + step.dur * 0.7);
        over.connect(overGain);
        overGain.connect(ctx.destination);
        over.start(startAt);
        over.stop(endAt);
      }
    });

    const totalMs = Math.round(maxEnd * 1000) + 80;
    window.setTimeout(() => {
      ctx.close().catch(() => {});
    }, totalMs + 300);
    return totalMs;
  } catch {
    return 0;
  }
};

let currentVoicevoxAudio: HTMLAudioElement | null = null;
let currentVoicevoxSessionId = 0;

export const stopAllVoiceAlerts = () => {
  currentVoicevoxSessionId += 1;
  if (currentVoicevoxAudio) {
    currentVoicevoxAudio.pause();
    currentVoicevoxAudio.src = "";
    currentVoicevoxAudio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
};

const splitSpeechChunks = (text: string): string[] => {
  const normalized = text.trim();
  if (!normalized) return [];
  if (normalized.length <= 55) return [normalized];
  const rawParts = normalized
    .split(/(?<=[。！？])/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (rawParts.length <= 1) return [normalized];

  const chunks: string[] = [];
  let buffer = "";
  for (const part of rawParts) {
    if (buffer && buffer.length + part.length > 70) {
      chunks.push(buffer);
      buffer = part;
    } else {
      buffer = buffer ? `${buffer}${part}` : part;
    }
  }
  if (buffer) chunks.push(buffer);
  return chunks;
};

const isLocalHttpOrigin = (): boolean => {
  if (typeof window === "undefined") return false;
  const { protocol, hostname } = window.location;
  return (
    protocol === "http:" &&
    (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1")
  );
};

const synthesizeLocalVoicevoxBlob = async (
  chunk: string,
  rate: number,
  volume: number,
  speaker: number,
  timeoutMs = 15000
): Promise<Blob | null> => {
  if (!isLocalHttpOrigin()) return null;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const qRes = await fetch(
      `http://127.0.0.1:50021/audio_query?text=${encodeURIComponent(chunk)}&speaker=${speaker}`,
      { method: "POST", signal: controller.signal }
    );
    if (!qRes.ok) return null;
    const queryJson = await qRes.json();
    queryJson.speedScale = rate;
    queryJson.volumeScale = volume;

    const synthRes = await fetch(`http://127.0.0.1:50021/synthesis?speaker=${speaker}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(queryJson),
      signal: controller.signal,
    });
    if (!synthRes.ok) return null;
    return await synthRes.blob();
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
};

const synthesizeServerVoicevoxBlob = async (
  chunk: string,
  speaker: number,
  timeoutMs = 15000
): Promise<Blob | null> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(
      `/api/tts?speaker=${encodeURIComponent(String(speaker))}&text=${encodeURIComponent(chunk)}`,
      { signal: controller.signal }
    );
    if (!res.ok) return null;
    const blob = await res.blob();
    return blob.size > 256 ? blob : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
};

const synthesizeVoicevoxBlob = async (
  chunk: string,
  rate: number,
  volume: number,
  speaker: number,
  timeoutMs = 15000
): Promise<{ blob: Blob; isServerMp3: boolean } | null> => {
  const localBlob = await synthesizeLocalVoicevoxBlob(chunk, rate, volume, speaker, timeoutMs);
  if (localBlob) return { blob: localBlob, isServerMp3: false };

  const serverBlob = await synthesizeServerVoicevoxBlob(chunk, speaker, timeoutMs);
  if (serverBlob) return { blob: serverBlob, isServerMp3: true };
  return null;
};

const playBlobAudio = (
  blob: Blob,
  volume: number,
  sessionId: number,
  playbackRate = 1.0
): Promise<boolean> =>
  new Promise((resolve) => {
    if (sessionId !== currentVoicevoxSessionId) {
      resolve(false);
      return;
    }
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentVoicevoxAudio = audio;
    audio.volume = Math.min(1, Math.max(0.1, volume));
    audio.playbackRate = Math.min(1.6, Math.max(0.7, playbackRate));
    const cleanup = (ok: boolean) => {
      URL.revokeObjectURL(url);
      if (currentVoicevoxAudio === audio) {
        currentVoicevoxAudio = null;
      }
      resolve(ok);
    };
    audio.onended = () => cleanup(true);
    audio.onerror = () => cleanup(false);
    audio.play().catch(() => cleanup(false));
  });

/**
 * VOICEVOX音声を再生（ローカル起動中は 127.0.0.1:50021 を優先、本番HTTPS・スマホ・未起動時は /api/tts 経由のWEB版VOICEVOXへ自動切替）。
 * 定時読み上げなどの長文は句点単位で分割＋先読み合成し、タイムアウトや待機遅延を防ぐ。
 * どちらも失敗したときのみ false を返し、ブラウザ音声へ自動フォールバックする。
 */
const trySpeakWithVoicevox = async (
  text: string,
  rate: number,
  volume: number,
  speaker = 1
): Promise<boolean> => {
  const chunks = splitSpeechChunks(text);
  if (!chunks.length) return false;

  currentVoicevoxSessionId += 1;
  const sessionId = currentVoicevoxSessionId;
  if (currentVoicevoxAudio) {
    currentVoicevoxAudio.pause();
    currentVoicevoxAudio.src = "";
    currentVoicevoxAudio = null;
  }

  try {
    let nextPromise: Promise<{ blob: Blob; isServerMp3: boolean } | null> | null =
      synthesizeVoicevoxBlob(chunks[0], rate, volume, speaker, 15000);

    for (let i = 0; i < chunks.length; i += 1) {
      if (sessionId !== currentVoicevoxSessionId) return true;
      const result = await nextPromise;
      if (!result) {
        return i > 0;
      }
      if (sessionId !== currentVoicevoxSessionId) return true;

      // 現在の文を再生している間に次の文を先読み合成
      nextPromise =
        i + 1 < chunks.length
          ? synthesizeVoicevoxBlob(chunks[i + 1], rate, volume, speaker, 15000)
          : null;

      const played = await playBlobAudio(
        result.blob,
        volume,
        sessionId,
        result.isServerMp3 ? rate : 1.0
      );
      if (!played && i === 0) return false;
    }
    return true;
  } catch {
    return false;
  }
};

export const speakJapaneseAlert = (
  text: string,
  options: {
    rate?: number;
    volume?: number;
    pitch?: number;
    voiceName?: string;
    chime?: "up" | "down" | false;
    chimePreset?: ChimePreset;
    voiceCharacter?: VoiceCharacter;
    useVoicevox?: boolean;
    voicevoxSpeakerId?: number;
  } = {}
): boolean => {
  if (!isSpeechSynthesisSupported() || !text.trim()) return false;
  try {
    const {
      rate = 1.1,
      volume = 0.9,
      pitch = 1.0,
      voiceName = "",
      chime = false,
      chimePreset = "news",
      voiceCharacter = "normal",
      useVoicevox = false,
      voicevoxSpeakerId = 1,
    } = options;

    let delayMs = 0;
    if (chime && chimePreset !== "none") {
      delayMs = playAlertChime(chime, volume, chimePreset);
    }

    const doSpeakBrowser = () => {
      const synth = window.speechSynthesis;
      if (synth.speaking || synth.pending) {
        synth.cancel();
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ja-JP";
      // ずんだもん風モード時は高め・元気なアニメ風テンポに自動補正（上限2.0まで対応）
      utterance.rate = voiceCharacter === "zunda" ? Math.min(1.6, Math.max(rate, 1.2)) : rate;
      utterance.volume = volume;
      utterance.pitch = voiceCharacter === "zunda" ? Math.min(2.0, Math.max(pitch, 1.65)) : pitch;

      const voices = synth.getVoices();
      const selectedVoice =
        (voiceName ? voices.find((v) => v.name === voiceName) : undefined) ??
        voices.find((v) => v.lang === "ja-JP" && /Kyoko|Google|O-Ren|Hattori/i.test(v.name)) ??
        voices.find((v) => v.lang.toLowerCase().startsWith("ja"));
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      synth.speak(utterance);
    };

    const runSpeak = () => {
      if (useVoicevox) {
        void trySpeakWithVoicevox(text, rate, volume, voicevoxSpeakerId).then((ok) => {
          if (!ok) doSpeakBrowser();
        });
      } else {
        doSpeakBrowser();
      }
    };

    if (delayMs > 0) {
      window.setTimeout(runSpeak, delayMs);
    } else {
      runSpeak();
    }
    return true;
  } catch {
    return false;
  }
};
