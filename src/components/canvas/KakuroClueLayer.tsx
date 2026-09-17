import { useCanvasRenderState } from '../../hooks/useCanvasRenderState';
import { kakuroCellCorners } from '../../utils/kakuroGeometry';

export function KakuroClueLayer() {
  const { grid, puzzle, showProblemLayer, useTopology, topology } = useCanvasRenderState();
  if (!showProblemLayer || grid.gridType !== 'square') return null;
  return <g className="kakuro-clue-layer" pointerEvents="none">
    {Object.values(puzzle.problem.clueCells ?? {}).map(clue => {
      const corners = kakuroCellCorners({ grid, useTopology, topology }, clue.cellId);
      if (!corners) return null;
      const [a, b, c, d] = corners;
      return <g key={clue.id} data-kakuro-cell={clue.cellId}>
        <polygon points={corners.map(p => `${p.x},${p.y}`).join(' ')} fill="#000000" />
        <line x1={a.x} y1={a.y} x2={c.x} y2={c.y} stroke="#ffffff" strokeWidth={1} />
        {[
          { value: clue.horizontal, points: [a, b, c], name: 'horizontal' },
          { value: clue.vertical, points: [a, c, d], name: 'vertical' },
        ].map(({ value, points, name }) => typeof value === 'number' && value > 0 ?
          <text key={name} data-clue-direction={name} x={points.reduce((sum, p) => sum + p.x, 0) / 3}
            y={points.reduce((sum, p) => sum + p.y, 0) / 3} fill="#ffffff" fontSize={grid.cellSize * 0.28}
            textAnchor="middle" dominantBaseline="central" fontFamily="Arial, sans-serif">{value}</text> : null)}
      </g>;
    })}
  </g>;
}
