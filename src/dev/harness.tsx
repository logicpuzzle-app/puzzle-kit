import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from '../App';
import '../index.css';
import { createPuzzleStore } from '../store/puzzleStore';
import { PuzzleStoreProvider } from '../store/puzzleStoreContext';
import { createModalStore } from '../store/modalStore';
import { ModalStoreProvider } from '../store/modalStoreContext';
import { saveGridConfig, saveToolSettings } from '../utils/storage';

const scenarios = {
  'free-segment': { label: '#40 Free Segment', tool: 'line-normal', category: 'line', directions: ['straight'] },
  'orthogonal': { label: '#20 Orthogonal erase', tool: 'line-normal', category: 'line', directions: ['orthogonal'] },
  'number': { label: '#19 Number / Backspace / arrows', tool: 'number-normal', category: 'number', directions: ['orthogonal'] },
  'thermo': { label: '#40 Thermometer', tool: 'special-thermo', category: 'special', directions: ['orthogonal'] },
} as const;
type Scenario = keyof typeof scenarios;

function newSession(scenario: Scenario) {
  Object.keys(localStorage).filter(key => key.startsWith('puzzlekit')).forEach(key => localStorage.removeItem(key));
  const session = createPuzzleStore();
  const state = session.useStore.getState();
  state.newPuzzle({ rows: 6, cols: 6 });
  state.setActiveLayer('problem');
  const settings = scenarios[scenario];
  state.setTool(settings.tool, settings.category);
  state.setToolSettings({ lineDirections: [...settings.directions], lineGridPoints: ['cell'] });
  saveToolSettings(session.useStore.getState().toolSettings);
  saveGridConfig(session.useStore.getState().grid);
  return { ...session, modal: createModalStore() };
}

export function Harness() {
  const query = new URLSearchParams(location.search).get('scenario');
  const initial: Scenario = query && Object.hasOwn(scenarios, query) ? query as Scenario : 'free-segment';
  const [scenario, setScenario] = useState<Scenario>(initial);
  const [session, setSession] = useState(() => newSession(initial));
  const [revision, setRevision] = useState(0);
  const [snapshot, setSnapshot] = useState('');
  function reset(next: Scenario) {
    // This origin is dedicated to QA; remove only Puzzle Kit preferences.
    Object.keys(localStorage).filter(key => key.startsWith('puzzlekit')).forEach(key => localStorage.removeItem(key));
    setScenario(next);
    setSession(newSession(next));
    setRevision(value => value + 1);
    setSnapshot('');
    history.replaceState(null, '', `?scenario=${next}`);
  }
  return <>
    <aside style={{ padding: 12, background: '#e2e8f0', color: '#172033' }}>
      <strong>Development harness</strong>{' '}
      <label>Scenario <select value={scenario} onChange={event => reset(event.target.value as Scenario)}>
        {Object.entries(scenarios).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
      </select></label>{' '}
      <button onClick={() => reset(scenario)}>Reset scenario</button>{' · '}
      <button onClick={() => setSnapshot(session.useStore.getState().exportPuzzle())}>Inspect puzzle JSON</button>
      <p>Drag between cell centers, then release. Number: click a cell, use Backspace or ArrowRight. Reset starts a fresh store and history.</p>
      {snapshot && <textarea aria-label="Puzzle snapshot" readOnly value={snapshot} rows={8} style={{ width: '100%' }} />}
    </aside>
    <PuzzleStoreProvider key={revision} store={session.useStore}>
      <ModalStoreProvider store={session.modal}><App /></ModalStoreProvider>
    </PuzzleStoreProvider>
  </>;
}

createRoot(document.getElementById('root')!).render(<Harness />);
