/**
 * TestCasePanel - UI for selecting and loading pzpr test cases
 */

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePuzzleStore } from '../../../store/puzzleStore';
import { testCaseRegistry, type FailCheckCase } from '../../../constraints';
import { parsePzprv3 } from '../../../utils/pzprv3Parser';
import { FiPlay, FiCheckCircle, FiXCircle, FiAlertCircle, FiCheck } from 'react-icons/fi';

export const TestCasePanel: React.FC = () => {
  const { t } = useTranslation();
  const { currentSchemaId, checkAnswer } = usePuzzleStore();
  const [selectedCase, setSelectedCase] = useState<number | null>(null);
  const [loadResult, setLoadResult] = useState<{ success: boolean; message: string } | null>(null);

  // Get test data for current schema
  const testData = currentSchemaId ? testCaseRegistry.getTestData(currentSchemaId) : null;

  // Load a test case into the puzzle
  const loadTestCase = useCallback((testCase: FailCheckCase, index: number) => {
    setSelectedCase(index);
    setLoadResult(null);

    const result = parsePzprv3(testCase.pzprv3);

    if (!result.success) {
      setLoadResult({ success: false, message: result.error || 'Parse error' });
      return;
    }

    // Update the store with parsed puzzle
    const store = usePuzzleStore.getState();

    // Save current active layer to restore later
    const currentLayer = store.activeLayer;

    if (result.grid) {
      store.setGrid(result.grid);
    }

    if (result.puzzle) {
      // Clear existing puzzle and set new state
      store.clearAll();

      // Import problem elements
      store.setActiveLayer('problem');
      const problem = result.puzzle.problem;
      for (const [, num] of Object.entries(problem.numbers)) {
        store.addNumber(num);
      }
      for (const [, sym] of Object.entries(problem.symbols)) {
        store.addSymbol(sym);
      }
      for (const [, edge] of Object.entries(problem.edges)) {
        store.addEdge(edge);
      }
      if (problem.directionalClues) {
        for (const [, clue] of Object.entries(problem.directionalClues)) {
          store.addDirectionalClue(clue);
        }
      }
      // Import room map if present (for Heyawake, etc.)
      if (problem.roomMap) {
        console.log('[TestCasePanel] Setting roomMap with entries:', Object.keys(problem.roomMap).length);
        store.setRoomMap(problem.roomMap);
      } else {
        console.log('[TestCasePanel] No roomMap in parsed result');
      }

      // Import answer elements
      store.setActiveLayer('answer');
      const answer = result.puzzle.answer;
      for (const [, surface] of Object.entries(answer.surfaces)) {
        store.addSurface(surface);
      }
      for (const [, line] of Object.entries(answer.lines)) {
        store.addLine(line);
      }
      for (const [, edge] of Object.entries(answer.edges)) {
        store.addEdge(edge);
      }
      for (const [, sym] of Object.entries(answer.symbols)) {
        store.addSymbol(sym);
      }

      // Restore original layer (stay in constraint mode)
      store.setActiveLayer(currentLayer);
    }

    setLoadResult({
      success: true,
      message: testCase.failcode
        ? `Expected: ${testCase.failcode}`
        : 'Expected: Complete',
    });
  }, []);

  if (!testData) {
    return (
      <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded-sm">
        {t('constraint.noTestCases', 'No test cases available for this puzzle type')}
      </div>
    );
  }

  return (
    <div>
      <div className="text-xs font-medium text-office-text-secondary mb-2">
        {t('constraint.testCases', 'Test Cases')}
      </div>

      {/* Test case list */}
      <div className="border border-office-border rounded-sm bg-white max-h-40 overflow-y-auto">
        {testData.failchecks.map((testCase, index) => {
          const isComplete = testCase.failcode === null;
          const isSelected = selectedCase === index;

          return (
            <button
              key={index}
              className={`w-full text-left px-2 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                isSelected
                  ? 'bg-blue-100 text-blue-800'
                  : 'hover:bg-gray-50'
              } ${index < testData.failchecks.length - 1 ? 'border-b border-office-border' : ''}`}
              onClick={() => loadTestCase(testCase, index)}
            >
              {/* Status icon */}
              {isComplete ? (
                <FiCheckCircle className="text-green-600 flex-shrink-0" size={12} />
              ) : (
                <FiXCircle className="text-red-500 flex-shrink-0" size={12} />
              )}

              {/* Description */}
              <span className="flex-1 truncate">
                {testCase.description || (isComplete ? 'Complete' : testCase.failcode)}
              </span>

              {/* Load button */}
              <FiPlay
                className={`flex-shrink-0 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}
                size={10}
              />
            </button>
          );
        })}
      </div>

      {/* Check button */}
      <button
        onClick={() => checkAnswer()}
        className="mt-2 w-full px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-sm flex items-center justify-center gap-1.5 transition-colors"
      >
        <FiCheck size={12} />
        {t('constraint.checkAnswer', 'Check Answer')}
      </button>

      {/* Load result message */}
      {loadResult && (
        <div
          className={`mt-2 text-xs p-2 rounded-sm flex items-center gap-2 ${
            loadResult.success
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          {loadResult.success ? (
            <FiCheckCircle size={12} />
          ) : (
            <FiAlertCircle size={12} />
          )}
          <span>{loadResult.message}</span>
        </div>
      )}

      {/* Help text */}
      <div className="mt-2 text-xs text-gray-500">
        {t('constraint.testCasesHelp', 'Click to load a test case. Green = complete, Red = has errors.')}
      </div>
    </div>
  );
};
