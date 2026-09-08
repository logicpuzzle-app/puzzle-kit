import { describe, expect, it } from 'vitest';
import { render, act } from '@testing-library/react';
import { createPuzzleStore } from '../store/puzzleStore';
import { PuzzleStoreProvider } from '../store/puzzleStoreContext';
import { NumberLayer } from '../components/canvas/NumberLayer';
import { createTextColorResolver } from '../utils/textContrast';

describe('cell text contrast', () => {
  it('uses the visible top surface, ignores dots, and preserves chromatic colors and data', () => {
    const store = createPuzzleStore().useStore;
    store.getState().addSurface({cellId:'cell-0-0',color:'#000000',layer:'problem'});
    store.getState().addSurface({cellId:'cell-0-0',color:'#ffffff',layer:'answer'});
    store.getState().addSurface({cellId:'cell-0-1',color:'#000000',layer:'problem',displayMode:'dot'});
    const puzzle=store.getState().puzzle;
    expect(createTextColorResolver(puzzle,true,true)('cell-0-0','#fff')).toBe('#000000');
    const resolve=createTextColorResolver(puzzle,true,false);
    expect(resolve('cell-0-0','#000')).toBe('#ffffff');
    expect(resolve('cell-0-1','black')).toBe('#000000');
    expect(resolve('cell-0-0','#ff0000')).toBe('#ff0000');
    expect(Object.values(puzzle.problem.surfaces)[0].color).toBe('#000000');
  });
  it('composites alpha rather than treating every black surface as opaque', () => {
    const store=createPuzzleStore().useStore;
    store.getState().addSurface({cellId:'cell-0-0',color:'rgba(0, 0, 0, 0.1)',layer:'problem'});
    expect(createTextColorResolver(store.getState().puzzle,true,true)('cell-0-0','#000000')).toBe('#000000');
  });
  it('updates the rendered number when shading or layer visibility changes', () => {
    const store=createPuzzleStore().useStore;
    store.getState().addNumber({cellId:'cell-0-0',value:'5',size:'large',position:'center',color:'#000000',layer:'problem'});
    const {container}=render(<PuzzleStoreProvider store={store}><svg><NumberLayer layer="problem" /></svg></PuzzleStoreProvider>);
    expect(container.querySelector('text')?.getAttribute('fill')).toBe('#000000');
    act(()=>{store.getState().addSurface({cellId:'cell-0-0',color:'#000000',layer:'answer'});});
    expect(container.querySelector('text')?.getAttribute('fill')).toBe('#ffffff');
    act(()=>store.setState({showAnswerLayer:false}));
    expect(container.querySelector('text')?.getAttribute('fill')).toBe('#000000');
  });
});

it('respects grid backgrounds, trial opacity, and uniform multicolor overlays', () => {
  const store=createPuzzleStore().useStore;
  const empty=store.getState().puzzle;
  expect(createTextColorResolver(empty,true,true,{backgroundColor:'#000000'})('cell-0-0','#000')).toBe('#ffffff');
  store.getState().addSurface({cellId:'cell-0-0',color:'#000000',layer:'answer'});
  expect(createTextColorResolver(store.getState().puzzle,true,true,{trialStage:1})('cell-0-0','#000')).toBe('#000000');
  const puzzle={...store.getState().puzzle,multicolorSurfaces:{m:{id:'m',cellId:'cell-0-0',colors:[9],customColors:['#ffffff'],pattern:'cross' as const,layer:'answer' as const}}};
  expect(createTextColorResolver(puzzle,true,true)('cell-0-0','#000')).toBe('#000000');
});
