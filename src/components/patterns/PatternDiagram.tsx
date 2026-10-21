export type PatternColorMode = "jp" | "global";

interface PatternDiagramProps {
  patternId: string;
  isBullish: boolean;
  colorMode?: PatternColorMode;
}

// 共通ローソク足描画ヘルパー
const Candle: React.FC<{
  x: number;
  open: number;
  close: number;
  high: number;
  low: number;
  width?: number;
  colorMode?: PatternColorMode;
}> = ({ x, open, close, high, low, width = 5, colorMode = "jp" }) => {
  const isUp = close < open; // SVG座標系ではY軸が下向きなので close < open が上昇（陽線）
  // 日本標準: 上昇(陽線)=赤, 下落(陰線)=青
  // グローバル: 上昇(陽線)=緑, 下落(陰線)=赤
  const color = colorMode === "jp"
    ? isUp ? "#dc2626" : "#2563eb"
    : isUp ? "#16a34a" : "#dc2626";
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

export const SchemaDiagram: React.FC<PatternDiagramProps> = ({ patternId, isBullish, colorMode = "jp" }) => {
  const strokeColor = "#1e293b";
  const bullishColor = colorMode === "jp" ? "#dc2626" : "#16a34a";
  const bearishColor = colorMode === "jp" ? "#2563eb" : "#dc2626";
  const arrowColor = isBullish ? bullishColor : bearishColor;

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

export const CandleChartDiagram: React.FC<PatternDiagramProps> = ({ patternId, isBullish, colorMode = "jp" }) => {
  // カラー定数
  const longColor = colorMode === "jp" ? "#dc2626" : "#16a34a"; // 買い/利確
  const shortColor = colorMode === "jp" ? "#2563eb" : "#dc2626"; // 売り/損切り(買い時)/利確(売り時)
  const tpColor = isBullish ? longColor : shortColor;
  const slColor = isBullish ? shortColor : longColor;

  const C: React.FC<{ x: number; open: number; close: number; high: number; low: number }> = (props) => (
    <Candle {...props} colorMode={colorMode} />
  );

  // ローソク足データ生成
  const renderCandleSeries = () => {
    if (isBullish) {
      // 基本 Bullish 形状（波打って下値を試したのち、右上でEntry/TP）
      switch (patternId) {
        case "inverse-head-and-shoulders":
        case "inverse-hs-variant":
          return (
            <>
              {/* 下降波 */}
              <C x={8} open={40} close={48} high={38} low={52} />
              <C x={16} open={47} close={58} high={46} low={62} />
              {/* 左肩の底 */}
              <C x={24} open={57} close={50} high={48} low={60} />
              <C x={32} open={51} close={38} high={36} low={52} />
              {/* ネックライン戻り */}
              <C x={40} open={39} close={48} high={37} low={52} />
              <C x={48} open={47} close={68} high={46} low={72} />
              {/* 頭(H)の底 */}
              <C x={56} open={67} close={76} high={66} low={80} />
              <C x={64} open={75} close={62} high={60} low={78} />
              <C x={72} open={63} close={48} high={46} low={65} />
              <C x={80} open={49} close={38} high={36} low={51} />
              {/* 右肩の底 */}
              <C x={88} open={39} close={49} high={37} low={54} />
              <C x={96} open={48} close={56} high={46} low={60} />
              <C x={104} open={55} close={46} high={44} low={58} />
              <C x={112} open={47} close={37} high={35} low={49} />
              {/* ネックライン突破 */}
              <C x={120} open={38} close={28} high={26} low={40} />
              {/* 急伸波 */}
              <C x={128} open={29} close={22} high={20} low={31} />
              <C x={136} open={23} close={14} high={12} low={25} />
              <C x={144} open={15} close={8} high={6} low={17} />

              {/* ネックライン */}
              <line x1="36" y1="36" x2="135" y2="36" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* Entry Long */}
              <line x1="125" y1="30" x2="155" y2="30" stroke={longColor} strokeWidth="1" />
              <polygon points="125,30 131,27 131,33" fill={longColor} />
              <text x="160" y="33" fontSize="8.5" fontWeight="bold" fill={longColor}>Entry Long</text>
              {/* SL (Stop Loss) */}
              <line x1="94" y1="62" x2="185" y2="62" stroke={slColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="65" fontSize="8.5" fontWeight="bold" fill={slColor}>SL</text>
              {/* TP (Take Profit) */}
              <line x1="140" y1="10" x2="185" y2="10" stroke={tpColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="13" fontSize="8.5" fontWeight="bold" fill={tpColor}>TP</text>
            </>
          );

        case "double-bottom":
          return (
            <>
              <C x={10} open={34} close={46} high={32} low={50} />
              <C x={18} open={45} close={62} high={43} low={66} />
              {/* 1番底 */}
              <C x={26} open={61} close={74} high={59} low={78} />
              <C x={34} open={73} close={60} high={58} low={76} />
              <C x={42} open={61} close={44} high={42} low={63} />
              {/* 中央ネックライン高値 */}
              <C x={50} open={45} close={36} high={34} low={47} />
              <C x={58} open={37} close={50} high={35} low={53} />
              <C x={66} open={49} close={65} high={47} low={68} />
              {/* 2番底 */}
              <C x={74} open={64} close={73} high={62} low={77} />
              <C x={82} open={72} close={58} high={56} low={75} />
              <C x={90} open={59} close={45} high={43} low={61} />
              {/* ネックラインブレイク */}
              <C x={98} open={46} close={34} high={32} low={48} />
              <C x={106} open={35} close={24} high={22} low={37} />
              <C x={114} open={25} close={14} high={12} low={27} />
              <C x={122} open={15} close={7} high={5} low={17} />

              <line x1="46" y1="35" x2="110" y2="35" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* Entry */}
              <line x1="102" y1="28" x2="148" y2="28" stroke={longColor} strokeWidth="1" />
              <polygon points="102,28 108,25 108,31" fill={longColor} />
              <text x="152" y="31" fontSize="8.5" fontWeight="bold" fill={longColor}>Entry Long</text>
              {/* SL */}
              <line x1="72" y1="78" x2="185" y2="78" stroke={slColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="81" fontSize="8.5" fontWeight="bold" fill={slColor}>SL</text>
              {/* TP */}
              <line x1="118" y1="8" x2="185" y2="8" stroke={tpColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="11" fontSize="8.5" fontWeight="bold" fill={tpColor}>TP</text>
            </>
          );

        case "triple-bottom":
          return (
            <>
              {/* 下降波 */}
              <C x={6} open={34} close={50} high={32} low={52} />
              {/* 1番底 */}
              <C x={13} open={51} close={74} high={49} low={78} />
              <C x={20} open={73} close={56} high={54} low={75} />
              <C x={27} open={55} close={38} high={36} low={57} />
              {/* 山1 (ネックライン) */}
              <C x={34} open={39} close={52} high={37} low={54} />
              {/* 2番底 */}
              <C x={41} open={53} close={75} high={51} low={78} />
              <C x={48} open={74} close={55} high={53} low={76} />
              <C x={55} open={54} close={38} high={36} low={56} />
              {/* 山2 (ネックライン) */}
              <C x={62} open={39} close={54} high={37} low={56} />
              {/* 3番底 */}
              <C x={69} open={55} close={73} high={53} low={76} />
              <C x={76} open={72} close={54} high={52} low={74} />
              <C x={83} open={53} close={39} high={37} low={55} />
              {/* ネックライン突破ブレイク */}
              <C x={90} open={38} close={25} high={23} low={40} />
              <C x={97} open={24} close={15} high={13} low={26} />
              <C x={104} open={14} close={7} high={5} low={16} />

              {/* ネックライン */}
              <line x1="26" y1="37" x2="98" y2="37" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* 3底サポートライン */}
              <line x1="12" y1="78" x2="78" y2="78" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* Entry */}
              <line x1="94" y1="28" x2="148" y2="28" stroke={longColor} strokeWidth="1" />
              <polygon points="94,28 100,25 100,31" fill={longColor} />
              <text x="152" y="31" fontSize="8.5" fontWeight="bold" fill={longColor}>Entry Long</text>
              {/* SL */}
              <line x1="72" y1="78" x2="185" y2="78" stroke={slColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="81" fontSize="8.5" fontWeight="bold" fill={slColor}>SL</text>
              {/* TP */}
              <line x1="104" y1="8" x2="185" y2="8" stroke={tpColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="11" fontSize="8.5" fontWeight="bold" fill={tpColor}>TP</text>
            </>
          );

        case "bullish-wedge":
          return (
            <>
              {/* 下降ウェッジ（下向きに先細り収束していくローソク足） */}
              <C x={8} open={28} close={42} high={26} low={44} />
              <C x={16} open={43} close={62} high={41} low={65} />
              {/* 波1: 高値1(Y=34) */}
              <C x={24} open={61} close={46} high={44} low={63} />
              <C x={32} open={45} close={34} high={32} low={47} />
              {/* 波2: 安値1(Y=72) */}
              <C x={40} open={35} close={48} high={33} low={50} />
              <C x={48} open={49} close={68} high={47} low={72} />
              {/* 波3: 高値2(Y=44 切り下げ) */}
              <C x={56} open={67} close={54} high={52} low={69} />
              <C x={64} open={53} close={44} high={42} low={55} />
              {/* 波4: 安値2(Y=76 切り下げだが幅狭まる) */}
              <C x={72} open={45} close={58} high={43} low={60} />
              <C x={80} open={59} close={74} high={57} low={76} />
              {/* 波5: 高値3(Y=52 先細り) */}
              <C x={88} open={73} close={62} high={60} low={75} />
              <C x={96} open={61} close={52} high={50} low={63} />
              {/* 波6: 安値3(Y=78) */}
              <C x={104} open={53} close={66} high={51} low={68} />
              <C x={112} open={67} close={77} high={65} low={78} />
              {/* ウェッジ上限ブレイクアウト */}
              <C x={120} open={76} close={56} high={54} low={78} />
              <C x={128} open={55} close={36} high={34} low={58} />
              {/* 急伸波 */}
              <C x={136} open={35} close={22} high={20} low={37} />
              <C x={144} open={21} close={10} high={8} low={23} />

              {/* 上辺切り下げトレンドライン */}
              <line x1="30" y1="32" x2="126" y2="54" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* 下辺切り下げサポートライン（先細り） */}
              <line x1="16" y1="65" x2="118" y2="79" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* Entry */}
              <line x1="130" y1="32" x2="158" y2="32" stroke={longColor} strokeWidth="1" />
              <polygon points="130,32 136,29 136,35" fill={longColor} />
              <text x="162" y="35" fontSize="8.5" fontWeight="bold" fill={longColor}>Entry Long</text>
              {/* SL */}
              <line x1="108" y1="80" x2="190" y2="80" stroke={slColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="194" y="83" fontSize="8.5" fontWeight="bold" fill={slColor}>SL</text>
              {/* TP */}
              <line x1="140" y1="10" x2="190" y2="10" stroke={tpColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="194" y="13" fontSize="8.5" fontWeight="bold" fill={tpColor}>TP</text>
            </>
          );

        case "bullish-rectangle":
          return (
            <>
              {/* 上昇急騰から水平ボックスへ */}
              <C x={8} open={80} close={62} high={60} low={82} />
              <C x={16} open={61} close={46} high={44} low={63} />
              <C x={24} open={45} close={32} high={30} low={47} />
              {/* ボックス上限タッチ1(Y=32) -> 下限へ */}
              <C x={32} open={33} close={48} high={31} low={50} />
              <C x={40} open={49} close={68} high={47} low={70} />
              {/* ボックス下限タッチ1(Y=68) -> 上限へ */}
              <C x={48} open={67} close={52} high={50} low={69} />
              <C x={56} open={51} close={32} high={30} low={53} />
              {/* ボックス上限タッチ2(Y=32) -> 下限へ */}
              <C x={64} open={33} close={50} high={31} low={52} />
              <C x={72} open={51} close={68} high={49} low={70} />
              {/* ボックス下限タッチ2(Y=68) -> 上限突破へ */}
              <C x={80} open={67} close={50} high={48} low={69} />
              <C x={88} open={49} close={34} high={32} low={51} />
              <C x={96} open={33} close={20} high={18} low={35} />
              {/* 急伸波 */}
              <C x={104} open={19} close={12} high={10} low={21} />
              <C x={112} open={11} close={6} high={4} low={13} />

              {/* ボックス水平レジスタンス */}
              <line x1="20" y1="32" x2="102" y2="32" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* ボックス水平サポート */}
              <line x1="20" y1="68" x2="86" y2="68" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* Entry */}
              <line x1="100" y1="24" x2="148" y2="24" stroke={longColor} strokeWidth="1" />
              <polygon points="100,24 106,21 106,27" fill={longColor} />
              <text x="152" y="27" fontSize="8.5" fontWeight="bold" fill={longColor}>Entry Long</text>
              {/* SL */}
              <line x1="68" y1="70" x2="185" y2="70" stroke={slColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="73" fontSize="8.5" fontWeight="bold" fill={slColor}>SL</text>
              {/* TP */}
              <line x1="108" y1="8" x2="185" y2="8" stroke={tpColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="11" fontSize="8.5" fontWeight="bold" fill={tpColor}>TP</text>
            </>
          );

        case "cup-and-handle":
          return (
            <>
              {/* 左リム高値 */}
              <C x={8} open={48} close={32} high={30} low={50} />
              {/* U字カップ左側（急から緩やかに底へ） */}
              <C x={15} open={33} close={48} high={31} low={50} />
              <C x={22} open={49} close={64} high={47} low={66} />
              <C x={29} open={65} close={74} high={63} low={76} />
              {/* U字丸底（時間をかけてじっくり） */}
              <C x={36} open={75} close={78} high={73} low={80} />
              <C x={43} open={78} close={76} high={74} low={80} />
              <C x={50} open={77} close={72} high={70} low={79} />
              {/* U字カップ右側（緩やかに右リムへ上昇） */}
              <C x={57} open={71} close={60} high={58} low={73} />
              <C x={64} open={59} close={46} high={44} low={61} />
              <C x={71} open={45} close={32} high={30} low={47} />
              {/* 取っ手（ハンドル: 浅い押し目下向き小チャネル） */}
              <C x={78} open={33} close={42} high={31} low={44} />
              <C x={85} open={43} close={46} high={41} low={48} />
              <C x={92} open={45} close={36} high={34} low={47} />
              {/* カップ高値ブレイクアウト */}
              <C x={99} open={35} close={22} high={20} low={37} />
              <C x={106} open={21} close={12} high={10} low={23} />
              <C x={113} open={11} close={6} high={4} low={13} />

              {/* リム高値ピボット水平線 */}
              <line x1="8" y1="31" x2="105" y2="31" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* ハンドル下降トレンドライン */}
              <line x1="71" y1="31" x2="92" y2="44" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* Entry */}
              <line x1="102" y1="24" x2="148" y2="24" stroke={longColor} strokeWidth="1" />
              <polygon points="102,24 108,21 108,27" fill={longColor} />
              <text x="152" y="27" fontSize="8.5" fontWeight="bold" fill={longColor}>Entry Long</text>
              {/* SL */}
              <line x1="82" y1="50" x2="185" y2="50" stroke={slColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="53" fontSize="8.5" fontWeight="bold" fill={slColor}>SL</text>
              {/* TP */}
              <line x1="110" y1="8" x2="185" y2="8" stroke={tpColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="11" fontSize="8.5" fontWeight="bold" fill={tpColor}>TP</text>
            </>
          );

        case "bullish-flag":
          return (
            <>
              {/* 急伸ポール */}
              <C x={8} open={84} close={66} high={64} low={86} />
              <C x={15} open={65} close={44} high={42} low={67} />
              <C x={22} open={43} close={24} high={22} low={45} />
              {/* フラッグ（下向き平行チャネル） */}
              <C x={29} open={25} close={36} high={23} low={38} />
              <C x={36} open={37} close={46} high={35} low={48} />
              <C x={43} open={45} close={34} high={32} low={47} />
              <C x={50} open={35} close={44} high={33} low={46} />
              <C x={57} open={45} close={54} high={43} low={56} />
              <C x={64} open={53} close={42} high={40} low={55} />
              {/* 上放れブレイク */}
              <C x={71} open={41} close={28} high={26} low={43} />
              <C x={78} open={27} close={18} high={16} low={29} />
              <C x={85} open={17} close={8} high={6} low={19} />

              {/* チャネル上辺 */}
              <line x1="22" y1="24" x2="72" y2="40" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* チャネル下辺 */}
              <line x1="28" y1="42" x2="78" y2="58" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* Entry */}
              <line x1="75" y1="24" x2="148" y2="24" stroke={longColor} strokeWidth="1" />
              <polygon points="75,24 81,21 81,27" fill={longColor} />
              <text x="152" y="27" fontSize="8.5" fontWeight="bold" fill={longColor}>Entry Long</text>
              {/* SL */}
              <line x1="56" y1="58" x2="185" y2="58" stroke={slColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="61" fontSize="8.5" fontWeight="bold" fill={slColor}>SL</text>
              {/* TP */}
              <line x1="84" y1="8" x2="185" y2="8" stroke={tpColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="11" fontSize="8.5" fontWeight="bold" fill={tpColor}>TP</text>
            </>
          );

        case "bullish-pennant":
          return (
            <>
              {/* 急伸ポール */}
              <C x={8} open={84} close={66} high={64} low={86} />
              <C x={15} open={65} close={44} high={42} low={67} />
              <C x={22} open={43} close={24} high={22} low={45} />
              {/* ペナント（高値切り下げ・安値切り上げの左右対称収束） */}
              <C x={29} open={25} close={40} high={23} low={42} />
              <C x={36} open={41} close={56} high={39} low={58} />
              <C x={43} open={55} close={34} high={32} low={57} />
              <C x={50} open={35} close={48} high={33} low={50} />
              <C x={57} open={47} close={38} high={36} low={49} />
              <C x={64} open={39} close={44} high={37} low={46} />
              {/* ペナント上抜けブレイク */}
              <C x={71} open={43} close={28} high={26} low={45} />
              <C x={78} open={27} close={16} high={14} low={29} />
              <C x={85} open={15} close={8} high={6} low={17} />

              {/* 上辺収縮線 */}
              <line x1="22" y1="24" x2="70" y2="38" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* 下辺収縮線 */}
              <line x1="36" y1="58" x2="70" y2="44" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* Entry */}
              <line x1="75" y1="26" x2="148" y2="26" stroke={longColor} strokeWidth="1" />
              <polygon points="75,26 81,23 81,29" fill={longColor} />
              <text x="152" y="29" fontSize="8.5" fontWeight="bold" fill={longColor}>Entry Long</text>
              {/* SL */}
              <line x1="48" y1="54" x2="185" y2="54" stroke={slColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="57" fontSize="8.5" fontWeight="bold" fill={slColor}>SL</text>
              {/* TP */}
              <line x1="84" y1="8" x2="185" y2="8" stroke={tpColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="11" fontSize="8.5" fontWeight="bold" fill={tpColor}>TP</text>
            </>
          );

        case "descending-triangle-bullish":
        default:
          return (
            <>
              {/* 上値切り下げ ＆ 水平サポート */}
              <C x={8} open={42} close={24} high={22} low={44} />
              <C x={16} open={25} close={48} high={23} low={50} />
              <C x={24} open={49} close={70} high={47} low={72} />
              {/* 水平サポートタッチ1 */}
              <C x={32} open={69} close={52} high={50} low={71} />
              <C x={40} open={51} close={36} high={34} low={53} />
              {/* 高値2(切り下げ) */}
              <C x={48} open={37} close={54} high={35} low={56} />
              <C x={56} open={55} close={70} high={53} low={72} />
              {/* 水平サポートタッチ2 */}
              <C x={64} open={69} close={58} high={56} low={71} />
              <C x={72} open={57} close={46} high={44} low={59} />
              {/* 高値3(さらに切り下げ) */}
              <C x={80} open={47} close={60} high={45} low={62} />
              <C x={88} open={59} close={70} high={57} low={72} />
              {/* 水平サポートタッチ3から上放れ */}
              <C x={96} open={69} close={48} high={46} low={71} />
              <C x={104} open={47} close={28} high={26} low={49} />
              <C x={112} open={27} close={16} high={14} low={29} />
              <C x={120} open={15} close={8} high={6} low={17} />

              {/* 切り下がる上辺トレンドライン */}
              <line x1="8" y1="24" x2="98" y2="52" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* 水平下辺サポートライン */}
              <line x1="16" y1="72" x2="104" y2="72" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* Entry */}
              <line x1="106" y1="26" x2="152" y2="26" stroke={longColor} strokeWidth="1" />
              <polygon points="106,26 112,23 112,29" fill={longColor} />
              <text x="156" y="29" fontSize="8.5" fontWeight="bold" fill={longColor}>Entry Long</text>
              {/* SL */}
              <line x1="80" y1="74" x2="185" y2="74" stroke={slColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="77" fontSize="8.5" fontWeight="bold" fill={slColor}>SL</text>
              {/* TP */}
              <line x1="114" y1="8" x2="185" y2="8" stroke={tpColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="11" fontSize="8.5" fontWeight="bold" fill={tpColor}>TP</text>
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
              <C x={8} open={56} close={46} high={44} low={58} />
              <C x={16} open={47} close={34} high={32} low={49} />
              {/* 左肩の頂点 */}
              <C x={24} open={35} close={42} high={30} low={44} />
              <C x={32} open={41} close={56} high={39} low={58} />
              {/* ネックライン押し安値 */}
              <C x={40} open={55} close={46} high={44} low={57} />
              <C x={48} open={47} close={24} high={22} low={49} />
              {/* 頭(H)の頂点 */}
              <C x={56} open={25} close={14} high={12} low={27} />
              <C x={64} open={15} close={28} high={13} low={30} />
              <C x={72} open={27} close={48} high={25} low={50} />
              <C x={80} open={47} close={57} high={45} low={59} />
              {/* 右肩の頂点 */}
              <C x={88} open={56} close={44} high={42} low={58} />
              <C x={96} open={45} close={36} high={34} low={47} />
              <C x={104} open={37} close={48} high={35} low={50} />
              <C x={112} open={47} close={59} high={45} low={61} />
              {/* ネックライン割れ */}
              <C x={120} open={58} close={70} high={56} low={72} />
              {/* 急落 */}
              <C x={128} open={69} close={78} high={67} low={80} />
              <C x={136} open={77} close={86} high={75} low={88} />

              {/* ネックライン */}
              <line x1="36" y1="58" x2="130" y2="58" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* Entry Short */}
              <line x1="124" y1="68" x2="152" y2="68" stroke={shortColor} strokeWidth="1" />
              <polygon points="124,68 130,65 130,71" fill={shortColor} />
              <text x="156" y="71" fontSize="8.5" fontWeight="bold" fill={shortColor}>Entry Short</text>
              {/* SL */}
              <line x1="94" y1="34" x2="185" y2="34" stroke={slColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="37" fontSize="8.5" fontWeight="bold" fill={slColor}>SL</text>
              {/* TP */}
              <line x1="134" y1="88" x2="185" y2="88" stroke={tpColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="91" fontSize="8.5" fontWeight="bold" fill={tpColor}>TP</text>
            </>
          );

        case "double-top":
        case "double-top-variation":
          return (
            <>
              <C x={10} open={64} close={48} high={46} low={66} />
              <C x={18} open={49} close={32} high={30} low={51} />
              {/* 1番天井 */}
              <C x={26} open={33} close={20} high={18} low={35} />
              <C x={34} open={21} close={34} high={19} low={36} />
              <C x={42} open={33} close={50} high={31} low={52} />
              {/* 中央谷 */}
              <C x={50} open={49} close={58} high={47} low={60} />
              <C x={58} open={57} close={44} high={42} low={59} />
              <C x={66} open={45} close={28} high={26} low={47} />
              {/* 2番天井 */}
              <C x={74} open={29} close={21} high={19} low={31} />
              <C x={82} open={22} close={36} high={20} low={38} />
              <C x={90} open={35} close={52} high={33} low={54} />
              {/* ネックライン割り込み */}
              <C x={98} open={51} close={66} high={49} low={68} />
              <C x={106} open={65} close={76} high={63} low={78} />
              <C x={114} open={75} close={86} high={73} low={88} />

              <line x1="46" y1="58" x2="110" y2="58" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* Entry */}
              <line x1="102" y1="66" x2="150" y2="66" stroke={shortColor} strokeWidth="1" />
              <polygon points="102,66 108,63 108,69" fill={shortColor} />
              <text x="154" y="69" fontSize="8.5" fontWeight="bold" fill={shortColor}>Entry Short</text>
              {/* SL */}
              <line x1="72" y1="18" x2="185" y2="18" stroke={slColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="21" fontSize="8.5" fontWeight="bold" fill={slColor}>SL</text>
              {/* TP */}
              <line x1="110" y1="88" x2="185" y2="88" stroke={tpColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="91" fontSize="8.5" fontWeight="bold" fill={tpColor}>TP</text>
            </>
          );

        case "triple-top":
          return (
            <>
              {/* 上昇波 */}
              <C x={6} open={64} close={48} high={46} low={66} />
              {/* 1番天井 */}
              <C x={13} open={47} close={24} high={22} low={49} />
              <C x={20} open={25} close={42} high={23} low={44} />
              <C x={27} open={43} close={62} high={41} low={64} />
              {/* 谷1 (ネックライン) */}
              <C x={34} open={61} close={46} high={44} low={63} />
              {/* 2番天井 */}
              <C x={41} open={45} close={24} high={22} low={47} />
              <C x={48} open={25} close={44} high={23} low={46} />
              <C x={55} open={45} close={62} high={43} low={64} />
              {/* 谷2 (ネックライン) */}
              <C x={62} open={61} close={45} high={43} low={63} />
              {/* 3番天井 */}
              <C x={69} open={44} close={25} high={23} low={46} />
              <C x={76} open={26} close={45} high={24} low={47} />
              <C x={83} open={46} close={61} high={44} low={63} />
              {/* ネックライン割り込みブレイク */}
              <C x={90} open={62} close={75} high={60} low={77} />
              <C x={97} open={76} close={85} high={74} low={87} />
              <C x={104} open={86} close={93} high={84} low={95} />

              {/* 天井レジスタンス */}
              <line x1="12" y1="22" x2="78" y2="22" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* ネックライン */}
              <line x1="26" y1="63" x2="98" y2="63" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* Entry */}
              <line x1="94" y1="72" x2="148" y2="72" stroke={shortColor} strokeWidth="1" />
              <polygon points="94,72 100,69 100,75" fill={shortColor} />
              <text x="152" y="75" fontSize="8.5" fontWeight="bold" fill={shortColor}>Entry Short</text>
              {/* SL */}
              <line x1="72" y1="20" x2="185" y2="20" stroke={slColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="23" fontSize="8.5" fontWeight="bold" fill={slColor}>SL</text>
              {/* TP */}
              <line x1="104" y1="92" x2="185" y2="92" stroke={tpColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="95" fontSize="8.5" fontWeight="bold" fill={tpColor}>TP</text>
            </>
          );

        case "bearish-wedge":
          return (
            <>
              {/* 上昇ウェッジ（上向きに先細り収束していくローソク足） */}
              <C x={8} open={72} close={58} high={56} low={74} />
              <C x={16} open={57} close={38} high={35} low={59} />
              {/* 波1: 安値1(Y=68) */}
              <C x={24} open={39} close={54} high={37} low={56} />
              <C x={32} open={55} close={68} high={53} low={70} />
              {/* 波2: 高値1(Y=28 切り上げ) */}
              <C x={40} open={67} close={52} high={50} low={69} />
              <C x={48} open={51} close={32} high={28} low={53} />
              {/* 波3: 安値2(Y=56 切り上げ) */}
              <C x={56} open={33} close={46} high={31} low={48} />
              <C x={64} open={47} close={56} high={45} low={58} />
              {/* 波4: 高値2(Y=24 先細り) */}
              <C x={72} open={55} close={42} high={40} low={57} />
              <C x={80} open={41} close={26} high={24} low={43} />
              {/* 波5: 安値3(Y=48) */}
              <C x={88} open={27} close={38} high={25} low={40} />
              <C x={96} open={39} close={48} high={37} low={50} />
              {/* 波6: 高値3(Y=22 先細り頂点) */}
              <C x={104} open={47} close={34} high={32} low={49} />
              <C x={112} open={33} close={23} high={21} low={35} />
              {/* ウェッジ下限ブレイクアウト急落 */}
              <C x={120} open={24} close={46} high={22} low={48} />
              <C x={128} open={47} close={68} high={45} low={70} />
              {/* 急落波 */}
              <C x={136} open={69} close={82} high={67} low={84} />
              <C x={144} open={83} close={93} high={81} low={95} />

              {/* 上辺切り上げライン */}
              <line x1="16" y1="36" x2="118" y2="21" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* 下辺急角度切り上げサポートライン（クサビ型収縮） */}
              <line x1="30" y1="69" x2="126" y2="46" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* Entry */}
              <line x1="130" y1="68" x2="158" y2="68" stroke={shortColor} strokeWidth="1" />
              <polygon points="130,68 136,65 136,71" fill={shortColor} />
              <text x="162" y="71" fontSize="8.5" fontWeight="bold" fill={shortColor}>Entry Short</text>
              {/* SL */}
              <line x1="108" y1="20" x2="190" y2="20" stroke={slColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="194" y="23" fontSize="8.5" fontWeight="bold" fill={slColor}>SL</text>
              {/* TP */}
              <line x1="140" y1="92" x2="190" y2="92" stroke={tpColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="194" y="95" fontSize="8.5" fontWeight="bold" fill={tpColor}>TP</text>
            </>
          );

        case "bearish-rectangle":
          return (
            <>
              {/* 急落から水平ボックスへ */}
              <C x={8} open={20} close={38} high={18} low={40} />
              <C x={16} open={39} close={54} high={37} low={56} />
              <C x={24} open={55} close={68} high={53} low={70} />
              {/* ボックス下限タッチ1(Y=68) -> 上限へ */}
              <C x={32} open={67} close={52} high={50} low={69} />
              <C x={40} open={51} close={32} high={30} low={53} />
              {/* ボックス上限タッチ1(Y=32) -> 下限へ */}
              <C x={48} open={33} close={48} high={31} low={50} />
              <C x={56} open={49} close={68} high={47} low={70} />
              {/* ボックス下限タッチ2(Y=68) -> 上限へ */}
              <C x={64} open={67} close={50} high={48} low={69} />
              <C x={72} open={49} close={32} high={30} low={51} />
              {/* ボックス上限タッチ2(Y=32) -> 下限割れへ */}
              <C x={80} open={33} close={50} high={31} low={52} />
              <C x={88} open={51} close={66} high={49} low={68} />
              <C x={96} open={67} close={80} high={65} low={82} />
              {/* 急落波 */}
              <C x={104} open={81} close={88} high={79} low={90} />
              <C x={112} open={89} close={95} high={87} low={97} />

              {/* ボックス水平レジスタンス */}
              <line x1="20" y1="32" x2="86" y2="32" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* ボックス水平サポート */}
              <line x1="20" y1="68" x2="102" y2="68" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* Entry */}
              <line x1="100" y1="76" x2="148" y2="76" stroke={shortColor} strokeWidth="1" />
              <polygon points="100,76 106,73 106,79" fill={shortColor} />
              <text x="152" y="79" fontSize="8.5" fontWeight="bold" fill={shortColor}>Entry Short</text>
              {/* SL */}
              <line x1="68" y1="30" x2="185" y2="30" stroke={slColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="33" fontSize="8.5" fontWeight="bold" fill={slColor}>SL</text>
              {/* TP */}
              <line x1="108" y1="92" x2="185" y2="92" stroke={tpColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="95" fontSize="8.5" fontWeight="bold" fill={tpColor}>TP</text>
            </>
          );

        case "inverse-cup-and-handle":
          return (
            <>
              {/* 左リム安値 */}
              <C x={8} open={52} close={68} high={50} low={70} />
              {/* 伏せたU字ドーム左側（緩やかに天井へ） */}
              <C x={15} open={67} close={52} high={50} low={69} />
              <C x={22} open={51} close={36} high={34} low={53} />
              <C x={29} open={35} close={26} high={24} low={37} />
              {/* 逆U字丸天井 */}
              <C x={36} open={25} close={22} high={20} low={27} />
              <C x={43} open={22} close={24} high={20} low={26} />
              <C x={50} open={23} close={28} high={21} low={30} />
              {/* 逆U字ドーム右側（下限へ下落） */}
              <C x={57} open={29} close={40} high={27} low={42} />
              <C x={64} open={41} close={54} high={39} low={56} />
              <C x={71} open={55} close={68} high={53} low={70} />
              {/* 逆取っ手（浅い戻り上向き小チャネル） */}
              <C x={78} open={67} close={58} high={56} low={69} />
              <C x={85} open={57} close={54} high={52} low={59} />
              <C x={92} open={55} close={64} high={53} low={66} />
              {/* カップ安値ブレイクアウト急落 */}
              <C x={99} open={65} close={78} high={63} low={80} />
              <C x={106} open={79} close={88} high={77} low={90} />
              <C x={113} open={89} close={95} high={87} low={97} />

              {/* リム安値ピボット水平線 */}
              <line x1="8" y1="69" x2="105" y2="69" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* 逆ハンドルトレンドライン */}
              <line x1="71" y1="69" x2="92" y2="56" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* Entry */}
              <line x1="102" y1="76" x2="148" y2="76" stroke={shortColor} strokeWidth="1" />
              <polygon points="102,76 108,73 108,79" fill={shortColor} />
              <text x="152" y="79" fontSize="8.5" fontWeight="bold" fill={shortColor}>Entry Short</text>
              {/* SL */}
              <line x1="82" y1="50" x2="185" y2="50" stroke={slColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="53" fontSize="8.5" fontWeight="bold" fill={slColor}>SL</text>
              {/* TP */}
              <line x1="110" y1="92" x2="185" y2="92" stroke={tpColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="95" fontSize="8.5" fontWeight="bold" fill={tpColor}>TP</text>
            </>
          );

        case "bearish-flag":
          return (
            <>
              {/* 急落ポール */}
              <C x={8} open={16} close={34} high={14} low={36} />
              <C x={15} open={35} close={56} high={33} low={58} />
              <C x={22} open={57} close={76} high={55} low={78} />
              {/* フラッグ（上向き平行チャネル） */}
              <C x={29} open={75} close={64} high={62} low={77} />
              <C x={36} open={63} close={54} high={52} low={65} />
              <C x={43} open={55} close={66} high={53} low={68} />
              <C x={50} open={65} close={56} high={54} low={67} />
              <C x={57} open={55} close={46} high={44} low={57} />
              <C x={64} open={47} close={58} high={45} low={60} />
              {/* 下放れブレイク */}
              <C x={71} open={59} close={72} high={57} low={74} />
              <C x={78} open={73} close={82} high={71} low={84} />
              <C x={85} open={83} close={92} high={81} low={94} />

              {/* チャネル上辺 */}
              <line x1="28" y1="58" x2="78" y2="42" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* チャネル下辺 */}
              <line x1="22" y1="76" x2="72" y2="60" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* Entry */}
              <line x1="75" y1="76" x2="148" y2="76" stroke={shortColor} strokeWidth="1" />
              <polygon points="75,76 81,73 81,79" fill={shortColor} />
              <text x="152" y="79" fontSize="8.5" fontWeight="bold" fill={shortColor}>Entry Short</text>
              {/* SL */}
              <line x1="56" y1="42" x2="185" y2="42" stroke={slColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="45" fontSize="8.5" fontWeight="bold" fill={slColor}>SL</text>
              {/* TP */}
              <line x1="84" y1="92" x2="185" y2="92" stroke={tpColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="95" fontSize="8.5" fontWeight="bold" fill={tpColor}>TP</text>
            </>
          );

        case "bearish-pennant":
          return (
            <>
              {/* 急落ポール */}
              <C x={8} open={16} close={34} high={14} low={36} />
              <C x={15} open={35} close={56} high={33} low={58} />
              <C x={22} open={57} close={76} high={55} low={78} />
              {/* ペナント（安値切り上げ・高値切り下げの左右対称収束） */}
              <C x={29} open={75} close={60} high={58} low={77} />
              <C x={36} open={59} close={44} high={42} low={61} />
              <C x={43} open={45} close={66} high={43} low={68} />
              <C x={50} open={65} close={52} high={50} low={67} />
              <C x={57} open={53} close={62} high={51} low={64} />
              <C x={64} open={61} close={56} high={54} low={63} />
              {/* ペナント下抜けブレイク */}
              <C x={71} open={57} close={72} high={55} low={74} />
              <C x={78} open={73} close={84} high={71} low={86} />
              <C x={85} open={85} close={92} high={83} low={94} />

              {/* 上辺収縮線 */}
              <line x1="36" y1="42" x2="70" y2="56" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* 下辺収縮線 */}
              <line x1="22" y1="76" x2="70" y2="62" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* Entry */}
              <line x1="75" y1="74" x2="148" y2="74" stroke={shortColor} strokeWidth="1" />
              <polygon points="75,74 81,71 81,77" fill={shortColor} />
              <text x="152" y="77" fontSize="8.5" fontWeight="bold" fill={shortColor}>Entry Short</text>
              {/* SL */}
              <line x1="48" y1="46" x2="185" y2="46" stroke={slColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="49" fontSize="8.5" fontWeight="bold" fill={slColor}>SL</text>
              {/* TP */}
              <line x1="84" y1="92" x2="185" y2="92" stroke={tpColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="95" fontSize="8.5" fontWeight="bold" fill={tpColor}>TP</text>
            </>
          );

        case "ascending-triangle-bearish":
        default:
          return (
            <>
              {/* 下値切り上げ ＆ 水平レジスタンス */}
              <C x={8} open={58} close={76} high={56} low={78} />
              <C x={16} open={75} close={52} high={50} low={77} />
              <C x={24} open={51} close={28} high={26} low={53} />
              {/* 水平レジスタンス1 */}
              <C x={32} open={29} close={48} high={27} low={50} />
              <C x={40} open={49} close={64} high={47} low={66} />
              {/* 安値2(切り上げ) */}
              <C x={48} open={63} close={46} high={44} low={65} />
              <C x={56} open={45} close={28} high={26} low={47} />
              {/* 水平レジスタンス2 */}
              <C x={64} open={29} close={42} high={27} low={44} />
              <C x={72} open={43} close={54} high={41} low={56} />
              {/* 安値3(さらに切り上げ) */}
              <C x={80} open={53} close={40} high={38} low={55} />
              <C x={88} open={39} close={28} high={26} low={41} />
              {/* 水平レジスタンス3から下放れ */}
              <C x={96} open={29} close={52} high={27} low={54} />
              <C x={104} open={53} close={72} high={51} low={74} />
              <C x={112} open={73} close={84} high={71} low={86} />
              <C x={120} open={85} close={92} high={83} low={94} />

              {/* 水平上辺レジスタンスライン */}
              <line x1="16" y1="28" x2="104" y2="28" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* 切り上がる下辺トレンドライン */}
              <line x1="8" y1="76" x2="98" y2="48" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
              {/* Entry */}
              <line x1="106" y1="74" x2="152" y2="74" stroke={shortColor} strokeWidth="1" />
              <polygon points="106,74 112,71 112,77" fill={shortColor} />
              <text x="156" y="77" fontSize="8.5" fontWeight="bold" fill={shortColor}>Entry Short</text>
              {/* SL */}
              <line x1="80" y1="26" x2="185" y2="26" stroke={slColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="29" fontSize="8.5" fontWeight="bold" fill={slColor}>SL</text>
              {/* TP */}
              <line x1="114" y1="92" x2="185" y2="92" stroke={tpColor} strokeWidth="1" strokeDasharray="3 2" />
              <text x="190" y="95" fontSize="8.5" fontWeight="bold" fill={tpColor}>TP</text>
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
