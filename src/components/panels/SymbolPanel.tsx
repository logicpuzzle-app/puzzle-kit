import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../store/puzzleStore';
import { ToolType } from '../../types';
import { ANIMAL_ICON_MAP, GhostBlackIcon, FryingPanIcon } from '../icons/AnimalIcons';

// SVG icon components for special symbols
const MineIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.25;
  const spikeR = size * 0.42;
  const spikes = 8;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill={color} />
      {Array.from({ length: spikes }).map((_, i) => {
        const angle = (i * 360 / spikes) * (Math.PI / 180);
        const x1 = cx + r * 0.8 * Math.cos(angle);
        const y1 = cy + r * 0.8 * Math.sin(angle);
        const x2 = cx + spikeR * Math.cos(angle);
        const y2 = cy + spikeR * Math.sin(angle);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={color}
            strokeWidth={size * 0.08}
            strokeLinecap="round"
          />
        );
      })}
      <circle cx={cx - r * 0.3} cy={cy - r * 0.3} r={r * 0.2} fill="white" opacity={0.6} />
    </svg>
  );
};

const BulbIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => {
  const cx = size / 2;
  const cy = size / 2;
  const bulbR = size * 0.22;
  const baseW = size * 0.2;
  const baseH = size * 0.18;
  const sw = size * 0.06; // stroke width

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Bulb glass */}
      <circle cx={cx} cy={cy - size * 0.05} r={bulbR} fill="none" stroke={color} strokeWidth={sw} />
      {/* Base */}
      <rect
        x={cx - baseW / 2}
        y={cy + bulbR * 0.9}
        width={baseW}
        height={baseH}
        fill="none"
        stroke={color}
        strokeWidth={sw * 0.8}
        rx={1}
      />
      {/* Filament */}
      <path
        d={`M ${cx - bulbR * 0.3} ${cy + size * 0.08} Q ${cx} ${cy - size * 0.02} ${cx + bulbR * 0.3} ${cy + size * 0.08}`}
        fill="none"
        stroke={color}
        strokeWidth={sw * 0.8}
      />
      {/* Light rays \|/ pattern - detached from bulb */}
      <line x1={cx - bulbR * 1.8} y1={cy - size * 0.28} x2={cx - bulbR * 1.4} y2={cy - size * 0.18} stroke={color} strokeWidth={sw * 0.7} />
      <line x1={cx} y1={cy - size * 0.42} x2={cx} y2={cy - size * 0.32} stroke={color} strokeWidth={sw * 0.7} />
      <line x1={cx + bulbR * 1.8} y1={cy - size * 0.28} x2={cx + bulbR * 1.4} y2={cy - size * 0.18} stroke={color} strokeWidth={sw * 0.7} />
    </svg>
  );
};

const CubeIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => {
  const s = size;
  const half = s * 0.32;
  const depth = s * 0.2;
  const top = `${s / 2 - half},${s / 2 - half + depth} ${s / 2},${s / 2 - half - depth} ${s / 2 + half},${s / 2 - half + depth} ${s / 2},${s / 2 + depth}`;
  const front = `${s / 2 - half},${s / 2 - half + depth} ${s / 2 + half},${s / 2 - half + depth} ${s / 2 + half},${s / 2 + half + depth} ${s / 2 - half},${s / 2 + half + depth}`;
  const side = `${s / 2 + half},${s / 2 - half + depth} ${s / 2 + half + depth},${s / 2 - depth} ${s / 2 + half + depth},${s / 2 + half} ${s / 2 + half},${s / 2 + half + depth}`;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <polygon points={top} fill="none" stroke={color} strokeWidth={s * 0.08} />
      <polygon points={side} fill="none" stroke={color} strokeWidth={s * 0.08} />
      <polygon points={front} fill="none" stroke={color} strokeWidth={s * 0.08} />
    </svg>
  );
};

// Symbol definition with tags for search
interface SymbolDef {
  id: string;
  icon: string;
  filled: boolean;
  rotation?: number;
  tagsJa: string[];
  tagsEn: string[];
}

