import React, { useMemo } from 'react';
import { usePuzzleStore } from '../../store/puzzleStore';
import { parseCellId, getCellCenter, parseVertexId, getVertexPosition, getEdgePosition } from '../../utils/gridUtils';
import type { SymbolElement, LayerType } from '../../types';
import { CatIcon, DogIcon, RabbitIcon, BirdIcon, FishIcon, EggIcon, EggFilledIcon, EggCrackedIcon, BirdhouseIcon, BoneIcon, EyeIcon, EyeClosedIcon, TreePineIcon, PlanetIcon, PersonIcon, FlashlightIcon, FryingPanIcon, GoatCuteIcon, WolfCuteIcon, GhostIcon, GhostBlackIcon, DraculaIcon, ChickenIcon, SkullIcon, ZombieIcon, CactusIcon, AlienIcon, CowIcon, PigIcon } from '../icons/AnimalIcons';

interface SymbolLayerProps {
  layer: LayerType;
}

interface SymbolProps {
  x: number;
  y: number;
  size: number;
  color: string;
  fillColor?: string;
  rotation: number;
}

const CircleSymbol: React.FC<SymbolProps> = ({ x, y, size, color, fillColor }) => (
  <circle
    cx={x}
    cy={y}
    r={size * 0.4}
    fill={fillColor || 'none'}
    stroke={color}
    strokeWidth={2}
  />
);

const FilledCircleSymbol: React.FC<SymbolProps> = ({ x, y, size, color }) => (
  <circle cx={x} cy={y} r={size * 0.35} fill={color} />
);

const SquareSymbol: React.FC<SymbolProps> = ({ x, y, size, color, fillColor, rotation }) => (
  <rect
    x={x - size * 0.35}
    y={y - size * 0.35}
    width={size * 0.7}
    height={size * 0.7}
    fill={fillColor || 'none'}
    stroke={color}
    strokeWidth={2}
    transform={rotation ? `rotate(${rotation} ${x} ${y})` : undefined}
  />
);

const RoundedSquareSymbol: React.FC<SymbolProps> = ({ x, y, size, color, fillColor, rotation }) => {
  const s = size * 0.65;
  const r = size * 0.2; // Corner radius - very visible rounded corners
  return (
    <rect
      x={x - s / 2}
      y={y - s / 2}
      width={s}
      height={s}
      rx={r}
      ry={r}
      fill={fillColor || 'none'}
      stroke={color}
      strokeWidth={2}
      transform={rotation ? `rotate(${rotation} ${x} ${y})` : undefined}
    />
  );
};

const TriangleSymbol: React.FC<SymbolProps> = ({ x, y, size, color, fillColor, rotation }) => {
  const h = size * 0.35;
  const points = `${x},${y - h} ${x - h},${y + h * 0.6} ${x + h},${y + h * 0.6}`;
  return (
    <polygon
      points={points}
      fill={fillColor || 'none'}
      stroke={color}
      strokeWidth={2}
      transform={rotation ? `rotate(${rotation} ${x} ${y})` : undefined}
    />
  );
};

const DiamondSymbol: React.FC<SymbolProps> = ({ x, y, size, color, fillColor, rotation }) => {
  const h = size * 0.4;
  const points = `${x},${y - h} ${x + h},${y} ${x},${y + h} ${x - h},${y}`;
  return (
    <polygon
      points={points}
      fill={fillColor || 'none'}
      stroke={color}
      strokeWidth={2}
      transform={rotation ? `rotate(${rotation} ${x} ${y})` : undefined}
    />
  );
};

