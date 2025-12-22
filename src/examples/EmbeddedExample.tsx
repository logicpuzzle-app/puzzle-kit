import React, { useMemo } from 'react';
import { createPuzzleStore } from '../store/puzzleStore';
import { PuzzleStoreProvider } from '../store/puzzleStoreContext';
import { createModalStore } from '../store/modalStore';
import { ModalStoreProvider } from '../store/modalStoreContext';
import { PuzzleCanvas } from '../components/canvas/PuzzleCanvas';
import { ModePanel, PropertiesPanel, SymbolPanel } from '../components/panels';

export const EmbeddedExample: React.FC = () => {
  const { useStore } = useMemo(() => createPuzzleStore(), []);
  const modalStore = useMemo(() => createModalStore(), []);

  return (
    <PuzzleStoreProvider store={useStore}>
      <ModalStoreProvider store={modalStore}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', height: '100vh' }}>
          <div style={{ minHeight: 0 }}>
            <PuzzleCanvas />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }}>
            <ModePanel />
            <SymbolPanel />
            <PropertiesPanel />
          </div>
        </div>
      </ModalStoreProvider>
    </PuzzleStoreProvider>
  );
};
