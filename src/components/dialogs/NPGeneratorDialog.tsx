import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStoreApi } from '../../store/puzzleStoreContext';
import { runNpgenWorker } from '../../npgen/client';
import {
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
  type NpgenSymmetry,
  type NpgenXmlPuzzle,
} from '../../npgen/types';
import { createRandomNpgenSeed } from '../../npgen/seed';
import { NPGeneratorGridEditor } from './NPGeneratorGridEditor';

interface NPGeneratorDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const OPERATION_KEYS: Array<{ value: NpgenOperation; label: string }> = [
  { value: 'solve', label: 'npgen.operation.solve' },
  { value: 'generate', label: 'npgen.operation.generate' },
  { value: 'random', label: 'npgen.operation.random' },
];

const BLOCK_KEYS: Array<{ value: NpgenBlockKind; label: string }> = [
  { value: 'default', label: 'npgen.blocks.default' },
  { value: 'rectangle', label: 'npgen.blocks.rectangle' },
  { value: 'random', label: 'npgen.blocks.random' },
  { value: 'custom', label: 'npgen.blocks.custom' },
];

const SYMMETRY_KEYS: Array<{ value: NpgenSymmetry; label: string }> = [
  { value: 'rot4', label: 'npgen.symmetry.rot4' },
  { value: 'rot2', label: 'npgen.symmetry.rot2' },
  { value: 'mirror-h', label: 'npgen.symmetry.mirror-h' },
  { value: 'mirror-v', label: 'npgen.symmetry.mirror-v' },
  { value: 'none', label: 'npgen.symmetry.none' },
];

