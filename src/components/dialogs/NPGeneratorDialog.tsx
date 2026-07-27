import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStoreApi } from '../../store/puzzleStoreContext';
import { runNpgenWorker } from '../../npgen/client';
import {
  detectRectangularBlocks,
  formatNpgenGrid,
  isStandardNineByNine,
  npgenResultToPuzzleState,
  parseNpgenGrid,
  puzzleNumbersToGrid,
} from '../../npgen/puzzleAdapter';
import {
  DEFAULT_NPGEN_OPTIONS,
  NPGEN_TECHNIQUES,
  NPGEN_UNIQUENESS,
  type NpgenBlockKind,
  type NpgenEngineResult,
  type NpgenOperation,
  type NpgenOptions,
  type NpgenXmlPuzzle,
} from '../../npgen/types';

interface NPGeneratorDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const OPERATION_KEYS: Array<{ value: NpgenOperation; label: string }> = [
  { value: 'solve', label: 'npgen.operation.solve' },
  { value: 'generate', label: 'npgen.operation.generate' },
  { value: 'random', label: 'npgen.operation.random' },
  { value: 'benchmark', label: 'npgen.operation.benchmark' },
];

const BLOCK_KEYS: Array<{ value: NpgenBlockKind; label: string }> = [
  { value: 'default', label: 'npgen.blocks.default' },
  { value: 'rectangle', label: 'npgen.blocks.rectangle' },
  { value: 'random', label: 'npgen.blocks.random' },
  { value: 'custom', label: 'npgen.blocks.custom' },
];

function emptyGrid(size: number, pattern = false): string {
  return formatNpgenGrid(new Array(size * size).fill(0), size, pattern);
}

function factorPair(size: number): [number, number] {
  for (let height = Math.floor(Math.sqrt(size)); height >= 1; height--) {
    if (size % height === 0) return [size / height, height];
  }
  return [size, 1];
}

function Field({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-office-text-secondary mb-1">{label}</span>
      {children}
    </label>
  );
}