const StarSymbol: React.FC<SymbolProps> = ({ x, y, size, color, fillColor, rotation }) => {
  const outer = size * 0.4;
  const inner = size * 0.2;
  const points: string[] = [];
  for (let i = 0; i < 5; i++) {
    const outerAngle = (i * 72 - 90) * (Math.PI / 180);
    const innerAngle = ((i * 72 + 36) - 90) * (Math.PI / 180);
    points.push(`${x + outer * Math.cos(outerAngle)},${y + outer * Math.sin(outerAngle)}`);
    points.push(`${x + inner * Math.cos(innerAngle)},${y + inner * Math.sin(innerAngle)}`);
  }
  return (
    <polygon
      points={points.join(' ')}
      fill={fillColor || 'none'}
      stroke={color}
      strokeWidth={1.5}
      transform={rotation ? `rotate(${rotation} ${x} ${y})` : undefined}
    />
  );
};

const ArrowSymbol: React.FC<SymbolProps> = ({ x, y, size, color, rotation }) => {
  const h = size * 0.35;
  return (
    <g transform={`rotate(${rotation} ${x} ${y})`}>
      <line
        x1={x}
        y1={y + h}
        x2={x}
        y2={y - h}
        stroke={color}
        strokeWidth={2}
      />
      <polyline
        points={`${x - h * 0.5},${y - h * 0.3} ${x},${y - h} ${x + h * 0.5},${y - h * 0.3}`}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </g>
  );
};

const CrossSymbol: React.FC<SymbolProps> = ({ x, y, size, color, rotation }) => {
  const h = size * 0.3;
  return (
    <g transform={rotation ? `rotate(${rotation} ${x} ${y})` : undefined}>
      <line x1={x - h} y1={y - h} x2={x + h} y2={y + h} stroke={color} strokeWidth={2} />
      <line x1={x + h} y1={y - h} x2={x - h} y2={y + h} stroke={color} strokeWidth={2} />
    </g>
  );
};

const LineSymbol: React.FC<SymbolProps> = ({ x, y, size, color, rotation }) => {
  // Use 0.5 to span full cell width (from edge to edge)
  const h = size * 0.5;
  return (
    <line
      x1={x - h}
      y1={y}
      x2={x + h}
      y2={y}
      stroke={color}
      strokeWidth={3}
      transform={rotation ? `rotate(${rotation} ${x} ${y})` : undefined}
    />
  );
};

// Diagonal line symbol - spans corner to corner
const DiagonalLineSymbol: React.FC<SymbolProps> = ({ x, y, size, color, rotation }) => {
  // For diagonal to reach corners: h = size * 0.5 * sqrt(2) ≈ size * 0.707
  const h = size * 0.5;
  return (
    <line
      x1={x - h}
      y1={y - h}
      x2={x + h}
      y2={y + h}
      stroke={color}
      strokeWidth={3}
      transform={rotation ? `rotate(${rotation} ${x} ${y})` : undefined}
    />
  );
};

const DoubleCircleSymbol: React.FC<SymbolProps> = ({ x, y, size, color }) => (
  <g>
    <circle cx={x} cy={y} r={size * 0.4} fill="none" stroke={color} strokeWidth={2} />
    <circle cx={x} cy={y} r={size * 0.25} fill="none" stroke={color} strokeWidth={2} />
  </g>
);

const DoubleSquareSymbol: React.FC<SymbolProps> = ({ x, y, size, color }) => (
  <g>
    <rect x={x - size * 0.35} y={y - size * 0.35} width={size * 0.7} height={size * 0.7} fill="none" stroke={color} strokeWidth={2} />
    <rect x={x - size * 0.2} y={y - size * 0.2} width={size * 0.4} height={size * 0.4} fill="none" stroke={color} strokeWidth={2} />
  </g>
);

const PlusSymbol: React.FC<SymbolProps> = ({ x, y, size, color }) => {
  const h = size * 0.3;
  return (
    <g>
      <line x1={x - h} y1={y} x2={x + h} y2={y} stroke={color} strokeWidth={2} />
      <line x1={x} y1={y - h} x2={x} y2={y + h} stroke={color} strokeWidth={2} />
    </g>
  );
};

const MinusSymbol: React.FC<SymbolProps> = ({ x, y, size, color }) => {
  const h = size * 0.3;
  return <line x1={x - h} y1={y} x2={x + h} y2={y} stroke={color} strokeWidth={2} />;
};

