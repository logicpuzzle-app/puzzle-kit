import React, { useMemo } from 'react';
import type { GridConfig } from '../../../types';

interface BackgroundImageLayerProps {
  gridConfig: GridConfig;
  gridX: number;
  gridY: number;
  gridWidth: number;
  gridHeight: number;
}

/**
 * BackgroundImageLayer - Renders background image with various fit modes and tiling
 */
export const BackgroundImageLayer: React.FC<BackgroundImageLayerProps> = ({
  gridConfig,
  gridX,
  gridY,
  gridWidth,
  gridHeight,
}) => {
  const {
    backgroundImage,
    backgroundOpacity = 0.5,
    backgroundFit = 'contain',
    backgroundScale = 1,
    backgroundTile = false,
    backgroundOffsetX = 0,
    backgroundOffsetY = 0,
  } = gridConfig;

  if (!backgroundImage) return null;

  // Generate unique pattern ID for tiling
  const patternId = useMemo(() => `bg-pattern-${Math.random().toString(36).substr(2, 9)}`, []);

  // For tiling mode
  if (backgroundTile) {
    // Calculate tile size based on scale
    // We'll use a base size and apply scale
    const baseTileSize = Math.min(gridWidth, gridHeight) * 0.5;
    const tileWidth = baseTileSize * backgroundScale;
    const tileHeight = baseTileSize * backgroundScale;

    return (
      <g className="background-image-layer" opacity={backgroundOpacity}>
        <defs>
          <pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width={tileWidth}
            height={tileHeight}
            x={gridX + backgroundOffsetX}
            y={gridY + backgroundOffsetY}
          >
            <image
              href={backgroundImage}
              width={tileWidth}
              height={tileHeight}
              preserveAspectRatio="xMidYMid meet"
            />
          </pattern>
        </defs>
        <rect
          x={gridX}
          y={gridY}
          width={gridWidth}
          height={gridHeight}
          fill={`url(#${patternId})`}
        />
      </g>
    );
  }

  // For non-tiling modes
  let imageX = gridX;
  let imageY = gridY;
  let imageWidth = gridWidth;
  let imageHeight = gridHeight;
  let preserveAspectRatio = 'xMidYMid meet';

  switch (backgroundFit) {
    case 'contain':
      // Image fits within bounds, maintaining aspect ratio (default SVG behavior)
      preserveAspectRatio = 'xMidYMid meet';
      break;
    case 'cover':
      // Image covers entire area, maintaining aspect ratio (may crop)
      preserveAspectRatio = 'xMidYMid slice';
      break;
    case 'fill':
      // Image stretches to fill (distorts aspect ratio)
      preserveAspectRatio = 'none';
      break;
    case 'none':
      // Image at natural size with scale applied, centered with offset
      preserveAspectRatio = 'xMidYMid meet';
      // Use scale factor for width/height
      imageWidth = gridWidth * backgroundScale;
      imageHeight = gridHeight * backgroundScale;
      // Center the image and apply offset
      imageX = gridX + (gridWidth - imageWidth) / 2 + backgroundOffsetX;
      imageY = gridY + (gridHeight - imageHeight) / 2 + backgroundOffsetY;
      break;
  }

  return (
    <g className="background-image-layer">
      {/* Clip path to constrain image to grid bounds */}
      <defs>
        <clipPath id={`${patternId}-clip`}>
          <rect x={gridX} y={gridY} width={gridWidth} height={gridHeight} />
        </clipPath>
      </defs>
      <image
        x={imageX}
        y={imageY}
        width={imageWidth}
        height={imageHeight}
        href={backgroundImage}
        preserveAspectRatio={preserveAspectRatio}
        opacity={backgroundOpacity}
        clipPath={backgroundFit === 'none' ? `url(#${patternId}-clip)` : undefined}
      />
    </g>
  );
};