function emptyGrid(size: number): number[] {
  return new Array(size * size).fill(0);
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
  const [manualSeed, setManualSeed] = useState(false);
  const [hints, setHints] = useState(20);
  const [problemGrid, setProblemGrid] = useState(() => emptyGrid(9));
  const [patternGrid, setPatternGrid] = useState(() => emptyGrid(9));
  const [hiddenGrid, setHiddenGrid] = useState(() => emptyGrid(9));
  const [initialSeedGrid, setInitialSeedGrid] = useState(() => emptyGrid(9));
  const [generateGridMode, setGenerateGridMode] =
    useState<'pattern' | 'hidden' | 'seed'>('pattern');
  const [blocksText, setBlocksText] = useState('');
  const [additionalGroupTexts, setAdditionalGroupTexts] = useState<string[]>([]);
  const [xmlComment, setXmlComment] = useState('');
  const [result, setResult] = useState<NpgenEngineResult | null>(null);
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
    setProblemGrid(values);
    setPatternGrid(values.map((value) => Number(value > 0)));
    setHiddenGrid(emptyGrid(size));
    setInitialSeedGrid(emptyGrid(size));
    setResult(null);
    setError('');
  };

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, [isOpen]);

  const resize = (size: number) => {
    const bounded = Math.max(2, Math.min(25, size));
    const [blockWidth, blockHeight] = factorPair(bounded);
    updateOptions({
      size: bounded,
      blockWidth,
      blockHeight,
      blockLabels: [],
      additionalGroupLabels: [],
    });
    setProblemGrid(emptyGrid(bounded));
    setPatternGrid(emptyGrid(bounded));
    setHiddenGrid(emptyGrid(bounded));
    setInitialSeedGrid(emptyGrid(bounded));
    setBlocksText('');
    setAdditionalGroupTexts([]);
    setResult(null);
  };

  const effectiveOptions = (seed: string): NpgenOptions => ({
    ...options,
    seed,
    blockLabels:
      options.blockKind === 'custom'
        ? parseNpgenGrid(blocksText, options.size)
        : [],
    additionalGroupLabels: additionalGroupTexts.flatMap((text) =>
      parseNpgenGrid(text, options.size),
    ),
  });

  const run = async () => {
    setBusy(true);
    setError('');
    setResult(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const runSeed = manualSeed ? options.seed : createRandomNpgenSeed();
      if (!manualSeed) {
        updateOptions({ seed: runSeed });
      }
      const prepared = effectiveOptions(runSeed);
      const value =
        operation === 'solve'
          ? await runNpgenWorker<NpgenEngineResult>(
              {
                type: 'solve',
                options: prepared,
                problem: problemGrid,
              },
              controller.signal,
            )
          : operation === 'generate'
            ? await runNpgenWorker<NpgenEngineResult>(
                {
                  type: 'generate',
                  options: prepared,
                  pattern: patternGrid,
                  hidden: hiddenGrid,
                  initialSeed: initialSeedGrid.every((value) => value === 0)
                    ? []
                    : initialSeedGrid,
                },
                controller.signal,
              )
            : await runNpgenWorker<NpgenEngineResult>(
                { type: 'random', options: prepared, hints },
                controller.signal,
              );
      setResult(value);
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
    const state = store.getState();
    state.newPuzzle({
      rows: size,
      cols: size,
      gridType: 'square',
      schemaId: standard ? 'sudoku' : undefined,
    });
    const nextState = store.getState();
    nextState.setCurrentSchemaId(standard ? 'sudoku' : null);
    if (!standard) nextState.setGrid({ gridStyle: 'normal', frameStyle: 'thick' });
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
      const cells = parsed.size * parsed.size;
      const groups = Array.from({ length: parsed.groupCount }, (_, index) =>
        parsed.groupLabels.slice(index * cells, (index + 1) * cells),
      );
      const additionalGroups = parsed.defaultBlock ? groups : groups.slice(1);
      setOptions({
        ...options,
        size: parsed.size,
        blockKind: parsed.defaultBlock ? 'default' : 'custom',
        blockWidth,
        blockHeight,
        blockLabels: parsed.blockLabels,
        additionalGroupLabels: additionalGroups.flat(),
        vertical: parsed.vertical,
        horizontal: parsed.horizontal,
        diagonal: parsed.diagonal,
        diagonalLast: true,
      });
      setProblemGrid(parsed.problem);
      setPatternGrid(parsed.pattern);
      setHiddenGrid(parsed.hidden);
      setInitialSeedGrid(
        parsed.initialSeed.length === cells ? parsed.initialSeed : emptyGrid(parsed.size),
      );
      setAdditionalGroupTexts(
        additionalGroups.map((group) => formatNpgenGrid(group, parsed.size)),
      );
      setXmlComment(parsed.comment);
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
        groupLabels: parsed.groupLabels,
        difficulty: parsed.difficulty,
        answerKind: 'unique',
        vertical: parsed.vertical,
        horizontal: parsed.horizontal,
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
              ? hiddenGrid
              : new Array(options.size * options.size).fill(0),
          problem: result.problem,
          solution: result.solution,
          blockLabels: result.blockLabels,
          groupLabels: result.groupLabels,
          groupCount: result.groupLabels.length / (options.size * options.size),
          initialSeed: [],
          difficulty: Math.trunc(result.difficulty),
          vertical: result.vertical,
          horizontal: result.horizontal,
          diagonal: result.diagonal,
          hasHint: true,
          comment: xmlComment,
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

  const editorBlockLabels = useMemo(() => {
    if (options.blockKind === 'random') return [];
    if (options.blockKind === 'custom') {
      try {
        return parseNpgenGrid(blocksText, options.size);
      } catch {
        return [];
      }
    }
    const width = options.blockWidth;
    const height = options.blockHeight;
    if (width < 1 || height < 1 || width * height !== options.size) return [];
    const blocksPerRow = options.size / width;
    return Array.from({ length: options.size * options.size }, (_, index) => {
      const row = Math.floor(index / options.size);
      const col = index % options.size;
      return Math.floor(row / height) * blocksPerRow + Math.floor(col / width) + 1;
    });
  }, [
    blocksText,
    options.blockHeight,
    options.blockKind,
    options.blockWidth,
    options.size,
  ]);

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
                  disabled={!manualSeed}
                  onChange={(event) => updateOptions({ seed: event.target.value })}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={manualSeed}
                onChange={(event) => setManualSeed(event.target.checked)}
              />
              {t('npgen.manualSeed', 'Change / specify seed')}
            </label>
            {!manualSeed && (
              <p className="text-[11px] text-office-text-secondary">
                {t('npgen.randomSeedHint', 'A new random seed is used for every run.')}
              </p>
            )}
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
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={options.vertical}
                  onChange={(event) => updateOptions({ vertical: event.target.checked })}
                />
                {t('npgen.vertical', 'Column constraints')}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={options.horizontal}
                  onChange={(event) => updateOptions({ horizontal: event.target.checked })}
                />
                {t('npgen.horizontal', 'Row constraints')}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={options.diagonal}
                  onChange={(event) => updateOptions({ diagonal: event.target.checked })}
                />
                {t('npgen.diagonal', 'Diagonal constraints')}
              </label>
              {options.diagonal && (
                <label className="flex items-center gap-2 text-xs pl-5">
                  <input
                    type="checkbox"
                    checked={options.diagonalLast}
                    onChange={(event) =>
                      updateOptions({ diagonalLast: event.target.checked })
                    }
                  />
                  {t('npgen.diagonalLast', 'Apply diagonals after custom groups')}
                </label>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-office-text-secondary">
                  {t('npgen.additionalGroups', 'Additional constraint groups')}
                </span>
                <button
                  type="button"
                  className="btn-office text-xs"
                  onClick={() =>
                    setAdditionalGroupTexts((current) => [
                      ...current,
                      formatNpgenGrid(emptyGrid(options.size), options.size),
                    ])
                  }
                >
                  {t('npgen.addGroup', 'Add group')}
                </button>
              </div>
              {additionalGroupTexts.map((text, index) => (
                <div key={index} className="space-y-1">
                  <textarea
                    aria-label={t('npgen.groupLabel', 'Constraint group {{number}}', {
                      number: index + 1,
                    })}
                    className="input-office w-full h-24 font-mono text-[11px] whitespace-pre"
                    value={text}
                    onChange={(event) =>
                      setAdditionalGroupTexts((current) =>
                        current.map((value, item) =>
                          item === index ? event.target.value : value,
                        ),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="btn-office text-xs"
                    onClick={() =>
                      setAdditionalGroupTexts((current) =>
                        current.filter((_, item) => item !== index),
                      )
                    }
                  >
                    {t('npgen.removeGroup', 'Remove group')}
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="btn-office w-full" onClick={readCurrentBoard}>
              {t('npgen.readBoard', 'Read current puzzle-kit board')}
            </button>

            {operation !== 'solve' && (
              <>
                <h3 className="font-medium text-sm border-b pb-1 pt-2">
                  {t('npgen.generation', 'Generation')}
                </h3>
                {operation === 'random' && (
                  <div className="grid grid-cols-2 gap-2">
                    <Field label={t('npgen.hints', 'Hint count')}>
                      <input
                        type="number"
                        min={1}
                        step={options.symmetry === 'rot4' ? 4 : options.symmetry === 'none' ? 1 : 2}
                        className="input-office w-full"
                        value={hints}
                        onChange={(event) => setHints(Number(event.target.value))}
                      />
                    </Field>
                    <Field label={t('npgen.symmetry', 'Symmetry')}>
                      <select
                        className="input-office w-full"
                        value={options.symmetry}
                        onChange={(event) =>
                          updateOptions({
                            symmetry: event.target.value as NpgenSymmetry,
                          })
                        }
                      >
                        {SYMMETRY_KEYS.map((item) => (
                          <option key={item.value} value={item.value}>
                            {t(item.label)}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
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
                <Field label={t('npgen.retryLimit', 'Retry limit')}>
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    className="input-office w-full"
                    value={options.retryLimit}
                    onChange={(event) =>
                      updateOptions({ retryLimit: Number(event.target.value) })
                    }
                  />
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
              <NPGeneratorGridEditor
                size={options.size}
                values={problemGrid}
                mode="numbers"
                label={t('npgen.problemGrid', 'Problem grid')}
                instructions={t(
                  'npgen.editor.numberInstructions',
                  'Select a cell, then use the keyboard or number pad.',
                )}
                clearLabel={t('npgen.editor.clear', 'Clear board')}
                emptyLabel={t('npgen.editor.empty', 'Empty')}
                numberPadLabel={t('npgen.editor.numberPad', 'Number pad')}
                blockLabels={editorBlockLabels}
                diagonal={options.diagonal}
                onChange={setProblemGrid}
              />
            )}
            {operation === 'generate' && (
              <>
                <div className="flex gap-1 border-b border-office-border">
                  <button
                    type="button"
                    className={`px-3 py-2 text-sm border-b-2 ${
                      generateGridMode === 'pattern'
                        ? 'border-office-accent text-office-accent font-medium'
                        : 'border-transparent text-office-text-secondary'
                    }`}
                    onClick={() => setGenerateGridMode('pattern')}
                  >
                    {t('npgen.patternGrid', 'Hint pattern')}
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-2 text-sm border-b-2 ${
                      generateGridMode === 'hidden'
                        ? 'border-office-accent text-office-accent font-medium'
                        : 'border-transparent text-office-text-secondary'
                    }`}
                    onClick={() => setGenerateGridMode('hidden')}
                  >
                    {t('npgen.hiddenGrid', 'Fixed/hidden numbers (optional)')}
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-2 text-sm border-b-2 ${
                      generateGridMode === 'seed'
                        ? 'border-office-accent text-office-accent font-medium'
                        : 'border-transparent text-office-text-secondary'
                    }`}
                    onClick={() => setGenerateGridMode('seed')}
                  >
                    {t('npgen.initialSeedGrid', 'Initial solution seed (optional)')}
                  </button>
                </div>
                {generateGridMode === 'pattern' ? (
                  <NPGeneratorGridEditor
                    size={options.size}
                    values={patternGrid}
                    mode="pattern"
                    label={t('npgen.patternGrid', 'Hint pattern')}
                    instructions={t(
                      'npgen.editor.patternInstructions',
                      'Click cells to toggle hint positions.',
                    )}
                    clearLabel={t('npgen.editor.clear', 'Clear board')}
                    emptyLabel={t('npgen.editor.empty', 'Empty')}
                    blockLabels={editorBlockLabels}
                    diagonal={options.diagonal}
                    onChange={setPatternGrid}
                  />
                ) : generateGridMode === 'hidden' ? (
                  <NPGeneratorGridEditor
                    size={options.size}
                    values={hiddenGrid}
                    mode="numbers"
                    label={t('npgen.hiddenGrid', 'Fixed/hidden numbers (optional)')}
                    instructions={t(
                      'npgen.editor.numberInstructions',
                      'Select a cell, then use the keyboard or number pad.',
                    )}
                    clearLabel={t('npgen.editor.clear', 'Clear board')}
                    emptyLabel={t('npgen.editor.empty', 'Empty')}
                    numberPadLabel={t('npgen.editor.numberPad', 'Number pad')}
                    blockLabels={editorBlockLabels}
                    diagonal={options.diagonal}
                    onChange={setHiddenGrid}
                  />
                ) : (
                  <NPGeneratorGridEditor
                    size={options.size}
                    values={initialSeedGrid}
                    mode="numbers"
                    label={t('npgen.initialSeedGrid', 'Initial solution seed (optional)')}
                    instructions={t(
                      'npgen.editor.numberInstructions',
                      'Select a cell, then use the keyboard or number pad.',
                    )}
                    clearLabel={t('npgen.editor.clear', 'Clear board')}
                    emptyLabel={t('npgen.editor.empty', 'Empty')}
                    numberPadLabel={t('npgen.editor.numberPad', 'Number pad')}
                    blockLabels={editorBlockLabels}
                    diagonal={options.diagonal}
                    onChange={setInitialSeedGrid}
                  />
                )}
              </>
            )}
            {operation === 'random' && !result && (
              <div className="h-64 border border-dashed border-office-border flex items-center justify-center text-sm text-office-text-secondary">
                {t('npgen.randomHint', 'Run the generator to create a symmetric hint pattern.')}
              </div>
            )}
            {result && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 mb-2 text-sm">
                  <div className="bg-gray-50 border p-2">
                    {t('npgen.difficulty', 'Difficulty')}: {Number.isNaN(result.difficulty) ? '—' : result.difficulty}
                  </div>
                  <div className="bg-gray-50 border p-2">
                    {t('npgen.answerKind', 'Result')}: {t(`npgen.answer.${result.answerKind}`, result.answerKind)}
                  </div>
                </div>
                <NPGeneratorGridEditor
                  size={options.size}
                  values={result.problem}
                  mode="readonly"
                  label={t('npgen.resultGrid', 'Generated problem')}
                  blockLabels={result.blockLabels}
                  diagonal={result.diagonal}
                />
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
            <Field label={t('npgen.comment', 'Comment')}>
              <textarea
                className="input-office w-full h-20"
                value={xmlComment}
                onChange={(event) => setXmlComment(event.target.value)}
              />
            </Field>
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
            {result && (
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
                  : t('npgen.runGenerate', 'Generate')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
