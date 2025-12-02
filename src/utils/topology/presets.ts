/**
 * Topology Presets
 *
 * Deformation effects that can be applied to any topology.
 */

import type { Point } from '../../types';
import type {
  GridTopology,
  TopologyCell,
  TopologyVertex,
  TopologyEdge,
  TopologyPreset,
  TopologyPresetParams,
} from './types';

interface TransformParams {
  intensity: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  direction?: 'horizontal' | 'vertical' | 'both';
  customTransform?: (x: number, y: number, row: number, col: number) => Point;
}

/**
 * Get transformation function for a preset
 */
function getPresetTransform(
  preset: TopologyPreset,
  params: TransformParams
): (x: number, y: number, row: number, col: number) => Point {
  const { intensity, centerX, centerY, width, height, direction, customTransform } = params;

  switch (preset) {
    case 'square':
      // No transformation
      return (x, y) => ({ x, y });

    case 'pyramid':
      // No transform (layout handled by pyramid topology itself)
      return (x, y) => ({ x, y });

    case 'cylinder':
      // Bend into a cylinder shape (horizontal wrap visual)
      return (x, y) => {
        const nx = (x - centerX) / (width / 2); // -1 to 1
        const angle = nx * Math.PI * intensity; // Arc angle
        const radius = height / 2 + (1 - intensity) * height;
        const newX = centerX + Math.sin(angle) * radius;
        const newY = y + (1 - Math.cos(angle)) * radius * 0.3 * intensity;
        return { x: newX, y: newY };
      };

    case 'mobius':
      // Möbius strip effect (twist with wrap)
      return (x, y) => {
        const nx = (x - centerX) / (width / 2);
        const ny = (y - centerY) / (height / 2);
        const angle = nx * Math.PI * intensity;
        const twist = ny * nx * intensity * 0.5;
        const newX = centerX + (Math.sin(angle) * (1 + ny * 0.2 * intensity)) * (width / 2);
        const newY = centerY + ny * (height / 2) * Math.cos(angle * 0.5) + twist * height * 0.1;
        return { x: newX, y: newY };
      };

    case 'torus':
      // Torus projection (both directions curved)
      return (x, y) => {
        const nx = (x - centerX) / (width / 2);
        const ny = (y - centerY) / (height / 2);
        const angleX = nx * Math.PI * intensity * 0.5;
        const angleY = ny * Math.PI * intensity * 0.5;
        const newX = centerX + Math.sin(angleX) * (width / 2) * (1 + Math.cos(angleY) * 0.2 * intensity);
        const newY = centerY + Math.sin(angleY) * (height / 2) * (1 + Math.cos(angleX) * 0.2 * intensity);
        return { x: newX, y: newY };
      };

    case 'sphere':
      // Spherical projection
      return (x, y) => {
        const nx = (x - centerX) / (width / 2);
        const ny = (y - centerY) / (height / 2);
        const dist = Math.sqrt(nx * nx + ny * ny);
        const maxDist = Math.sqrt(2);
        const scale = 1 - (1 - Math.cos(dist / maxDist * Math.PI * 0.5)) * intensity * 0.5;
        return {
          x: centerX + nx * scale * (width / 2),
          y: centerY + ny * scale * (height / 2),
        };
      };

    case 'hyperbolic':
      // Poincaré disk model
      return (x, y) => {
        const nx = (x - centerX) / (width / 2);
        const ny = (y - centerY) / (height / 2);
        const dist = Math.sqrt(nx * nx + ny * ny);
        if (dist === 0) return { x, y };
        const maxRadius = Math.sqrt(2);
        const hyperbolicDist = Math.tanh(dist * intensity) / Math.tanh(maxRadius * intensity);
        const scale = hyperbolicDist / dist;
        return {
          x: centerX + nx * scale * (width / 2),
          y: centerY + ny * scale * (height / 2),
        };
      };

    case 'spiral':
      // Spiral layout
      return (x, y) => {
        const nx = (x - centerX) / (width / 2);
        const ny = (y - centerY) / (height / 2);
        const dist = Math.sqrt(nx * nx + ny * ny);
        const angle = Math.atan2(ny, nx) + dist * Math.PI * intensity;
        return {
          x: centerX + Math.cos(angle) * dist * (width / 2),
          y: centerY + Math.sin(angle) * dist * (height / 2),
        };
      };

    case 'radial':
      // Radial/polar layout
      return (x, y) => {
        const nx = (x - centerX) / (width / 2);
        const ny = (y - centerY) / (height / 2);
        const dist = Math.sqrt(nx * nx + ny * ny);
        const maxDist = Math.sqrt(2);
        // Compress center, expand edges
        const newDist = Math.pow(dist / maxDist, 1 / (1 + intensity)) * maxDist;
        if (dist === 0) return { x: centerX, y: centerY };
        const scale = newDist / dist;
        return {
          x: centerX + nx * scale * (width / 2),
          y: centerY + ny * scale * (height / 2),
        };
      };

    case 'wave':
      // Wave deformation
      return (x, y) => {
        const waveAmp = intensity * 20;
        const waveFreq = 0.1;
        let newX = x;
        let newY = y;
        if (direction === 'horizontal' || direction === 'both') {
          newY += Math.sin((x - centerX) * waveFreq) * waveAmp;
        }
        if (direction === 'vertical' || direction === 'both') {
          newX += Math.sin((y - centerY) * waveFreq) * waveAmp;
        }
        if (!direction) {
          newY += Math.sin((x - centerX) * waveFreq) * waveAmp;
        }
        return { x: newX, y: newY };
      };

    case 'fisheye':
      // Fisheye lens effect
      return (x, y) => {
        const nx = (x - centerX) / (width / 2);
        const ny = (y - centerY) / (height / 2);
        const dist = Math.sqrt(nx * nx + ny * ny);
        if (dist === 0) return { x, y };
        const maxDist = Math.sqrt(2);
        // Fisheye formula: magnify center
        const fisheyeDist = dist * (1 + intensity * (1 - dist / maxDist));
        const scale = fisheyeDist / dist;
        return {
          x: centerX + nx * scale * (width / 2),
          y: centerY + ny * scale * (height / 2),
        };
      };

    case 'perspective':
      // 3D perspective projection
      return (x, y) => {
        const ny = (y - centerY) / (height / 2);
        // Closer to top = smaller (farther away)
        const perspectiveScale = 1 - ny * intensity * 0.3;
        const newX = centerX + (x - centerX) * perspectiveScale;
        const newY = y;
        return { x: newX, y: newY };
      };

    case 'custom':
      if (customTransform) {
        return customTransform;
      }
      return (x, y) => ({ x, y });

    default:
      return (x, y) => ({ x, y });
  }
}

