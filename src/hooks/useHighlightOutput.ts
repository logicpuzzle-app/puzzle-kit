import { useMemo } from 'react';
import { usePuzzleStore } from '../store/puzzleStoreContext';
import { constraintCatalog } from '../constraints/ConstraintCatalog';
import { getHighlightProvider, mergeHighlightOutputs, type HighlightContext, type HighlightOutput } from '../constraints/highlights';
import type { InputMode } from '../constraints/types';

export const useHighlightOutput = (): HighlightOutput | null => {
  const {
    grid,
    puzzle,
    currentSchemaId,
    showConstraintLayer,
    activeLayer,
    currentInputMode,
    showAnswerLayer,
    isHighlightRuleEnabled,
    useTopology,
    topology,
  } = usePuzzleStore();

  return useMemo(() => {
    if (!showConstraintLayer || !currentSchemaId) return null;
    if (activeLayer !== 'answer' || !showAnswerLayer) return null;
    const schema = constraintCatalog.getSchema(currentSchemaId);
    if (!schema || !schema.highlight || schema.highlight.length === 0) return null;

    const ctx: HighlightContext = {
      puzzle,
      grid,
      schema,
      topology: useTopology ? topology : null,
      currentInputMode: currentInputMode as InputMode,
      activeLayer: 'answer',
    };

    const outputs: HighlightOutput[] = [];
    schema.highlight.forEach((rule) => {
      if (rule.scope !== 'play') return;
      if (!isHighlightRuleEnabled(rule.id, rule.defaultOn)) return;
      const provider = getHighlightProvider(rule.id);
      if (!provider) return;
      const output = provider(ctx, rule);
      if (output) outputs.push(output);
    });

    if (outputs.length === 0) return null;
    return mergeHighlightOutputs(outputs);
  }, [
    activeLayer,
    currentSchemaId,
    currentInputMode,
    grid,
    isHighlightRuleEnabled,
    puzzle,
    showAnswerLayer,
    showConstraintLayer,
    topology,
    useTopology,
  ]);
};
