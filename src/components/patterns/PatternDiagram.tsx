import React from "react";

interface PatternDiagramProps {
  patternId: string;
  isBullish: boolean;
}

// 共通ローソク足描画ヘルパー
const Candle: React.FC<{
  x: number;
  open: number;
  close: number;
  high: number;
  low: number;
  width?: number;
}> = ({ x, open, close, high, low, width = 5 }) => {
  const isUp = close < open; // SVG座標系ではY軸が下向きなので close < open が上昇（陽線）
  const color = isUp ? "#16a34a" : "#dc2626";
  const bodyTop = Math.min(open, close);
  const bodyHeight = Math.max(Math.abs(close - open), 1.5);

  return (
    <g>
      {/* ヒゲ */}
      <line x1={x + width / 2} y1={high} x2={x + width / 2} y2={low} stroke={color} strokeWidth={1} />
      {/* 実体 */}
      <rect
        x={x}
        y={bodyTop}
        width={width}
        height={bodyHeight}
        fill={color}
        rx={0.5}
      />
    </g>
  );
};

export const SchemaDiagram: React.FC<PatternDiagramProps> = ({ patternId, isBullish }) => {
  const strokeColor = "#1e293b";
  const arrowColor = isBullish ? "#16a34a" : "#dc2626";

  const renderSchema = () => {
    switch (patternId) {
      case "inverse-head-and-shoulders":
      case "inverse-hs-variant":
        return (
          <>
            {/* ネックライン */}
            <line x1="10" y1="28" x2="110" y2="28" stroke="#64748b" strokeWidth="1.5" />
            {/* 逆三尊ライン: 左肩(LS) -> 頭(H) -> 右肩(RS) */}
            <path
              d="M 10 28 L 26 62 L 42 28 L 58 84 L 74 28 L 90 62 L 102 28"
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* ブレイク矢印 */}
            <line x1="102" y1="28" x2="116" y2="12" stroke={arrowColor} strokeWidth="2" strokeDasharray="3 2" />
            <polygon points="116,12 110,13 115,18" fill={arrowColor} />
            {/* ラベル */}
            <text x="26" y="74" fontSize="9" fontWeight="bold" textAnchor="middle" fill="#475569">LS</text>
            <text x="58" y="95" fontSize="9" fontWeight="bold" textAnchor="middle" fill="#475569">H</text>
            <text x="90" y="74" fontSize="9" fontWeight="bold" textAnchor="middle" fill="#475569">RS</text>
          </>
        );

      case "head-and-shoulders":
        return (
          <>
            {/* ネックライン */}
            <line x1="10" y1="72" x2="110" y2="72" stroke="#64748b" strokeWidth="1.5" />
            {/* 三尊ライン: 左肩(LS) -> 頭(H) -> 右肩(RS) */}
            <path
              d="M 10 72 L 26 38 L 42 72 L 58 16 L 74 72 L 90 38 L 102 72"
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* ブレイク矢印 */}
            <line x1="102" y1="72" x2="116" y2="88" stroke={arrowColor} strokeWidth="2" strokeDasharray="3 2" />
            <polygon points="116,88 115,82 110,87" fill={arrowColor} />
            {/* ラベル */}
            <text x="26" y="32" fontSize="9" fontWeight="bold" textAnchor="middle" fill="#475569">LS</text>
            <text x="58" y="11" fontSize="9" fontWeight="bold" textAnchor="middle" fill="#475569">H</text>
            <text x="90" y="32" fontSize="9" fontWeight="bold" textAnchor="middle" fill="#475569">RS</text>
          </>
        );

      case "double-bottom":
        return (
          <>
            <line x1="12" y1="36" x2="108" y2="36" stroke="#64748b" strokeWidth="1.5" />
            <path
              d="M 14 36 L 36 78 L 60 36 L 84 78 L 100 36"
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <line x1="100" y1="36" x2="114" y2="18" stroke={arrowColor} strokeWidth="2" strokeDasharray="3 2" />
            <polygon points="114,18 108,19 113,24" fill={arrowColor} />
          </>
        );

      case "double-top":
      case "double-top-variation":
        return (
          <>
            <line x1="12" y1="64" x2="108" y2="64" stroke="#64748b" strokeWidth="1.5" />
            <path
              d="M 14 64 L 36 22 L 60 64 L 84 22 L 100 64"
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <line x1="100" y1="64" x2="114" y2="82" stroke={arrowColor} strokeWidth="2" strokeDasharray="3 2" />
            <polygon points="114,82 113,76 108,81" fill={arrowColor} />
          </>
        );

      case "descending-triangle-bullish":
        return (
          <>
            {/* 水平サポート */}
            <line x1="12" y1="76" x2="108" y2="76" stroke="#64748b" strokeWidth="1.5" />
            {/* 切り下がるトレンドライン */}
            <line x1="14" y1="22" x2="98" y2="76" stroke="#64748b" strokeWidth="1.5" />
            <path
              d="M 14 22 L 28 76 L 46 40 L 60 76 L 76 56 L 88 76 L 96 66"
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <line x1="96" y1="66" x2="112" y2="40" stroke={arrowColor} strokeWidth="2" strokeDasharray="3 2" />
            <polygon points="112,40 106,42 110,47" fill={arrowColor} />
          </>
        );

      case "ascending-triangle-bearish":
        return (
          <>
            {/* 水平レジスタンス */}
            <line x1="12" y1="24" x2="108" y2="24" stroke="#64748b" strokeWidth="1.5" />
            {/* 切り上がるトレンドライン */}
            <line x1="14" y1="78" x2="98" y2="24" stroke="#64748b" strokeWidth="1.5" />
            <path
              d="M 14 78 L 28 24 L 46 60 L 60 24 L 76 44 L 88 24 L 96 34"
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <line x1="96" y1="34" x2="112" y2="60" stroke={arrowColor} strokeWidth="2" strokeDasharray="3 2" />
            <polygon points="112,60 110,53 106,58" fill={arrowColor} />
          </>
        );

      case "bullish-flag":
        return (
          <>
            {/* 急騰ポール */}
            <line x1="14" y1="86" x2="44" y2="22" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
            {/* チャネル枠 */}
            <line x1="44" y1="22" x2="94" y2="42" stroke="#64748b" strokeWidth="1.5" />
            <line x1="36" y1="42" x2="86" y2="62" stroke="#64748b" strokeWidth="1.5" />
            {/* ジグザグ */}
            <path
              d="M 44 22 L 52 50 L 64 30 L 72 56 L 84 38"
              fill="none"
              stroke={strokeColor}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <line x1="84" y1="38" x2="108" y2="16" stroke={arrowColor} strokeWidth="2" strokeDasharray="3 2" />
            <polygon points="108,16 102,18 107,23" fill={arrowColor} />
          </>
        );

      case "bearish-flag":
        return (
          <>
            {/* 急落ポール */}
            <line x1="14" y1="14" x2="44" y2="78" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
            {/* チャネル枠 */}
            <line x1="44" y1="78" x2="94" y2="58" stroke="#64748b" strokeWidth="1.5" />
            <line x1="36" y1="58" x2="86" y2="38" stroke="#64748b" strokeWidth="1.5" />
            {/* ジグザグ */}
            <path
              d="M 44 78 L 52 50 L 64 70 L 72 44 L 84 62"
              fill="none"
              stroke={strokeColor}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <line x1="84" y1="62" x2="108" y2="84" stroke={arrowColor} strokeWidth="2" strokeDasharray="3 2" />
            <polygon points="108,84 107,77 102,82" fill={arrowColor} />
          </>
        );

      case "bullish-pennant":
        return (
          <>
            <line x1="14" y1="86" x2="40" y2="22" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
            <line x1="40" y1="22" x2="94" y2="50" stroke="#64748b" strokeWidth="1.5" />
            <line x1="38" y1="76" x2="94" y2="50" stroke="#64748b" strokeWidth="1.5" />
            <path
              d="M 40 22 L 48 70 L 60 32 L 70 64 L 80 42 L 88 56"
              fill="none"
              stroke={strokeColor}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <line x1="88" y1="46" x2="110" y2="20" stroke={arrowColor} strokeWidth="2" strokeDasharray="3 2" />
            <polygon points="110,20 104,22 109,27" fill={arrowColor} />
          </>
        );

      case "bearish-pennant":
        return (
          <>
            <line x1="14" y1="14" x2="40" y2="78" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />
            <line x1="40" y1="78" x2="94" y2="50" stroke="#64748b" strokeWidth="1.5" />
            <line x1="38" y1="24" x2="94" y2="50" stroke="#64748b" strokeWidth="1.5" />
            <path
              d="M 40 78 L 48 30 L 60 68 L 70 36 L 80 58 L 88 44"
              fill="none"
              stroke={strokeColor}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <line x1="88" y1="54" x2="110" y2="80" stroke={arrowColor} strokeWidth="2" strokeDasharray="3 2" />
            <polygon points="110,80 109,73 104,78" fill={arrowColor} />
          </>
        );

      case "bullish-wedge":
        return (
          <>
            <line x1="16" y1="24" x2="100" y2="68" stroke="#64748b" strokeWidth="1.5" />
            <line x1="22" y1="58" x2="100" y2="82" stroke="#64748b" strokeWidth="1.5" />
            <path
              d="M 16 24 L 28 62 L 46 38 L 58 72 L 74 52 L 86 78 L 96 64"
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <line x1="96" y1="64" x2="112" y2="38" stroke={arrowColor} strokeWidth="2" strokeDasharray="3 2" />
            <polygon points="112,38 106,40 110,45" fill={arrowColor} />
          </>
        );

      case "bearish-wedge":
        return (
          <>
            <line x1="16" y1="76" x2="100" y2="32" stroke="#64748b" strokeWidth="1.5" />
            <line x1="22" y1="42" x2="100" y2="18" stroke="#64748b" strokeWidth="1.5" />
            <path
              d="M 16 76 L 28 38 L 46 62 L 58 28 L 74 48 L 86 22 L 96 36"
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <line x1="96" y1="36" x2="112" y2="62" stroke={arrowColor} strokeWidth="2" strokeDasharray="3 2" />
            <polygon points="112,62 110,55 106,60" fill={arrowColor} />
          </>
        );

      case "bullish-rectangle":
        return (
          <>
            <line x1="12" y1="30" x2="106" y2="30" stroke="#64748b" strokeWidth="1.5" />
            <line x1="12" y1="70" x2="106" y2="70" stroke="#64748b" strokeWidth="1.5" />
            <path
              d="M 14 70 L 28 30 L 44 70 L 60 30 L 76 70 L 92 30"
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <line x1="92" y1="30" x2="112" y2="14" stroke={arrowColor} strokeWidth="2" strokeDasharray="3 2" />
            <polygon points="112,14 106,16 111,21" fill={arrowColor} />
          </>
        );

      case "bearish-rectangle":
        return (
          <>
            <line x1="12" y1="30" x2="106" y2="30" stroke="#64748b" strokeWidth="1.5" />
            <line x1="12" y1="70" x2="106" y2="70" stroke="#64748b" strokeWidth="1.5" />
            <path
              d="M 14 30 L 28 70 L 44 30 L 60 70 L 76 30 L 92 70"
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <line x1="92" y1="70" x2="112" y2="86" stroke={arrowColor} strokeWidth="2" strokeDasharray="3 2" />
            <polygon points="112,86 111,79 106,84" fill={arrowColor} />
          </>
        );

      case "triple-bottom":
        return (
          <>
            <line x1="12" y1="34" x2="108" y2="34" stroke="#64748b" strokeWidth="1.5" />
            <path
              d="M 14 34 L 30 76 L 46 34 L 62 76 L 78 34 L 94 76 L 102 34"
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <line x1="102" y1="34" x2="114" y2="16" stroke={arrowColor} strokeWidth="2" strokeDasharray="3 2" />
            <polygon points="114,16 108,18 113,23" fill={arrowColor} />
          </>
        );

      case "triple-top":
        return (
          <>
            <line x1="12" y1="66" x2="108" y2="66" stroke="#64748b" strokeWidth="1.5" />
            <path
              d="M 14 66 L 30 24 L 46 66 L 62 24 L 78 66 L 94 24 L 102 66"
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <line x1="102" y1="66" x2="114" y2="84" stroke={arrowColor} strokeWidth="2" strokeDasharray="3 2" />
            <polygon points="114,84 113,77 108,82" fill={arrowColor} />
          </>
        );

      case "cup-and-handle":
        return (
          <>
            {/* リム（縁）水平ライン */}
            <line x1="10" y1="32" x2="104" y2="32" stroke="#64748b" strokeWidth="1.5" />
            {/* U字型カップ */}
            <path
              d="M 10 32 C 16 88, 70 88, 76 32"
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* 取っ手（ハンドル） */}
            <path
              d="M 76 32 L 88 48 L 98 32"
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <line x1="98" y1="32" x2="112" y2="16" stroke={arrowColor} strokeWidth="2" strokeDasharray="3 2" />
            <polygon points="112,16 106,18 111,23" fill={arrowColor} />
          </>
        );

      case "inverse-cup-and-handle":
        return (
          <>
            <line x1="10" y1="68" x2="104" y2="68" stroke="#64748b" strokeWidth="1.5" />
            {/* 伏せたU字カップ */}
            <path
              d="M 10 68 C 16 12, 70 12, 76 68"
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* 逆ハンドル */}
            <path
              d="M 76 68 L 88 52 L 98 68"
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <line x1="98" y1="68" x2="112" y2="84" stroke={arrowColor} strokeWidth="2" strokeDasharray="3 2" />
            <polygon points="112,84 111,77 106,82" fill={arrowColor} />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <svg viewBox="0 0 124 100" className="w-full h-full select-none" style={{ maxHeight: 110 }}>
      <rect width="124" height="100" fill="#ffffff" rx="4" />
      {renderSchema()}
    </svg>
  );
};