/**
 * Apply a preset transformation to an existing topology.
 *
 * @param baseTopology The topology to transform
 * @param params Preset parameters
 * @returns Transformed topology
 */
export function applyTopologyPreset(
  baseTopology: GridTopology,
  params: TopologyPresetParams
): GridTopology {
  const { preset, intensity = 0.5 } = params;
  const bounds = baseTopology.bounds;
  const centerX = params.centerX ?? (bounds.minX + bounds.maxX) / 2;
  const centerY = params.centerY ?? (bounds.minY + bounds.maxY) / 2;

  // Get transformation function based on preset
  const transform = getPresetTransform(preset, {
    intensity,
    centerX,
    centerY,
    width: bounds.width,
    height: bounds.height,
    direction: params.direction,
    customTransform: params.customTransform,
  });

  // Create new topology with transformed positions
  const newCells = new Map<string, TopologyCell>();
  const newVertices = new Map<string, TopologyVertex>();
  const newEdges = new Map<string, TopologyEdge>();

  // Transform vertices
  for (const [id, vertex] of baseTopology.vertices) {
    const newPos = transform(vertex.position.x, vertex.position.y, vertex.row ?? 0, vertex.col ?? 0);
    newVertices.set(id, {
      ...vertex,
      position: newPos,
    });
  }

  // Transform cells (center positions)
  for (const [id, cell] of baseTopology.cells) {
    const newCenter = transform(cell.center.x, cell.center.y, cell.row ?? 0, cell.col ?? 0);
    newCells.set(id, {
      ...cell,
      center: newCenter,
    });
  }

  // Transform edges (midpoint positions)
  for (const [id, edge] of baseTopology.edges) {
    const newMidpoint = transform(edge.midpoint.x, edge.midpoint.y, edge.row ?? 0, edge.col ?? 0);
    newEdges.set(id, {
      ...edge,
      midpoint: newMidpoint,
    });
  }

  // Recalculate bounds
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const vertex of newVertices.values()) {
    minX = Math.min(minX, vertex.position.x);
    minY = Math.min(minY, vertex.position.y);
    maxX = Math.max(maxX, vertex.position.x);
    maxY = Math.max(maxY, vertex.position.y);
  }

  // Calculate total width/height including padding
  // Content starts at minX (typically outerPadding) and ends at maxX
  // Total size = maxX + outerPadding (for right padding)
  const outerPadding = baseTopology.sourceConfig?.outerPadding ?? 0;
  const totalWidth = maxX + outerPadding;
  const totalHeight = maxY + outerPadding;

  return {
    cells: newCells,
    vertices: newVertices,
    edges: newEdges,
    bounds: {
      minX,
      minY,
      maxX,
      maxY,
      width: totalWidth,
      height: totalHeight,
    },
    sourceConfig: baseTopology.sourceConfig,
  };
}

/**
 * Get all available preset options
 */
export function getTopologyPresetOptions(): { id: TopologyPreset; labelKey: string }[] {
  return [
    { id: 'square', labelKey: 'topology.preset.square' },
    { id: 'cylinder', labelKey: 'topology.preset.cylinder' },
    { id: 'mobius', labelKey: 'topology.preset.mobius' },
    { id: 'torus', labelKey: 'topology.preset.torus' },
    { id: 'sphere', labelKey: 'topology.preset.sphere' },
    { id: 'hyperbolic', labelKey: 'topology.preset.hyperbolic' },
    { id: 'spiral', labelKey: 'topology.preset.spiral' },
    { id: 'radial', labelKey: 'topology.preset.radial' },
    { id: 'wave', labelKey: 'topology.preset.wave' },
    { id: 'fisheye', labelKey: 'topology.preset.fisheye' },
    { id: 'perspective', labelKey: 'topology.preset.perspective' },
    { id: 'pyramid', labelKey: 'topology.preset.pyramid' },
  ];
}
