import { describe, it, expect } from 'vitest';
import {
  canActivateLayer,
  canEditActiveLayer,
  canEditDataLayer,
  getEditableDataLayer,
} from '../utils/editPolicy';

describe('editPolicy', () => {
  it('allows only answer activation in player mode', () => {
    expect(canActivateLayer('answer', true)).toBe(true);
    expect(canActivateLayer('problem', true)).toBe(false);
    expect(canActivateLayer('grid', true)).toBe(false);
    expect(canActivateLayer('constraint', true)).toBe(false);
  });

  it('allows activation for all layers outside player mode', () => {
    expect(canActivateLayer('answer', false)).toBe(true);
    expect(canActivateLayer('problem', false)).toBe(true);
    expect(canActivateLayer('grid', false)).toBe(true);
    expect(canActivateLayer('constraint', false)).toBe(true);
  });

  it('blocks edits on grid/constraint and player problem layer', () => {
    expect(canEditActiveLayer('grid', false)).toBe(false);
    expect(canEditActiveLayer('constraint', false)).toBe(false);
    expect(canEditActiveLayer('problem', true)).toBe(false);
    expect(canEditActiveLayer('answer', true)).toBe(true);
  });

  it('blocks problem data edits in player mode', () => {
    expect(canEditDataLayer('problem', true)).toBe(false);
    expect(canEditDataLayer('answer', true)).toBe(true);
    expect(canEditDataLayer('problem', false)).toBe(true);
  });

  it('resolves editable data layer based on active layer and mode', () => {
    expect(getEditableDataLayer('problem', false)).toBe('problem');
    expect(getEditableDataLayer('answer', false)).toBe('answer');
    expect(getEditableDataLayer('grid', false)).toBe(null);
    expect(getEditableDataLayer('constraint', false)).toBe(null);
    expect(getEditableDataLayer('answer', true)).toBe('answer');
    expect(getEditableDataLayer('problem', true)).toBe(null);
  });
});