export const NPGeneratorDialog: React.FC<NPGeneratorDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const store = usePuzzleStoreApi();
  const abortRef = useRef<AbortController | null>(null);
  const [operation, setOperation] = useState<NpgenOperation>('random');
  const [options, setOptions] = useState<NpgenOptions>(DEFAULT_NPGEN_OPTIONS);
  const [hints, setHints] = useState(20);
  const [benchmarkCount, setBenchmarkCount] = useState(1);
  const [problemText, setProblemText] = useState(() => emptyGrid(9));
  const [patternText, setPatternText] = useState(() => emptyGrid(9, true));
  const [hiddenText, setHiddenText] = useState(() => emptyGrid(9));
  const [blocksText, setBlocksText] = useState('');
  const [result, setResult] = useState<NpgenEngineResult | null>(null);
  const [benchmarkResult, setBenchmarkResult] = useState<{
    count: number;
    succeeded: number;
    elapsedMs: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const updateOptions = (patch: Partial<NpgenOptions>) =>
    setOptions((current) => ({ ...current, ...patch }));

  const readCurrentBoard = () => {
    const state = store.getState();
    const size = state.grid.rows === state.grid.cols ? state.grid.rows : options.size;
    if (size < 2 || size > 25) {
      setError(t('npgen.error.size', 'NPGenerator supports square grids from size 2 to 25.'));
      return;
    }
    const values = puzzleNumbersToGrid(state.puzzle, size);
    const [blockWidth, blockHeight] = factorPair(size);
    updateOptions({ size, blockWidth, blockHeight });
    setProblemText(formatNpgenGrid(values, size));
    setPatternText(formatNpgenGrid(values.map((value) => Number(value > 0)), size, true));
    setHiddenText(emptyGrid(size));
    setResult(null);
    setError('');
  };

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, [isOpen]);

  const resize = (size: number) => {
    const bounded = Math.max(2, Math.min(25, size));
    const [blockWidth, blockHeight] = factorPair(bounded);
    updateOptions({ size: bounded, blockWidth, blockHeight, blockLabels: [] });
    setProblemText(emptyGrid(bounded));
    setPatternText(emptyGrid(bounded, true));
    setHiddenText(emptyGrid(bounded));
    setBlocksText('');
    setResult(null);
  };

  const effectiveOptions = (): NpgenOptions => ({
    ...options,
    blockLabels:
      options.blockKind === 'custom'
        ? parseNpgenGrid(blocksText, options.size)
        : [],
  });

  const run = async () => {
    setBusy(true);
    setError('');
    setResult(null);
    setBenchmarkResult(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      if (operation === 'benchmark') {
        const value = await runNpgenWorker<{
          count: number;
          succeeded: number;
          elapsedMs: number;
        }>(
          { type: 'benchmark', count: benchmarkCount, seed: options.seed },
          controller.signal,
        );
        setBenchmarkResult(value);
      } else {
        const prepared = effectiveOptions();
        const value =
          operation === 'solve'
            ? await runNpgenWorker<NpgenEngineResult>(
                {
                  type: 'solve',
                  options: prepared,
                  problem: parseNpgenGrid(problemText, options.size),
                },
                controller.signal,
              )
            : operation === 'generate'
              ? await runNpgenWorker<NpgenEngineResult>(
                  {
                    type: 'generate',
                    options: prepared,
                    pattern: parseNpgenGrid(patternText, options.size, true),
                    hidden: parseNpgenGrid(hiddenText, options.size),
                  },
                  controller.signal,
                )
              : await runNpgenWorker<NpgenEngineResult>(
                  { type: 'random', options: prepared, hints },
                  controller.signal,
                );
        setResult(value);
      }
    } catch (reason) {
      if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
        setError(reason instanceof Error ? reason.message : String(reason));
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setBusy(false);
    }
  };

  const cancel = () => abortRef.current?.abort();

  const applyResult = (includeSolution: boolean) => {
    if (!result) return;
    const size = Math.sqrt(result.problem.length);
    const standard = isStandardNineByNine(result);
    const rectangularBlocks = detectRectangularBlocks(result);
    const state = store.getState();
    state.newPuzzle({
      rows: size,
      cols: size,
      gridType: 'square',
      schemaId: standard ? 'sudoku' : undefined,
    });
    const nextState = store.getState();
    nextState.setCurrentSchemaId(standard ? 'sudoku' : null);
    if (rectangularBlocks) {
      nextState.setGrid({
        gridStyle: 'sudoku',
        blockRows: rectangularBlocks.height,
        blockCols: rectangularBlocks.width,
        frameStyle: 'thick',
      });
    } else {
      nextState.setGrid({ gridStyle: 'normal', frameStyle: 'thick' });
    }
    store.setState({ puzzle: npgenResultToPuzzleState(result, includeSolution) });
    store.getState().setActiveLayer(includeSolution ? 'answer' : 'problem');
    store.getState().historyManager.clear();
    onClose();
  };

  const importXml = async (file: File) => {
    setBusy(true);
    setError('');
    try {
      const parsed = await runNpgenWorker<NpgenXmlPuzzle>({
        type: 'parse-xml',
        xml: await file.text(),
      });
      const [blockWidth, blockHeight] = factorPair(parsed.size);
      setOptions({
        ...options,
        size: parsed.size,
        blockKind: parsed.defaultBlock ? 'default' : 'custom',
        blockWidth,
        blockHeight,
        blockLabels: parsed.blockLabels,
        diagonal: parsed.diagonal,
      });
      setProblemText(formatNpgenGrid(parsed.problem, parsed.size));
      setPatternText(formatNpgenGrid(parsed.pattern, parsed.size, true));
      setHiddenText(formatNpgenGrid(parsed.hidden, parsed.size));
      setBlocksText(
        parsed.defaultBlock ? '' : formatNpgenGrid(parsed.blockLabels, parsed.size),
      );
      setResult({
        pattern: parsed.pattern,
        problem: parsed.problem,
        solution: parsed.solution,
        blockLabels: parsed.defaultBlock
          ? (() => {
              const root = Math.sqrt(parsed.size);
              return Array.from({ length: parsed.size * parsed.size }, (_, index) => {
                const row = Math.floor(index / parsed.size);
                const col = index % parsed.size;
                return Math.floor(row / root) * root + Math.floor(col / root) + 1;
              });
            })()
          : parsed.blockLabels,
        difficulty: parsed.difficulty,
        answerKind: 'unique',
        diagonal: parsed.diagonal,
        defaultBlock: parsed.defaultBlock,
      });
      setOperation('solve');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  const exportXml = async () => {
    if (!result) return;
    setBusy(true);
    setError('');
    try {
      const value = await runNpgenWorker<{ xml: string }>({
        type: 'format-xml',
        puzzle: {
          size: options.size,
          pattern: result.pattern,
          hidden:
            operation === 'generate'
              ? parseNpgenGrid(hiddenText, options.size)
              : new Array(options.size * options.size).fill(0),
          problem: result.problem,
          solution: result.solution,
          blockLabels: result.blockLabels,
          difficulty: Math.trunc(result.difficulty),
          diagonal: result.diagonal,
          defaultBlock: result.defaultBlock,
        },
      });
      const url = URL.createObjectURL(new Blob([value.xml], { type: 'application/xml' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `npgen-${options.size}x${options.size}.xml`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  const preview = useMemo(
    () => (result ? formatNpgenGrid(result.problem, options.size) : ''),
    [result, options.size],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-3">
      <div className="bg-white border border-office-border shadow-xl rounded-sm w-[min(1180px,96vw)] max-h-[94vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-office-border">
          <div>
            <h2 className="text-lg font-semibold">NPGenerator 2007</h2>
            <p className="text-xs text-office-text-secondary">
              {t('npgen.subtitle', 'Number Place generation, solving, evaluation, and variants (WebAssembly)')}
            </p>
          </div>
          <button type="button" className="btn-office" onClick={onClose} disabled={busy}>
            {t('action.close', 'Close')}
          </button>
        </div>

        <div className="flex border-b border-office-border px-4 pt-2 gap-1">
          {OPERATION_KEYS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`px-3 py-2 text-sm border-b-2 ${
                operation === item.value
                  ? 'border-office-accent text-office-accent font-medium'
                  : 'border-transparent text-office-text-secondary'
              }`}
              onClick={() => setOperation(item.value)}
            >
              {t(item.label)}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-[260px_1fr_300px] gap-4">
          <section className="space-y-3">
            <h3 className="font-medium text-sm border-b pb-1">{t('npgen.board', 'Board')}</h3>
            <div className="grid grid-cols-2 gap-2">
              <Field label={t('npgen.size', 'Size')}>
                <input
                  type="number"
                  min={2}
                  max={25}
                  className="input-office w-full"
                  value={options.size}
                  onChange={(event) => resize(Number(event.target.value))}
                />
              </Field>
              <Field label={t('npgen.seed', 'Seed')}>
                <input
                  className="input-office w-full"
                  value={options.seed}
                  onChange={(event) => updateOptions({ seed: event.target.value })}
                />
              </Field>
            </div>
            <Field label={t('npgen.blocks', 'Blocks')}>
              <select
                className="input-office w-full"
                value={options.blockKind}
                onChange={(event) =>
                  updateOptions({ blockKind: event.target.value as NpgenBlockKind })
                }
              >
                {BLOCK_KEYS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {t(item.label)}
                  </option>
                ))}
              </select>
            </Field>
            {options.blockKind === 'rectangle' && (
              <div className="grid grid-cols-2 gap-2">
                <Field label={t('npgen.blockWidth', 'Width')}>
                  <input
                    type="number"
                    min={1}
                    max={25}
                    className="input-office w-full"
                    value={options.blockWidth}
                    onChange={(event) => updateOptions({ blockWidth: Number(event.target.value) })}
                  />
                </Field>
                <Field label={t('npgen.blockHeight', 'Height')}>
                  <input
                    type="number"
                    min={1}
                    max={25}
                    className="input-office w-full"
                    value={options.blockHeight}
                    onChange={(event) => updateOptions({ blockHeight: Number(event.target.value) })}
                  />
                </Field>
              </div>
            )}
            {options.blockKind === 'custom' && (
              <Field label={t('npgen.blockLabels', 'Block label grid')}>
                <textarea
                  className="input-office w-full h-32 font-mono text-[11px] whitespace-pre"
                  value={blocksText}
                  onChange={(event) => setBlocksText(event.target.value)}
                  placeholder={t('npgen.blockLabelsHint', 'Enter N × N block labels')}
                />
              </Field>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={options.diagonal}
                onChange={(event) => updateOptions({ diagonal: event.target.checked })}
              />
              {t('npgen.diagonal', 'Diagonal constraints')}
            </label>
            <button type="button" className="btn-office w-full" onClick={readCurrentBoard}>
              {t('npgen.readBoard', 'Read current puzzle-kit board')}
            </button>

            {operation !== 'solve' && operation !== 'benchmark' && (
              <>
                <h3 className="font-medium text-sm border-b pb-1 pt-2">
                  {t('npgen.generation', 'Generation')}
                </h3>
                {operation === 'random' && (
                  <Field label={t('npgen.hints', 'Hint count (multiple of 4)')}>
                    <input
                      type="number"
                      min={4}
                      step={4}
                      className="input-office w-full"
                      value={hints}
                      onChange={(event) => setHints(Number(event.target.value))}
                    />
                  </Field>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <Field label={t('npgen.difficultyMin', 'Difficulty min')}>
                    <input
                      type="number"
                      className="input-office w-full"
                      value={options.difficultyMin}
                      onChange={(event) =>
                        updateOptions({ difficultyMin: Number(event.target.value) })
                      }
                    />
                  </Field>
                  <Field label={t('npgen.difficultyMax', 'Max (-1 = unlimited)')}>
                    <input
                      type="number"
                      className="input-office w-full"
                      value={options.difficultyMax}
                      onChange={(event) =>
                        updateOptions({ difficultyMax: Number(event.target.value) })
                      }
                    />
                  </Field>
                </div>
                <Field label={t('npgen.forbidden', 'Forbidden given number')}>
                  <select
                    className="input-office w-full"
                    value={options.forbidden}
                    onChange={(event) => updateOptions({ forbidden: Number(event.target.value) })}
                  >
                    <option value={-1}>{t('npgen.none', 'None')}</option>
                    {Array.from({ length: options.size }, (_, index) => index + 1).map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </Field>
              </>
            )}
          </section>

          <section className="space-y-3 min-w-0">
            <h3 className="font-medium text-sm border-b pb-1">
              {operation === 'solve'
                ? t('npgen.problemGrid', 'Problem grid')
                : operation === 'generate'
                  ? t('npgen.patternGrid', 'Hint pattern')
                  : t('npgen.output', 'Output')}
            </h3>
            {operation === 'solve' && (
              <textarea
                className="input-office w-full h-64 font-mono text-xs whitespace-pre"
                value={problemText}
                onChange={(event) => setProblemText(event.target.value)}
              />
            )}
            {operation === 'generate' && (
              <>
                <textarea
                  className="input-office w-full h-48 font-mono text-xs whitespace-pre"
                  value={patternText}
                  onChange={(event) => setPatternText(event.target.value)}
                />
                <Field label={t('npgen.hiddenGrid', 'Fixed/hidden numbers (optional)')}>
                  <textarea
                    className="input-office w-full h-36 font-mono text-xs whitespace-pre"
                    value={hiddenText}
                    onChange={(event) => setHiddenText(event.target.value)}
                  />
                </Field>
              </>
            )}
            {operation === 'random' && !result && (
              <div className="h-64 border border-dashed border-office-border flex items-center justify-center text-sm text-office-text-secondary">
                {t('npgen.randomHint', 'Run the generator to create a symmetric hint pattern.')}
              </div>
            )}
            {operation === 'benchmark' && (
              <div className="space-y-3">
                <Field label={t('npgen.benchmarkCount', 'Puzzle count')}>
                  <input
                    type="number"
                    min={1}
                    className="input-office w-full"
                    value={benchmarkCount}
                    onChange={(event) => setBenchmarkCount(Number(event.target.value))}
                  />
                </Field>
                <p className="text-xs text-office-text-secondary">
                  {t('npgen.benchmarkHint', 'Runs the original 9×9 / 20-hint benchmark with one continuous random stream.')}
                </p>
              </div>
            )}
            {result && operation !== 'benchmark' && (
              <div>
                <div className="grid grid-cols-2 gap-2 mb-2 text-sm">
                  <div className="bg-gray-50 border p-2">
                    {t('npgen.difficulty', 'Difficulty')}: {Number.isNaN(result.difficulty) ? '—' : result.difficulty}
                  </div>
                  <div className="bg-gray-50 border p-2">
                    {t('npgen.answerKind', 'Result')}: {t(`npgen.answer.${result.answerKind}`, result.answerKind)}
                  </div>
                </div>
                <textarea
                  readOnly
                  className="input-office w-full h-64 font-mono text-xs whitespace-pre bg-gray-50"
                  value={preview}
                />
              </div>
            )}
            {benchmarkResult && (
              <div className="border bg-gray-50 p-4 text-sm space-y-1">
                <div>{t('npgen.succeeded', 'Succeeded')}: {benchmarkResult.succeeded}/{benchmarkResult.count}</div>
                <div>{t('npgen.elapsed', 'Elapsed')}: {benchmarkResult.elapsedMs.toFixed(1)} ms</div>
                <div>{t('npgen.perPuzzle', 'Per puzzle')}: {(benchmarkResult.elapsedMs / benchmarkResult.count).toFixed(1)} ms</div>
              </div>
            )}
            {error && (
              <div className="border border-red-300 bg-red-50 text-red-700 p-3 text-sm whitespace-pre-wrap">
                {error}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="font-medium text-sm border-b pb-1">
              {t('npgen.solverOptions', 'Solver methods')}
            </h3>
            <div className="space-y-1">
              {NPGEN_TECHNIQUES.map((name, index) => (
                <label key={name} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={(options.techniqueMask & (1 << index)) !== 0}
                    onChange={(event) =>
                      updateOptions({
                        techniqueMask: event.target.checked
                          ? options.techniqueMask | (1 << index)
                          : options.techniqueMask & ~(1 << index),
                      })
                    }
                  />
                  {t(`npgen.technique.${name}`, name)}
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-office text-xs" onClick={() => updateOptions({ techniqueMask: 0b1111111 })}>
                {t('npgen.all', 'All')}
              </button>
              <button type="button" className="btn-office text-xs" onClick={() => updateOptions({ techniqueMask: 0 })}>
                {t('npgen.none', 'None')}
              </button>
            </div>
            <h3 className="font-medium text-sm border-b pb-1 pt-2">
              {t('npgen.uniqueness', 'Uniqueness checks')}
            </h3>
            {NPGEN_UNIQUENESS.map((name, index) => (
              <label key={name} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={(options.uniquenessMask & (1 << index)) !== 0}
                  onChange={(event) =>
                    updateOptions({
                      uniquenessMask: event.target.checked
                        ? options.uniquenessMask | (1 << index)
                        : options.uniquenessMask & ~(1 << index),
                    })
                  }
                />
                {t(`npgen.unique.${name}`, name)}
              </label>
            ))}

            <h3 className="font-medium text-sm border-b pb-1 pt-2">
              {t('npgen.xml', 'NPGenerator XML')}
            </h3>
            <label className="btn-office block text-center cursor-pointer">
              {t('npgen.importXml', 'Import XML')}
              <input
                type="file"
                accept=".xml,application/xml,text/xml"
                className="hidden"
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importXml(file);
                  event.target.value = '';
                }}
              />
            </label>
            <button type="button" className="btn-office w-full" disabled={!result || busy} onClick={() => void exportXml()}>
              {t('npgen.exportXml', 'Export result XML')}
            </button>
            <p className="text-[11px] text-office-text-secondary">
              GPL-3.0-or-later · NPGenerator V2.0.2 · © 2007 Time Intermedia Corporation
            </p>
          </section>
        </div>

        <div className="border-t border-office-border p-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            {result && operation !== 'benchmark' && (
              <>
                <button type="button" className="btn-office" onClick={() => applyResult(false)}>
                  {t('npgen.applyProblem', 'Apply problem to puzzle-kit')}
                </button>
                <button type="button" className="btn-office" onClick={() => applyResult(true)}>
                  {t('npgen.applySolution', 'Apply problem + solution')}
                </button>
              </>
            )}
          </div>
          <div className="flex gap-2">
            {busy ? (
              <button type="button" className="btn-office" onClick={cancel}>
                {t('solver.cancel', 'Cancel')}
              </button>
            ) : (
              <button type="button" className="btn-office-primary min-w-28" onClick={() => void run()}>
                {operation === 'solve'
                  ? t('npgen.runSolve', 'Solve / evaluate')
                  : operation === 'benchmark'
                    ? t('npgen.runBenchmark', 'Run benchmark')
                    : t('npgen.runGenerate', 'Generate')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