const DotSymbol: React.FC<SymbolProps> = ({ x, y, size, color }) => (
  <circle cx={x} cy={y} r={size * 0.1} fill={color} />
);

const CheckSymbol: React.FC<SymbolProps> = ({ x, y, size, color }) => {
  const h = size * 0.3;
  return (
    <polyline
      points={`${x - h},${y} ${x - h * 0.3},${y + h * 0.6} ${x + h},${y - h * 0.5}`}
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
};

const HexagonSymbol: React.FC<SymbolProps> = ({ x, y, size, color, fillColor }) => {
  const r = size * 0.35;
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 - 30) * (Math.PI / 180);
    points.push(`${x + r * Math.cos(angle)},${y + r * Math.sin(angle)}`);
  }
  return (
    <polygon points={points.join(' ')} fill={fillColor || 'none'} stroke={color} strokeWidth={2} />
  );
};

const PentagonSymbol: React.FC<SymbolProps> = ({ x, y, size, color, fillColor }) => {
  const r = size * 0.35;
  const points: string[] = [];
  for (let i = 0; i < 5; i++) {
    const angle = (i * 72 - 90) * (Math.PI / 180);
    points.push(`${x + r * Math.cos(angle)},${y + r * Math.sin(angle)}`);
  }
  return (
    <polygon points={points.join(' ')} fill={fillColor || 'none'} stroke={color} strokeWidth={2} />
  );
};

// Mine/Bomb symbol (circle with radiating lines)
const MineSymbol: React.FC<SymbolProps> = ({ x, y, size, color, rotation }) => {
  const r = size * 0.25;
  const spikeR = size * 0.38;
  const spikes = 8;
  return (
    <g transform={rotation ? `rotate(${rotation} ${x} ${y})` : undefined}>
      {/* Central filled circle */}
      <circle cx={x} cy={y} r={r} fill={color} />
      {/* Radiating spikes */}
      {Array.from({ length: spikes }).map((_, i) => {
        const angle = (i * 360 / spikes) * (Math.PI / 180);
        const x1 = x + r * 0.8 * Math.cos(angle);
        const y1 = y + r * 0.8 * Math.sin(angle);
        const x2 = x + spikeR * Math.cos(angle);
        const y2 = y + spikeR * Math.sin(angle);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
          />
        );
      })}
      {/* Highlight */}
      <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.2} fill="white" opacity={0.6} />
    </g>
  );
};

// Light bulb symbol
const BulbSymbol: React.FC<SymbolProps> = ({ x, y, size, color, rotation }) => {
  const bulbR = size * 0.22;
  const baseW = size * 0.18;
  const baseH = size * 0.18;
  return (
    <g transform={rotation ? `rotate(${rotation} ${x} ${y})` : undefined}>
      {/* Bulb glass part */}
      <circle cx={x} cy={y - size * 0.08} r={bulbR} fill="none" stroke={color} strokeWidth={2} />
      {/* Base/screw part */}
      <rect
        x={x - baseW / 2}
        y={y + bulbR * 1.0}
        width={baseW}
        height={baseH}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        rx={1}
      />
      {/* Filament */}
      <path
        d={`M ${x - bulbR * 0.3} ${y + size * 0.06}
            Q ${x} ${y - size * 0.04} ${x + bulbR * 0.3} ${y + size * 0.06}`}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
      />
      {/* Light rays \|/ pattern - detached from bulb */}
      <line x1={x - bulbR * 1.8} y1={y - size * 0.32} x2={x - bulbR * 1.4} y2={y - size * 0.22} stroke={color} strokeWidth={1.5} />
      <line x1={x} y1={y - size * 0.45} x2={x} y2={y - size * 0.35} stroke={color} strokeWidth={1.5} />
      <line x1={x + bulbR * 1.8} y1={y - size * 0.32} x2={x + bulbR * 1.4} y2={y - size * 0.22} stroke={color} strokeWidth={1.5} />
    </g>
  );
};