export const CandleChartDiagram: React.FC<PatternDiagramProps> = ({ patternId, isBullish }) => {
  // ローソク足データ生成
  // open, close (close < open => 陽線/緑, close > open => 陰線/赤), high, low
  const renderCandleSeries = () => {
    if (isBullish) {
      // 基本 Bullish 形状（波打って下値を試したのち、右上でEntry/TP）
      switch (patternId) {
        case "inverse-head-and-shoulders":
        case "inverse-hs-variant":
          return (
            <>
              {/* 下降波 */}
              <Candle x={8} open={40} close={48} high={38} low={52} />
              <Candle x={16} open={47} close={58} high={46} low={62} />
              {/* 左肩の底 */}
              <Candle x={24} open={57} close={50} high={48} low={60} />
              <Candle x={32} open={51} close={38} high={36} low={52} />
              {/* ネックライン戻り */}
              <Candle x={40} open={39} close={48} high={37} low={52} />
              <Candle x={48} open={47} close={68} high={46} low={72} />
              {/* 頭(H)の底 */}
              <Candle x={56} open={67} close={76} high={66} low={80} />
              <Candle x={64} open={75} close={62} high={60} low={78} />
              <Candle x={72} open={63} close={48} high={46} low={65} />
              <Candle x={80} open={49} close={38} high={36} low={51} />
              {/* 右肩の底 */}
              <Candle x={88} open={39} close={49} high={37} low={54} />
              <Candle x={96} open={48} close={56} high={46} low={60} />
              <Candle x={104} open={55} close={46} high={44} low={58} />
              <Candle x={112} open={47} close={37} high={35} low={49} />
              {/* ネックライン突破 */}
              <Candle x={120} open={38} close={28} high={26} low={40} />
              {/* 急伸波 */}
              <Candle x={128} open={29} close={22} high={20} low={31} />
              <Candle x={136} open={23} close={14} high={12} low={25} />
              <Candle x={144} open={15} close={8} high={6} low={17} />

              {/* ネックライン */}
              <line x1="36" y1="36" x2="135" y2="36" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* Entry Long */}
              <line x1="125" y1="30" x2="155" y2="30" stroke="#16a34a" strokeWidth="1" />
              <polygon points="125,30 131,27 131,33" fill="#16a34a" />
              <text x="160" y="33" fontSize="8.5" fontWeight="bold" fill="#16a34a">Entry Long</text>
              {/* SL (Stop Loss) */}
              <line x1="94" y1="62" x2="185" y2="62" stroke="#dc2626" strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="65" fontSize="8.5" fontWeight="bold" fill="#dc2626">SL</text>
              {/* TP (Take Profit) */}
              <line x1="140" y1="10" x2="185" y2="10" stroke="#16a34a" strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="13" fontSize="8.5" fontWeight="bold" fill="#16a34a">TP</text>
            </>
          );

        case "double-bottom":
        case "triple-bottom":
          return (
            <>
              <Candle x={10} open={34} close={46} high={32} low={50} />
              <Candle x={18} open={45} close={62} high={43} low={66} />
              {/* 1番底 */}
              <Candle x={26} open={61} close={74} high={59} low={78} />
              <Candle x={34} open={73} close={60} high={58} low={76} />
              <Candle x={42} open={61} close={44} high={42} low={63} />
              {/* 中央ネックライン高値 */}
              <Candle x={50} open={45} close={36} high={34} low={47} />
              <Candle x={58} open={37} close={50} high={35} low={53} />
              <Candle x={66} open={49} close={65} high={47} low={68} />
              {/* 2番底 */}
              <Candle x={74} open={64} close={73} high={62} low={77} />
              <Candle x={82} open={72} close={58} high={56} low={75} />
              <Candle x={90} open={59} close={45} high={43} low={61} />
              {/* ブレイク */}
              <Candle x={98} open={46} close={34} high={32} low={48} />
              <Candle x={106} open={35} close={24} high={22} low={37} />
              <Candle x={114} open={25} close={14} high={12} low={27} />
              <Candle x={122} open={15} close={7} high={5} low={17} />

              <line x1="46" y1="35" x2="110" y2="35" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* Entry */}
              <line x1="102" y1="28" x2="148" y2="28" stroke="#16a34a" strokeWidth="1" />
              <polygon points="102,28 108,25 108,31" fill="#16a34a" />
              <text x="152" y="31" fontSize="8.5" fontWeight="bold" fill="#16a34a">Entry Long</text>
              {/* SL */}
              <line x1="72" y1="78" x2="185" y2="78" stroke="#dc2626" strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="81" fontSize="8.5" fontWeight="bold" fill="#dc2626">SL</text>
              {/* TP */}
              <line x1="118" y1="8" x2="185" y2="8" stroke="#16a34a" strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="11" fontSize="8.5" fontWeight="bold" fill="#16a34a">TP</text>
            </>
          );

        case "bullish-flag":
        case "bullish-pennant":
        case "descending-triangle-bullish":
        case "bullish-wedge":
        case "bullish-rectangle":
        case "cup-and-handle":
        default:
          return (
            <>
              {/* 急伸ポール */}
              <Candle x={8} open={78} close={64} high={62} low={80} />
              <Candle x={16} open={65} close={48} high={46} low={67} />
              <Candle x={24} open={49} close={30} high={28} low={51} />
              {/* もみ合い・調整（旗・カップ・保ち合い） */}
              <Candle x={32} open={31} close={42} high={29} low={44} />
              <Candle x={40} open={41} close={50} high={39} low={53} />
              <Candle x={48} open={49} close={39} high={37} low={51} />
              <Candle x={56} open={40} close={48} high={38} low={52} />
              <Candle x={64} open={47} close={56} high={45} low={58} />
              <Candle x={72} open={55} close={44} high={42} low={57} />
              <Candle x={80} open={45} close={38} high={36} low={47} />
              {/* ブレイクアウト */}
              <Candle x={88} open={39} close={26} high={24} low={41} />
              <Candle x={96} open={27} close={18} high={16} low={29} />
              <Candle x={104} open={19} close={10} high={8} low={21} />

              {/* 上値抵抗線 */}
              <line x1="28" y1="30" x2="92" y2="38" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* Entry */}
              <line x1="92" y1="24" x2="148" y2="24" stroke="#16a34a" strokeWidth="1" />
              <polygon points="92,24 98,21 98,27" fill="#16a34a" />
              <text x="152" y="27" fontSize="8.5" fontWeight="bold" fill="#16a34a">Entry Long</text>
              {/* SL */}
              <line x1="62" y1="58" x2="185" y2="58" stroke="#dc2626" strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="61" fontSize="8.5" fontWeight="bold" fill="#dc2626">SL</text>
              {/* TP */}
              <line x1="100" y1="10" x2="185" y2="10" stroke="#16a34a" strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="13" fontSize="8.5" fontWeight="bold" fill="#16a34a">TP</text>
            </>
          );
      }
    } else {
      // 基本 Bearish 形状（波打って天井を形成後、右下へEntry/TP）
      switch (patternId) {
        case "head-and-shoulders":
          return (
            <>
              {/* 上昇波 */}
              <Candle x={8} open={56} close={46} high={44} low={58} />
              <Candle x={16} open={47} close={34} high={32} low={49} />
              {/* 左肩の頂点 */}
              <Candle x={24} open={35} close={42} high={30} low={44} />
              <Candle x={32} open={41} close={56} high={39} low={58} />
              {/* ネックライン押し安値 */}
              <Candle x={40} open={55} close={46} high={44} low={57} />
              <Candle x={48} open={47} close={24} high={22} low={49} />
              {/* 頭(H)の頂点 */}
              <Candle x={56} open={25} close={14} high={12} low={27} />
              <Candle x={64} open={15} close={28} high={13} low={30} />
              <Candle x={72} open={27} close={48} high={25} low={50} />
              <Candle x={80} open={47} close={57} high={45} low={59} />
              {/* 右肩の頂点 */}
              <Candle x={88} open={56} close={44} high={42} low={58} />
              <Candle x={96} open={45} close={36} high={34} low={47} />
              <Candle x={104} open={37} close={48} high={35} low={50} />
              <Candle x={112} open={47} close={59} high={45} low={61} />
              {/* ネックライン割れ */}
              <Candle x={120} open={58} close={70} high={56} low={72} />
              {/* 急落 */}
              <Candle x={128} open={69} close={78} high={67} low={80} />
              <Candle x={136} open={77} close={86} high={75} low={88} />

              {/* ネックライン */}
              <line x1="36" y1="58" x2="130" y2="58" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* Entry Short */}
              <line x1="124" y1="68" x2="152" y2="68" stroke="#dc2626" strokeWidth="1" />
              <polygon points="124,68 130,65 130,71" fill="#dc2626" />
              <text x="156" y="71" fontSize="8.5" fontWeight="bold" fill="#dc2626">Entry Short</text>
              {/* SL */}
              <line x1="94" y1="34" x2="185" y2="34" stroke="#dc2626" strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="37" fontSize="8.5" fontWeight="bold" fill="#dc2626">SL</text>
              {/* TP */}
              <line x1="134" y1="88" x2="185" y2="88" stroke="#16a34a" strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="91" fontSize="8.5" fontWeight="bold" fill="#16a34a">TP</text>
            </>
          );

        case "double-top":
        case "double-top-variation":
        case "triple-top":
          return (
            <>
              <Candle x={10} open={64} close={48} high={46} low={66} />
              <Candle x={18} open={49} close={32} high={30} low={51} />
              {/* 1番天井 */}
              <Candle x={26} open={33} close={20} high={18} low={35} />
              <Candle x={34} open={21} close={34} high={19} low={36} />
              <Candle x={42} open={33} close={50} high={31} low={52} />
              {/* 中央谷 */}
              <Candle x={50} open={49} close={58} high={47} low={60} />
              <Candle x={58} open={57} close={44} high={42} low={59} />
              <Candle x={66} open={45} close={28} high={26} low={47} />
              {/* 2番天井 */}
              <Candle x={74} open={29} close={21} high={19} low={31} />
              <Candle x={82} open={22} close={36} high={20} low={38} />
              <Candle x={90} open={35} close={52} high={33} low={54} />
              {/* ネックライン割り込み */}
              <Candle x={98} open={51} close={66} high={49} low={68} />
              <Candle x={106} open={65} close={76} high={63} low={78} />
              <Candle x={114} open={75} close={86} high={73} low={88} />

              <line x1="46" y1="58" x2="110" y2="58" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* Entry */}
              <line x1="102" y1="66" x2="150" y2="66" stroke="#dc2626" strokeWidth="1" />
              <polygon points="102,66 108,63 108,69" fill="#dc2626" />
              <text x="154" y="69" fontSize="8.5" fontWeight="bold" fill="#dc2626">Entry Short</text>
              {/* SL */}
              <line x1="72" y1="18" x2="185" y2="18" stroke="#dc2626" strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="21" fontSize="8.5" fontWeight="bold" fill="#dc2626">SL</text>
              {/* TP */}
              <line x1="110" y1="88" x2="185" y2="88" stroke="#16a34a" strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="91" fontSize="8.5" fontWeight="bold" fill="#16a34a">TP</text>
            </>
          );

        case "bearish-flag":
        case "bearish-pennant":
        case "ascending-triangle-bearish":
        case "bearish-wedge":
        case "bearish-rectangle":
        case "inverse-cup-and-handle":
        default:
          return (
            <>
              {/* 急落ポール */}
              <Candle x={8} open={18} close={34} high={16} low={36} />
              <Candle x={16} open={33} close={52} high={31} low={54} />
              <Candle x={24} open={51} close={70} high={49} low={72} />
              {/* 戻り・もみ合い（旗・保ち合い） */}
              <Candle x={32} open={69} close={58} high={56} low={71} />
              <Candle x={40} open={59} close={50} high={48} low={61} />
              <Candle x={48} open={51} close={61} high={49} low={63} />
              <Candle x={56} open={60} close={52} high={50} low={62} />
              <Candle x={64} open={53} close={44} high={42} low={55} />
              <Candle x={72} open={45} close={56} high={43} low={58} />
              <Candle x={80} open={55} close={64} high={53} low={66} />
              {/* 下抜け */}
              <Candle x={88} open={63} close={76} high={61} low={78} />
              <Candle x={96} open={75} close={84} high={73} low={86} />

              <line x1="28" y1="70" x2="90" y2="62" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* Entry */}
              <line x1="90" y1="74" x2="150" y2="74" stroke="#dc2626" strokeWidth="1" />
              <polygon points="90,74 96,71 96,77" fill="#dc2626" />
              <text x="154" y="77" fontSize="8.5" fontWeight="bold" fill="#dc2626">Entry Short</text>
              {/* SL */}
              <line x1="60" y1="42" x2="185" y2="42" stroke="#dc2626" strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="45" fontSize="8.5" fontWeight="bold" fill="#dc2626">SL</text>
              {/* TP */}
              <line x1="96" y1="88" x2="185" y2="88" stroke="#16a34a" strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="91" fontSize="8.5" fontWeight="bold" fill="#16a34a">TP</text>
            </>
          );
      }
    }
  };

  return (
    <svg viewBox="0 0 220 100" className="w-full h-full select-none" style={{ maxHeight: 110 }}>
      <rect width="220" height="100" fill="#ffffff" rx="4" />
      {/* うっすらグリッド線 */}
      <line x1="0" y1="25" x2="220" y2="25" stroke="#f1f5f9" strokeWidth="0.8" />
      <line x1="0" y1="50" x2="220" y2="50" stroke="#f1f5f9" strokeWidth="0.8" />
      <line x1="0" y1="75" x2="220" y2="75" stroke="#f1f5f9" strokeWidth="0.8" />
      {renderCandleSeries()}
    </svg>
  );
};
