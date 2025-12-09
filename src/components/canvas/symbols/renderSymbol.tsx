/**
 * Main symbol rendering function
 */

import React from 'react';
import type { SymbolProps } from './types';

// Basic shapes
import {
  CircleSymbol,
  FilledCircleSymbol,
  DoubleCircleSymbol,
  SquareSymbol,
  RoundedSquareSymbol,
  DoubleSquareSymbol,
  TriangleSymbol,
  DiamondSymbol,
  StarSymbol,
  HexagonSymbol,
  PentagonSymbol,
  CubeSymbol,
} from './BasicSymbols';

// Marks
import {
  CrossSymbol,
  PlusSymbol,
  MinusSymbol,
  DotSymbol,
  CheckSymbol,
} from './MarkSymbols';

// Lines
import {
  LineSymbol,
  DiagonalLineSymbol,
  ArrowSymbol,
} from './LineSymbols';

// Arrow symbols (penpa-edit style)
import {
  ArrowBSymbol,
  ArrowNSymbol,
  ArrowSSymbol,
  ArrowShortSymbol,
  ArrowGPSymbol,
  ArrowCrossSymbol,
  ArrowEightSymbol,
  ArrowFourTipSymbol,
  ArrowFourEdgeSymbol,
  ArrowDoubleSymbol,
} from './ArrowSymbols';

// Special symbols
import { MineSymbol, BulbSymbol } from './SpecialSymbols';

// Text symbols
import { UnicodeSymbol, TextSymbol, UNICODE_SYMBOLS } from './TextSymbols';

// Animal icons
import {
  CatIcon,
  DogIcon,
  RabbitIcon,
  BirdIcon,
  FishIcon,
  EggIcon,
  EggFilledIcon,
  EggCrackedIcon,
  BirdhouseIcon,
  BoneIcon,
  EyeIcon,
  EyeClosedIcon,
  TreePineIcon,
  PlanetIcon,
  PersonIcon,
  FlashlightIcon,
  FryingPanIcon,
  GoatCuteIcon,
  WolfCuteIcon,
  GhostIcon,
  GhostBlackIcon,
  DraculaIcon,
  ChickenIcon,
  SkullIcon,
  ZombieIcon,
  CactusIcon,
  AlienIcon,
  CowIcon,
  PigIcon,
} from '../../icons/AnimalIcons';

// Animal symbol helper
const renderAnimalSymbol = (
  Icon: React.FC<{ size: number; color: string }>,
  { x, y, size, color, rotation }: SymbolProps
) => (
  <g transform={`translate(${x - size / 2}, ${y - size / 2})${rotation ? ` rotate(${rotation} ${size / 2} ${size / 2})` : ''}`}>
    <Icon size={size} color={color} />
  </g>
);

export const renderSymbol = (type: string, props: SymbolProps): React.ReactElement | null => {
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

    // Penpa-edit style arrows
    // Single direction arrows
    case 'arrow_B':
      return <ArrowBSymbol {...props} />;
    case 'arrow_N':
      return <ArrowNSymbol {...props} />;
    case 'arrow_S':
      return <ArrowSSymbol {...props} />;
    case 'arrow_Short':
      return <ArrowShortSymbol {...props} />;
    case 'arrow_GP':
      return <ArrowGPSymbol {...props} />;
    case 'arrow_double':
      return <ArrowDoubleSymbol {...props} />;
    // Multi-direction arrows
    case 'arrow_cross':
      return <ArrowCrossSymbol {...props} directions={props.directions} directionAngles={props.directionAngles} />;
    case 'arrow_eight':
      return <ArrowEightSymbol {...props} directions={props.directions} directionAngles={props.directionAngles} />;
    case 'arrow_fourtip':
      return <ArrowFourTipSymbol {...props} directions={props.directions} directionAngles={props.directionAngles} />;
    case 'arrow_fouredge':
      return <ArrowFourEdgeSymbol {...props} directions={props.directions} directionAngles={props.directionAngles} />;

    // Special symbols
    case 'mine':
      return <MineSymbol {...props} />;
    case 'bulb':
      return <BulbSymbol {...props} />;
    case 'cube':
      return <CubeSymbol {...props} />;

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
