import React from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { usePuzzleStore } from '../../../store/puzzleStore';
import { LineElement, toDataLayer } from '../../../types';

// Group freehand lines by strokeId
interface FreehandStroke {
  strokeId: string;
  lines: LineElement[];
  color: string;
  style: string;
  thickness: string;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

// Freehand line list component - shows list of strokes that can be deleted
export const FreehandLineList: React.FC = () => {
  const { t } = useTranslation();
  const { puzzle, activeLayer, removeLine } = usePuzzleStore();

  const dataLayer = toDataLayer(activeLayer);

  // Get all freehand lines grouped by strokeId
  const strokes = React.useMemo(() => {
    const layerData = puzzle[dataLayer];
    const freeLines = Object.values(layerData.lines).filter((line: LineElement) => line.isFree);

    // Group lines by strokeId
    const strokeMap = new Map<string, LineElement[]>();
    freeLines.forEach((line) => {
      const sid = line.strokeId || line.id; // Fallback to id for legacy lines
      if (!strokeMap.has(sid)) {
        strokeMap.set(sid, []);
      }
      strokeMap.get(sid)!.push(line);
    });

    // Convert to stroke objects with bounds calculation
    const result: FreehandStroke[] = [];
    strokeMap.forEach((lines, strokeId) => {
      // Calculate bounding box for the stroke
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      lines.forEach((line) => {
        if (line.fromX !== undefined && line.fromY !== undefined &&
            line.toX !== undefined && line.toY !== undefined) {
          minX = Math.min(minX, line.fromX, line.toX);
          minY = Math.min(minY, line.fromY, line.toY);
          maxX = Math.max(maxX, line.fromX, line.toX);
          maxY = Math.max(maxY, line.fromY, line.toY);
        }
      });

      result.push({
        strokeId,
        lines,
        color: lines[0].color,
        style: lines[0].style,
        thickness: lines[0].thickness,
        bounds: { minX, minY, maxX, maxY },
      });
    });

    return result;
  }, [puzzle, dataLayer]);

  // Delete all lines in a stroke
  const deleteStroke = (stroke: FreehandStroke) => {
    stroke.lines.forEach((line) => removeLine(line.id));
  };

  if (strokes.length === 0) {
    return (
      <div className="text-xs text-office-text-secondary text-center py-2">
        {t('tool.line.freehand.noLines')}
      </div>
    );
  }

  return (
    <div className="border-t border-office-border pt-2 mt-2">
      <label className="block text-xs text-office-text-secondary mb-2">
        {t('tool.line.freehand.list')} ({strokes.length})
      </label>
      <div className="max-h-40 overflow-y-auto space-y-1">
        {strokes.map((stroke, index) => {
          // Calculate SVG viewBox to show the stroke
          const padding = 2;
          const width = stroke.bounds.maxX - stroke.bounds.minX;
          const height = stroke.bounds.maxY - stroke.bounds.minY;
          const viewBox = `${stroke.bounds.minX - padding} ${stroke.bounds.minY - padding} ${Math.max(width + padding * 2, 10)} ${Math.max(height + padding * 2, 10)}`;

          return (
            <div
              key={stroke.strokeId}
              className="flex items-center justify-between p-1.5 bg-gray-50 rounded border border-office-border group hover:bg-gray-100"
            >
              <div className="flex items-center gap-2">
                {/* Thumbnail preview of the stroke */}
                <svg
                  width="40"
                  height="24"
                  viewBox={viewBox}
                  preserveAspectRatio="xMidYMid meet"
                  className="bg-white rounded border border-gray-200"
                >
                  {stroke.lines.map((line) => (
                    line.fromX !== undefined && line.fromY !== undefined &&
                    line.toX !== undefined && line.toY !== undefined && (
                      <line
                        key={line.id}
                        x1={line.fromX}
                        y1={line.fromY}
                        x2={line.toX}
                        y2={line.toY}
                        stroke={line.color}
                        strokeWidth={line.thickness === 'thinnest' ? 1 : line.thickness === 'thin' ? 2 : line.thickness === 'thick' ? 5 : line.thickness === 'thickest' ? 8 : 3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray={line.style === 'dashed' ? '4,2' : line.style === 'dotted' ? '1,2' : undefined}
                      />
                    )
                  ))}
                </svg>
                <span className="text-[10px] text-office-text-secondary">#{index + 1}</span>
                <span className="text-[10px] text-gray-400">({stroke.lines.length})</span>
              </div>
              {/* Delete button */}
              <button
                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                onClick={() => deleteStroke(stroke)}
                title={t('action.delete')}
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