// Penpa-compatible symbol definitions with search tags
const SYMBOL_CATEGORIES: { id: string; labelKey: string; symbols: SymbolDef[] }[] = [
  {
    id: 'shapes',
    labelKey: 'symbols.shapes',
    symbols: [
      { id: 'circle', icon: '○', filled: false, tagsJa: ['丸', '円', '白丸'], tagsEn: ['circle', 'round', 'white'] },
      { id: 'circle-filled', icon: '●', filled: true, tagsJa: ['丸', '円', '黒丸'], tagsEn: ['circle', 'round', 'black', 'filled'] },
      { id: 'circle-double', icon: '◎', filled: false, tagsJa: ['二重丸', '円'], tagsEn: ['double', 'circle', 'target'] },
      { id: 'square', icon: '□', filled: false, tagsJa: ['四角', '正方形', '白'], tagsEn: ['square', 'box', 'white'] },
      { id: 'square-filled', icon: '■', filled: true, tagsJa: ['四角', '正方形', '黒'], tagsEn: ['square', 'box', 'black', 'filled'] },
      { id: 'square-double', icon: '▣', filled: false, tagsJa: ['二重四角'], tagsEn: ['double', 'square'] },
      { id: 'rounded-square', icon: '▢', filled: false, tagsJa: ['角丸', '四角', '丸四角'], tagsEn: ['rounded', 'square', 'box'] },
      { id: 'rounded-square-filled', icon: '▣', filled: true, tagsJa: ['角丸', '四角', '丸四角', '塗り'], tagsEn: ['rounded', 'square', 'box', 'filled'] },
      { id: 'triangle', icon: '△', filled: false, tagsJa: ['三角', '上'], tagsEn: ['triangle', 'up', 'white'] },
      { id: 'triangle-filled', icon: '▲', filled: true, tagsJa: ['三角', '上', '黒'], tagsEn: ['triangle', 'up', 'black', 'filled'] },
      { id: 'triangle-down', icon: '▽', filled: false, tagsJa: ['三角', '下'], tagsEn: ['triangle', 'down', 'white'] },
      { id: 'triangle-down-filled', icon: '▼', filled: true, tagsJa: ['三角', '下', '黒'], tagsEn: ['triangle', 'down', 'black', 'filled'] },
      { id: 'triangle-right', icon: '▷', filled: false, tagsJa: ['三角', '右'], tagsEn: ['triangle', 'right', 'white'] },
      { id: 'triangle-right-filled', icon: '▶', filled: true, tagsJa: ['三角', '右', '黒'], tagsEn: ['triangle', 'right', 'black', 'filled'] },
      { id: 'triangle-left', icon: '◁', filled: false, tagsJa: ['三角', '左'], tagsEn: ['triangle', 'left', 'white'] },
      { id: 'triangle-left-filled', icon: '◀', filled: true, tagsJa: ['三角', '左', '黒'], tagsEn: ['triangle', 'left', 'black', 'filled'] },
      { id: 'diamond', icon: '◇', filled: false, tagsJa: ['ひし形', 'ダイヤ'], tagsEn: ['diamond', 'rhombus', 'white'] },
      { id: 'diamond-filled', icon: '◆', filled: true, tagsJa: ['ひし形', 'ダイヤ', '黒'], tagsEn: ['diamond', 'rhombus', 'black', 'filled'] },
      { id: 'star', icon: '☆', filled: false, tagsJa: ['星', 'スター'], tagsEn: ['star', 'white'] },
      { id: 'star-filled', icon: '★', filled: true, tagsJa: ['星', 'スター', '黒'], tagsEn: ['star', 'black', 'filled'] },
      { id: 'hexagon', icon: '⬡', filled: false, tagsJa: ['六角形', 'ヘキサゴン'], tagsEn: ['hexagon', 'hex', 'white'] },
      { id: 'hexagon-filled', icon: '⬢', filled: true, tagsJa: ['六角形', 'ヘキサゴン', '黒'], tagsEn: ['hexagon', 'hex', 'black', 'filled'] },
      { id: 'pentagon', icon: '⬠', filled: false, tagsJa: ['五角形', 'ペンタゴン'], tagsEn: ['pentagon', 'white'] },
      { id: 'pentagon-filled', icon: '⬟', filled: true, tagsJa: ['五角形', 'ペンタゴン', '黒'], tagsEn: ['pentagon', 'black', 'filled'] },
    ],
  },
  {
    id: 'marks',
    labelKey: 'symbols.marks',
    symbols: [
      { id: 'cross', icon: '×', filled: false, tagsJa: ['バツ', 'クロス', '×'], tagsEn: ['cross', 'x', 'cancel'] },
      { id: 'plus', icon: '+', filled: false, tagsJa: ['プラス', '足す', '+'], tagsEn: ['plus', 'add'] },
      { id: 'minus', icon: '−', filled: false, tagsJa: ['マイナス', '引く', '-'], tagsEn: ['minus', 'subtract'] },
      { id: 'eye', icon: '目', filled: false, tagsJa: ['目', 'アイ'], tagsEn: ['eye', 'view'] },
      { id: 'eyeClosed', icon: '目(閉)', filled: false, tagsJa: ['目', '閉じる', 'ねむり'], tagsEn: ['eye', 'closed'] },
      { id: 'line-h', icon: '─', filled: false, tagsJa: ['横線', '水平'], tagsEn: ['line', 'horizontal'] },
      { id: 'line-v', icon: '│', filled: false, tagsJa: ['縦線', '垂直'], tagsEn: ['line', 'vertical'] },
      { id: 'line-d1', icon: '╱', filled: false, tagsJa: ['斜線', '斜め'], tagsEn: ['line', 'diagonal', 'slash'] },
      { id: 'line-d2', icon: '╲', filled: false, tagsJa: ['斜線', '斜め'], tagsEn: ['line', 'diagonal', 'backslash'] },
      { id: 'dot', icon: '・', filled: true, tagsJa: ['点', 'ドット', '小'], tagsEn: ['dot', 'point', 'small'] },
      { id: 'dot-large', icon: '●', filled: true, tagsJa: ['点', 'ドット', '大'], tagsEn: ['dot', 'point', 'large', 'big'] },
      { id: 'check', icon: '✓', filled: false, tagsJa: ['チェック', 'レ点'], tagsEn: ['check', 'tick', 'ok'] },
      { id: 'question', icon: '?', filled: false, tagsJa: ['はてな', '疑問', '?'], tagsEn: ['question', 'unknown'] },
      { id: 'exclamation', icon: '!', filled: false, tagsJa: ['ビックリ', '感嘆', '!'], tagsEn: ['exclamation', 'alert', 'important'] },
    ],
  },
  {
    id: 'arrows',
    labelKey: 'symbols.arrows',
    symbols: [
      { id: 'arrow-up', icon: '↑', filled: false, rotation: 0, tagsJa: ['矢印', '上'], tagsEn: ['arrow', 'up'] },
      { id: 'arrow-right', icon: '→', filled: false, rotation: 90, tagsJa: ['矢印', '右'], tagsEn: ['arrow', 'right'] },
      { id: 'arrow-down', icon: '↓', filled: false, rotation: 180, tagsJa: ['矢印', '下'], tagsEn: ['arrow', 'down'] },
      { id: 'arrow-left', icon: '←', filled: false, rotation: 270, tagsJa: ['矢印', '左'], tagsEn: ['arrow', 'left'] },
      { id: 'arrow-ne', icon: '↗', filled: false, rotation: 45, tagsJa: ['矢印', '右上', '斜め'], tagsEn: ['arrow', 'northeast', 'diagonal'] },
      { id: 'arrow-se', icon: '↘', filled: false, rotation: 135, tagsJa: ['矢印', '右下', '斜め'], tagsEn: ['arrow', 'southeast', 'diagonal'] },
      { id: 'arrow-sw', icon: '↙', filled: false, rotation: 225, tagsJa: ['矢印', '左下', '斜め'], tagsEn: ['arrow', 'southwest', 'diagonal'] },
      { id: 'arrow-nw', icon: '↖', filled: false, rotation: 315, tagsJa: ['矢印', '左上', '斜め'], tagsEn: ['arrow', 'northwest', 'diagonal'] },
      { id: 'arrow-double-h', icon: '↔', filled: false, tagsJa: ['矢印', '両方', '横', '双方向'], tagsEn: ['arrow', 'double', 'horizontal', 'both'] },
      { id: 'arrow-double-v', icon: '↕', filled: false, tagsJa: ['矢印', '両方', '縦', '双方向'], tagsEn: ['arrow', 'double', 'vertical', 'both'] },
      { id: 'arrow-thick-up', icon: '⬆', filled: false, tagsJa: ['矢印', '上', '太'], tagsEn: ['arrow', 'up', 'thick', 'bold'] },
      { id: 'arrow-thick-down', icon: '⬇', filled: false, tagsJa: ['矢印', '下', '太'], tagsEn: ['arrow', 'down', 'thick', 'bold'] },
      { id: 'arrow-thick-left', icon: '⬅', filled: false, tagsJa: ['矢印', '左', '太'], tagsEn: ['arrow', 'left', 'thick', 'bold'] },
      { id: 'arrow-thick-right', icon: '➡', filled: false, tagsJa: ['矢印', '右', '太'], tagsEn: ['arrow', 'right', 'thick', 'bold'] },
    ],
  },
  {
    id: 'inequality',
    labelKey: 'symbols.inequality',
    symbols: [
      { id: 'lt', icon: '<', filled: false, tagsJa: ['小なり', '不等号', '<'], tagsEn: ['less', 'than', 'inequality'] },
      { id: 'gt', icon: '>', filled: false, tagsJa: ['大なり', '不等号', '>'], tagsEn: ['greater', 'than', 'inequality'] },
      { id: 'le', icon: '≤', filled: false, tagsJa: ['以下', '不等号'], tagsEn: ['less', 'equal', 'inequality'] },
      { id: 'ge', icon: '≥', filled: false, tagsJa: ['以上', '不等号'], tagsEn: ['greater', 'equal', 'inequality'] },
      { id: 'eq', icon: '=', filled: false, tagsJa: ['等しい', 'イコール', '='], tagsEn: ['equal', 'same'] },
      { id: 'ne', icon: '≠', filled: false, tagsJa: ['等しくない', 'ノットイコール'], tagsEn: ['not', 'equal', 'different'] },
      { id: 'caret-up', icon: '∧', filled: false, tagsJa: ['かつ', 'AND', '論理積'], tagsEn: ['and', 'caret', 'logic'] },
      { id: 'caret-down', icon: '∨', filled: false, tagsJa: ['または', 'OR', '論理和'], tagsEn: ['or', 'caret', 'logic'] },
    ],
  },
  {
    id: 'special',
    labelKey: 'symbols.special',
    symbols: [
      { id: 'sun', icon: '☀', filled: false, tagsJa: ['太陽', '晴れ', '天気'], tagsEn: ['sun', 'sunny', 'weather'] },
      { id: 'moon', icon: '☾', filled: false, tagsJa: ['月', '夜', '天気'], tagsEn: ['moon', 'night', 'weather'] },
      { id: 'cloud', icon: '☁', filled: false, tagsJa: ['雲', '曇り', '天気'], tagsEn: ['cloud', 'cloudy', 'weather'] },
      { id: 'heart', icon: '♥', filled: true, tagsJa: ['ハート', '心', '愛', '黒'], tagsEn: ['heart', 'love', 'filled', 'black'] },
      { id: 'heart-empty', icon: '♡', filled: false, tagsJa: ['ハート', '心', '白'], tagsEn: ['heart', 'love', 'empty', 'white'] },
      { id: 'spade', icon: '♠', filled: true, tagsJa: ['スペード', 'トランプ', '黒'], tagsEn: ['spade', 'card', 'poker', 'filled', 'black'] },
      { id: 'spade-empty', icon: '♤', filled: false, tagsJa: ['スペード', 'トランプ', '白'], tagsEn: ['spade', 'card', 'poker', 'empty', 'white'] },
      { id: 'club', icon: '♣', filled: true, tagsJa: ['クラブ', 'クローバー', 'トランプ', '黒'], tagsEn: ['club', 'clover', 'card', 'poker', 'filled', 'black'] },
      { id: 'club-empty', icon: '♧', filled: false, tagsJa: ['クラブ', 'クローバー', 'トランプ', '白'], tagsEn: ['club', 'clover', 'card', 'poker', 'empty', 'white'] },
      { id: 'diamond-card', icon: '♦', filled: true, tagsJa: ['ダイヤ', 'トランプ', '黒'], tagsEn: ['diamond', 'card', 'poker', 'filled', 'black'] },
      { id: 'diamond-card-empty', icon: '♢', filled: false, tagsJa: ['ダイヤ', 'トランプ', '白'], tagsEn: ['diamond', 'card', 'poker', 'empty', 'white'] },
      { id: 'music', icon: '♪', filled: false, tagsJa: ['音符', '音楽', 'おんぷ'], tagsEn: ['music', 'note', 'sound'] },
      { id: 'flag', icon: '⚑', filled: false, tagsJa: ['旗', 'フラグ'], tagsEn: ['flag', 'marker'] },
      { id: 'mine', icon: '⊛', filled: false, tagsJa: ['爆弾', '地雷', 'マインスイーパー'], tagsEn: ['mine', 'bomb', 'minesweeper'] },
      { id: 'bulb', icon: '☀', filled: false, tagsJa: ['電球', 'ひらめき', 'アイデア', 'アカリ'], tagsEn: ['bulb', 'light', 'idea', 'akari'] },
      { id: 'treePine', icon: '木', filled: false, tagsJa: ['木', 'ツリー', '森林'], tagsEn: ['tree', 'pine'] },
      { id: 'planet', icon: '惑星', filled: false, tagsJa: ['惑星', '星', '惑星記号'], tagsEn: ['planet', 'sphere'] },
      { id: 'person', icon: '人', filled: true, tagsJa: ['人', '人物', 'ピクト'], tagsEn: ['person', 'human'] },
      { id: 'flashlight', icon: 'ライト', filled: false, tagsJa: ['ライト', '懐中電灯'], tagsEn: ['flashlight', 'light'] },
      { id: 'ghost', icon: 'ゴースト', filled: true, tagsJa: ['ゴースト', 'おばけ', '幽霊'], tagsEn: ['ghost', 'spirit', 'boo'] },
      { id: 'ghostBlack', icon: '黒ゴースト', filled: true, tagsJa: ['黒ゴースト', 'おばけ', '幽霊'], tagsEn: ['black ghost', 'ghost', 'spirit'] },
      { id: 'dracula', icon: 'ドラキュラ', filled: true, tagsJa: ['ドラキュラ', '吸血鬼', 'ヴァンパイア'], tagsEn: ['dracula', 'vampire', 'bat'] },
      { id: 'skull', icon: 'ドクロ', filled: true, tagsJa: ['ドクロ', '骸骨', 'がいこつ', '髑髏'], tagsEn: ['skull', 'skeleton', 'bone'] },
      { id: 'zombie', icon: 'ゾンビ', filled: true, tagsJa: ['ゾンビ', 'アンデッド', '死者'], tagsEn: ['zombie', 'undead', 'dead'] },
      { id: 'cactus', icon: 'サボテン', filled: true, tagsJa: ['サボテン', '植物', '砂漠'], tagsEn: ['cactus', 'plant', 'desert'] },
      { id: 'alien', icon: 'エイリアン', filled: true, tagsJa: ['エイリアン', '宇宙人', 'グレイ', 'UFO'], tagsEn: ['alien', 'grey', 'ufo', 'extraterrestrial'] },
      { id: 'cube', icon: '立方体', filled: false, tagsJa: ['立方体', 'キューブ', 'ブロック'], tagsEn: ['cube', 'block', '3d'] },
      { id: 'frying-pan', icon: '🍳', filled: false, tagsJa: ['フライパン', '料理', '目玉焼き'], tagsEn: ['frying pan', 'pan', 'cooking', 'egg'] },
    ],
  },
  {
    id: 'animals',
    labelKey: 'symbols.animals',
    symbols: [
      { id: 'cat', icon: '猫', filled: false, tagsJa: ['猫', 'ねこ', 'ネコ'], tagsEn: ['cat', 'kitty'] },
      { id: 'dog', icon: '犬', filled: false, tagsJa: ['犬', 'いぬ', 'イヌ'], tagsEn: ['dog', 'puppy'] },
      { id: 'rabbit', icon: '兎', filled: false, tagsJa: ['うさぎ', 'ウサギ', '兎'], tagsEn: ['rabbit', 'bunny'] },
      { id: 'bird', icon: '鳥', filled: false, tagsJa: ['鳥', 'とり', 'トリ'], tagsEn: ['bird'] },
      { id: 'fish', icon: '魚', filled: false, tagsJa: ['魚', 'さかな', 'サカナ'], tagsEn: ['fish'] },
      { id: 'egg', icon: '卵', filled: false, tagsJa: ['卵', 'たまご'], tagsEn: ['egg'] },
      { id: 'eggFilled', icon: '卵(塗)', filled: true, tagsJa: ['卵', 'たまご', '黒'], tagsEn: ['egg', 'filled'] },
      { id: 'eggCracked', icon: '卵(割)', filled: false, tagsJa: ['卵', 'ひび', '割れ'], tagsEn: ['egg', 'cracked'] },
      { id: 'birdhouse', icon: '巣箱', filled: false, tagsJa: ['巣箱', 'すばこ', '小屋'], tagsEn: ['birdhouse', 'nest'] },
      { id: 'bone', icon: '骨', filled: false, tagsJa: ['骨', 'ほね'], tagsEn: ['bone'] },
      { id: 'goat', icon: 'ヤギ', filled: false, tagsJa: ['山羊', 'やぎ', 'ヤギ'], tagsEn: ['goat'] },
      { id: 'wolf', icon: 'オオカミ', filled: true, tagsJa: ['狼', 'おおかみ', 'オオカミ'], tagsEn: ['wolf'] },
      { id: 'pig', icon: '豚', filled: true, tagsJa: ['豚', 'ぶた', 'ブタ'], tagsEn: ['pig', 'boar'] },
      { id: 'chicken', icon: 'にわとり', filled: true, tagsJa: ['鶏', 'にわとり', 'ニワトリ', '鳥'], tagsEn: ['chicken', 'rooster', 'hen'] },
      { id: 'cow', icon: '牛', filled: true, tagsJa: ['牛', 'うし', 'ウシ', '家畜'], tagsEn: ['cow', 'cattle', 'bull'] },
      { id: 'duck', icon: 'アヒル', filled: true, tagsJa: ['アヒル', 'あひる', '鳥', 'カモ', '家鴨'], tagsEn: ['duck', 'bird', 'rubber duck'] },
    ],
  },
];