// Animal symbols (lucide-inspired stroke icons)
const renderAnimalSymbol = (
  Icon: React.FC<{ size: number; color: string }>,
  { x, y, size, color, rotation }: SymbolProps
) => (
  <g transform={`translate(${x - size / 2}, ${y - size / 2})${rotation ? ` rotate(${rotation} ${size / 2} ${size / 2})` : ''}`}>
    <Icon size={size} color={color} />
  </g>
);

// Generic Unicode symbol renderer
const UnicodeSymbol: React.FC<SymbolProps & { char: string }> = ({ x, y, size, color, char, rotation }) => (
  <text
    x={x}
    y={y}
    fill={color}
    fontSize={size * 0.7}
    textAnchor="middle"
    dominantBaseline="central"
    fontFamily="'Segoe UI Symbol', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif"
    transform={rotation ? `rotate(${rotation} ${x} ${y})` : undefined}
  >
    {char}
  </text>
);

// Text symbol component for displaying text characters
interface TextSymbolProps extends SymbolProps {
  text: string;
}

const TextSymbol: React.FC<TextSymbolProps> = ({ x, y, size, color, text, rotation }) => {
  // Calculate font size based on text length and cell size
  const baseFontSize = size * 0.7;
  const fontSize = text.length === 1 ? baseFontSize : baseFontSize / Math.min(text.length, 3);

  return (
    <text
      x={x}
      y={y}
      fill={color}
      fontSize={fontSize}
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily="Helvetica, Verdana, Arial, sans-serif"
      fontWeight="500"
      transform={rotation ? `rotate(${rotation} ${x} ${y})` : undefined}
    >
      {text}
    </text>
  );
};

// Symbol to Unicode character mapping for symbols that are best rendered as text
const UNICODE_SYMBOLS: Record<string, string> = {
  // Arrows
  'arrow-up': '↑',
  'arrow-down': '↓',
  'arrow-left': '←',
  'arrow-right': '→',
  'arrow-ne': '↗',
  'arrow-se': '↘',
  'arrow-sw': '↙',
  'arrow-nw': '↖',
  'arrow-double-h': '↔',
  'arrow-double-v': '↕',
  'arrow-thick-up': '⬆',
  'arrow-thick-down': '⬇',
  'arrow-thick-left': '⬅',
  'arrow-thick-right': '➡',
  // Inequality
  'lt': '<',
  'gt': '>',
  'le': '≤',
  'ge': '≥',
  'eq': '=',
  'ne': '≠',
  'caret-up': '∧',
  'caret-down': '∨',
  // Special
  'sun': '☀',
  'moon': '☾',
  'cloud': '☁',
  'heart': '♥',
  'heart-empty': '♡',
  'spade': '♠',
  'spade-empty': '♤',
  'club': '♣',
  'club-empty': '♧',
  'diamond-card': '♦',
  'diamond-card-empty': '♢',
  'music': '♪',
  'flag': '⚑',
  // mine and bulb are rendered as SVG components
  // Marks
  'question': '?',
  'exclamation': '!',
};

