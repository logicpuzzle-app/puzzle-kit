import React, { useMemo, useEffect, useState } from 'react';
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
    backgroundClip = true,
  } = gridConfig;

  if (!backgroundImage) return null;

  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      if (width > 0 && height > 0) {
        setNaturalSize({ width, height });
      } else {
        setNaturalSize(null);
      }
    };
    img.onerror = () => {
      if (cancelled) return;
      setNaturalSize(null);
    };
    img.src = backgroundImage;
    return () => {
      cancelled = true;
    };
  }, [backgroundImage]);

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
      <g className="background-image-layer">
        <rect
          x={gridX}
          y={gridY}
          width={gridWidth}
          height={gridHeight}
          fill="#ffffff"
        />
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
          opacity={backgroundOpacity}
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

  const backgroundRect = useMemo(() => {
    if (backgroundFit === 'cover' || backgroundFit === 'fill') {
      return { x: gridX, y: gridY, width: gridWidth, height: gridHeight };
    }

    const aspect = naturalSize ? naturalSize.width / naturalSize.height : null;
    if (!aspect || imageWidth <= 0 || imageHeight <= 0) {
      return { x: imageX, y: imageY, width: imageWidth, height: imageHeight };
    }

    const viewRatio = imageWidth / imageHeight;
    let drawWidth = imageWidth;
    let drawHeight = imageHeight;
    if (aspect > viewRatio) {
      drawWidth = imageWidth;
      drawHeight = imageWidth / aspect;
    } else {
      drawHeight = imageHeight;
      drawWidth = imageHeight * aspect;
    }

    return {
      x: imageX + (imageWidth - drawWidth) / 2,
      y: imageY + (imageHeight - drawHeight) / 2,
      width: drawWidth,
      height: drawHeight,
    };
  }, [backgroundFit, gridX, gridY, gridWidth, gridHeight, imageX, imageY, imageWidth, imageHeight, naturalSize]);

  return (
    <g className="background-image-layer">
      <rect
        x={backgroundRect.x}
        y={backgroundRect.y}
        width={backgroundRect.width}
        height={backgroundRect.height}
        fill="#ffffff"
        clipPath={backgroundFit === 'none' && backgroundClip ? `url(#${patternId}-clip)` : undefined}
      />
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
        clipPath={backgroundFit === 'none' && backgroundClip ? `url(#${patternId}-clip)` : undefined}
      />
    </g>
  );
};
