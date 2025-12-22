import React, { useMemo, useState } from 'react';
import { createPuzzleStore } from '../store/puzzleStore';
import { PuzzleStoreProvider } from '../store/puzzleStoreContext';
import { createModalStore } from '../store/modalStore';
import { ModalStoreProvider } from '../store/modalStoreContext';
import { PuzzleCanvas } from '../components/canvas/PuzzleCanvas';
import { ModePanel, PropertiesPanel, SymbolPanel } from '../components/panels';
import { getSubmodes, type PenpaEditMode, type PenpaLayerMode } from '../types/penpaModes';

export const EmbeddedExample: React.FC = () => {
  const { useStore } = useMemo(() => createPuzzleStore(), []);
  const modalStore = useMemo(() => createModalStore(), []);
  const [editMode, setEditMode] = useState<PenpaEditMode>('surface');
  const [layerMode, setLayerMode] = useState<PenpaLayerMode>('question');
  const [submode, setSubmode] = useState<string>(getSubmodes('surface')[0] ?? '');

  return (
    <PuzzleStoreProvider store={useStore}>
      <ModalStoreProvider store={modalStore}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', height: '100vh' }}>
          <div style={{ minHeight: 0 }}>
            <PuzzleCanvas />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }}>
            <ModePanel
              editMode={editMode}
              layerMode={layerMode}
              submode={submode}
              onEditModeChange={setEditMode}
              onLayerModeChange={setLayerMode}
              onSubmodeChange={setSubmode}
            />
            <SymbolPanel />
            <PropertiesPanel />
          </div>
        </div>
      </ModalStoreProvider>
    </PuzzleStoreProvider>
  );
};