const renderSymbol = (type: string, props: SymbolProps, textValue?: string): React.ReactElement | null => {
  // Handle text symbols (format: text-{type}:{value})
  if (type.startsWith('text-') && type.includes(':')) {
    const text = type.split(':')[1] || '';
    return <TextSymbol {...props} text={text} />;
  }

  // Check if this symbol should be rendered as Unicode text
  if (UNICODE_SYMBOLS[type]) {
    return <UnicodeSymbol {...props} char={UNICODE_SYMBOLS[type]} />;
  }

  switch (type) {
    // Circles
    case 'circle':
      return <CircleSymbol {...props} />;
    case 'circle-filled':
      return <FilledCircleSymbol {...props} />;
    case 'circle-double':
      return <DoubleCircleSymbol {...props} />;

    // Squares
    case 'square':
      return <SquareSymbol {...props} />;
    case 'square-filled':
      return <SquareSymbol {...props} fillColor={props.color} />;
    case 'square-double':
      return <DoubleSquareSymbol {...props} />;
    case 'rounded-square':
      return <RoundedSquareSymbol {...props} />;
    case 'rounded-square-filled':
      return <RoundedSquareSymbol {...props} fillColor={props.color} />;

    // Triangles
    case 'triangle':
      return <TriangleSymbol {...props} />;
    case 'triangle-filled':
      return <TriangleSymbol {...props} fillColor={props.color} />;
    case 'triangle-down':
      return <TriangleSymbol {...props} rotation={180} />;
    case 'triangle-down-filled':
      return <TriangleSymbol {...props} rotation={180} fillColor={props.color} />;
    case 'triangle-right':
      return <TriangleSymbol {...props} rotation={90} />;
    case 'triangle-right-filled':
      return <TriangleSymbol {...props} rotation={90} fillColor={props.color} />;
    case 'triangle-left':
      return <TriangleSymbol {...props} rotation={-90} />;
    case 'triangle-left-filled':
      return <TriangleSymbol {...props} rotation={-90} fillColor={props.color} />;

    // Diamonds
    case 'diamond':
      return <DiamondSymbol {...props} />;
    case 'diamond-filled':
      return <DiamondSymbol {...props} fillColor={props.color} />;

    // Stars
    case 'star':
      return <StarSymbol {...props} />;
    case 'star-filled':
      return <StarSymbol {...props} fillColor={props.color} />;

    // Polygons
    case 'hexagon':
      return <HexagonSymbol {...props} />;
    case 'hexagon-filled':
      return <HexagonSymbol {...props} fillColor={props.color} />;
    case 'pentagon':
      return <PentagonSymbol {...props} />;
    case 'pentagon-filled':
      return <PentagonSymbol {...props} fillColor={props.color} />;

    // Marks
    case 'cross':
      return <CrossSymbol {...props} />;
    case 'plus':
      return <PlusSymbol {...props} />;
    case 'minus':
      return <MinusSymbol {...props} />;
    case 'dot':
      return <DotSymbol {...props} />;
    case 'dot-large':
      return <FilledCircleSymbol {...props} />;
    case 'check':
      return <CheckSymbol {...props} />;

    // Lines
    case 'line':
    case 'line-h':
      return <LineSymbol {...props} />;
    case 'line-v':
      return <LineSymbol {...props} rotation={90} />;
    case 'line-d1':
      return <DiagonalLineSymbol {...props} />;
    case 'line-d2':
      return <DiagonalLineSymbol {...props} rotation={90} />;

    // Arrow (old style - keep for compatibility)
    case 'arrow':
      return <ArrowSymbol {...props} />;

    // Special symbols
    case 'mine':
      return <MineSymbol {...props} />;
    case 'bulb':
      return <BulbSymbol {...props} />;

    // Animal symbols (lucide only)
    case 'cat':
      return renderAnimalSymbol(CatIcon, props);
    case 'dog':
      return renderAnimalSymbol(DogIcon, props);
    case 'rabbit':
      return renderAnimalSymbol(RabbitIcon, props);
    case 'bird':
      return renderAnimalSymbol(BirdIcon, props);
    case 'fish':
      return renderAnimalSymbol(FishIcon, props);
    case 'egg':
      return renderAnimalSymbol(EggIcon, props);
    case 'eggFilled':
      return renderAnimalSymbol(EggFilledIcon, props);
    case 'eggCracked':
      return renderAnimalSymbol(EggCrackedIcon, props);
    case 'birdhouse':
      return renderAnimalSymbol(BirdhouseIcon, props);
    case 'bone':
      return renderAnimalSymbol(BoneIcon, props);
    case 'eye':
      return renderAnimalSymbol(EyeIcon, props);
    case 'eyeClosed':
      return renderAnimalSymbol(EyeClosedIcon, props);
    case 'treePine':
      return renderAnimalSymbol(TreePineIcon, props);
    case 'planet':
      return renderAnimalSymbol(PlanetIcon, props);
    case 'person':
      return renderAnimalSymbol(PersonIcon, props);
    case 'flashlight':
      return renderAnimalSymbol(FlashlightIcon, props);
    case 'frying-pan':
      return renderAnimalSymbol(FryingPanIcon, props);
    case 'goat':
      return renderAnimalSymbol(GoatCuteIcon, props);
    case 'wolf':
      return renderAnimalSymbol(WolfCuteIcon, props);
    case 'ghost':
      return renderAnimalSymbol(GhostIcon, props);
    case 'ghostBlack':
      return renderAnimalSymbol(GhostBlackIcon, props);
    case 'dracula':
      return renderAnimalSymbol(DraculaIcon, props);
    case 'chicken':
      return renderAnimalSymbol(ChickenIcon, props);
    case 'skull':
      return renderAnimalSymbol(SkullIcon, props);
    case 'zombie':
      return renderAnimalSymbol(ZombieIcon, props);
    case 'cactus':
      return renderAnimalSymbol(CactusIcon, props);
    case 'alien':
      return renderAnimalSymbol(AlienIcon, props);
    case 'cow':
      return renderAnimalSymbol(CowIcon, props);
    case 'pig':
      return renderAnimalSymbol(PigIcon, props);

    default:
      // For unknown symbols, try to render as a simple circle
      console.warn(`Unknown symbol type: ${type}`);
      return <CircleSymbol {...props} />;
  }
};