export const SymbolPanel: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { toolSettings, setTool } = usePuzzleStore();
  const [searchQuery, setSearchQuery] = useState('');
  const rotation = toolSettings.symbolRotation;

  const handleSymbolClick = (symbolId: string) => {
    setTool(`symbol-${symbolId}` as ToolType, 'symbol');
  };

  const currentSymbol = toolSettings.currentTool.startsWith('symbol-')
    ? toolSettings.currentTool.replace('symbol-', '')
    : null;

  // Get font size in pixels based on current symbol size setting
  // Button is 32px, so we use similar ratios as canvas (largest=1.3, large=1, medium=0.7, small=0.5)
  const getFontSize = () => {
    switch (toolSettings.symbolSize) {
      case 'largest': return 32; // Full button size (fills cell)
      case 'large': return 28;   // ~87% of button size
      case 'small': return 14;   // ~44% of button size
      default: return 20;        // ~62% of button size (medium)
    }
  };

  const fontSize = getFontSize();
  const currentColor = toolSettings.color;
  const isJapanese = i18n.language === 'ja';

  // Filter symbols based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return SYMBOL_CATEGORIES;
    }

    const query = searchQuery.toLowerCase().trim();

    return SYMBOL_CATEGORIES.map(category => ({
      ...category,
      symbols: category.symbols.filter(symbol => {
        // Search in both Japanese and English tags
        const matchJa = symbol.tagsJa.some(tag => tag.toLowerCase().includes(query));
        const matchEn = symbol.tagsEn.some(tag => tag.toLowerCase().includes(query));
        // Also search in symbol id and icon
        const matchId = symbol.id.toLowerCase().includes(query);
        const matchIcon = symbol.icon.includes(query);
        return matchJa || matchEn || matchId || matchIcon;
      })
    })).filter(category => category.symbols.length > 0);
  }, [searchQuery]);

  // Get tooltip text with tags
  const getTooltip = (symbol: SymbolDef) => {
    const tags = isJapanese ? symbol.tagsJa : symbol.tagsEn;
    return `${symbol.id}: ${tags.join(', ')}`;
  };

  return (
    <div className="border-t border-office-border flex-1 flex flex-col min-h-0">
      <div className="panel-header">{t('panel.symbols')}</div>

      {/* Search input */}
      <div className="px-2 py-1 border-b border-office-border">
        <input
          type="text"
          className="w-full px-2 py-1 text-xs border border-office-border rounded focus:border-office-accent focus:outline-none"
          placeholder={isJapanese ? '検索...' : 'Search...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="p-2 flex-1 overflow-y-auto min-h-0">
        {filteredCategories.length === 0 ? (
          <div className="text-xs text-office-text-secondary text-center py-4">
            {isJapanese ? '見つかりません' : 'No results'}
          </div>
        ) : (
          filteredCategories.map((category) => (
            <div key={category.id} className="mb-3">
              <div className="text-xs text-office-text-secondary mb-1">
                {t(category.labelKey) || category.id}
              </div>
              <div className="grid grid-cols-4 gap-1">
                {category.symbols.map((symbol) => {
                  const isSelected = currentSymbol === symbol.id;
                  // Render SVG icons for mine, bulb, and animals
                  const renderIcon = () => {
                    if (symbol.id === 'mine') {
                      return <MineIcon size={fontSize} color={currentColor} />;
                    }
                    if (symbol.id === 'bulb') {
                      return <BulbIcon size={fontSize} color={currentColor} />;
                    }
                    if (symbol.id === 'frying-pan') {
                      return <FryingPanIcon size={fontSize} color={currentColor} />;
                    }
                    if (symbol.id === 'cube') {
                      return <CubeIcon size={fontSize} color={currentColor} />;
                    }
                    if (symbol.id === 'ghostBlack') {
                      return <GhostBlackIcon size={fontSize} color={currentColor} />;
                    }
                    // Check if this is an animal with SVG icon
                    const AnimalIcon = ANIMAL_ICON_MAP[symbol.id];
                    if (AnimalIcon) {
                      return <AnimalIcon size={fontSize} color={currentColor} />;
                    }
                    return symbol.icon;
                  };
                  return (
                    <button
                      key={symbol.id}
                      className={`w-8 h-8 flex items-center justify-center border rounded-sm transition-colors ${
                        isSelected
                          ? 'border-office-accent border-2'
                          : 'border-office-border hover:bg-office-ribbon-hover'
                      }`}
                      style={{
                        color: currentColor,
                        backgroundColor: isSelected ? '#f0f0f0' : 'white',
                        fontSize: `${fontSize}px`,
                        lineHeight: 1
                      }}
                      onClick={() => handleSymbolClick(symbol.id)}
                      title={getTooltip(symbol)}
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          transform: rotation ? `rotate(${rotation}deg)` : undefined,
                          transition: 'transform 0.15s ease'
                        }}
                      >
                        {renderIcon()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