export const SymbolLayer: React.FC<SymbolLayerProps> = ({ layer }) => {
  const { grid, puzzle, showProblemLayer, showAnswerLayer } = usePuzzleStore();
  const { cellSize } = grid;

  const isVisible =
    (layer === 'problem' && showProblemLayer) ||
    (layer === 'answer' && showAnswerLayer);

  const symbols = useMemo(() => {
    if (!isVisible) return null;

    const layerData = puzzle[layer];
    const elements: React.ReactElement[] = [];

    Object.values(layerData.symbols).forEach((symbol: SymbolElement) => {
      let center: { x: number; y: number } | null = null;

      // Parse different types of cellId
      if (symbol.cellId.startsWith('vertex-')) {
        const parsed = parseVertexId(symbol.cellId);
        if (parsed) {
          center = getVertexPosition(parsed.row, parsed.col, grid);
        }
      } else if (symbol.cellId.startsWith('edge-h-')) {
        // edge-h-row-col format
        const match = symbol.cellId.match(/^edge-h-(\d+)-(\d+)$/);
        if (match) {
          const row = parseInt(match[1], 10);
          const col = parseInt(match[2], 10);
          center = getEdgePosition('h', row, col, grid);
        }
      } else if (symbol.cellId.startsWith('edge-v-')) {
        // edge-v-row-col format
        const match = symbol.cellId.match(/^edge-v-(\d+)-(\d+)$/);
        if (match) {
          const row = parseInt(match[1], 10);
          const col = parseInt(match[2], 10);
          center = getEdgePosition('v', row, col, grid);
        }
      } else {
        // Regular cell-row-col format
        const parsed = parseCellId(symbol.cellId, grid.gridType);
        if (parsed) {
          center = getCellCenter(parsed.row, parsed.col, grid);
        }
      }

      if (!center) return;

      const sizeMultiplier =
        symbol.size === 'large' ? 1 : symbol.size === 'medium' ? 0.7 : 0.5;

      elements.push(
        <g key={symbol.id}>
          {renderSymbol(symbol.symbolType, {
            x: center.x,
            y: center.y,
            size: cellSize * sizeMultiplier,
            color: symbol.color,
            fillColor: symbol.fillColor,
            rotation: symbol.rotation,
          })}
        </g>
      );
    });

    return elements;
  }, [puzzle, layer, grid, cellSize, isVisible]);

  if (!isVisible) return null;

  return <g className={`symbol-layer-${layer}`}>{symbols}</g>;
};
