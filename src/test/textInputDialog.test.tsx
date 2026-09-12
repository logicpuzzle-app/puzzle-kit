import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { TextInputDialog } from '../components/dialogs/TextInputDialog';
import '../i18n';

afterEach(cleanup);

function setup(textType: 'alphabet' | 'free' = 'free') {
  const onClose = vi.fn(), onSubmit = vi.fn();
  const view = render(<TextInputDialog isOpen cellId="cell-0-0" textType={textType}
    initialValue="編集中" onClose={onClose} onSubmit={onSubmit} />);
  return { ...view, input: view.getByRole('textbox'), onClose, onSubmit };
}

describe('text dialog composition', () => {
  it.each(['alphabet', 'free'] as const)('keeps %s drafts during composition and permits explicit submit afterwards', type => {
    const { input, onClose, onSubmit } = setup(type);
    fireEvent.compositionStart(input);
    fireEvent.keyDown(input, { key: 'Escape', isComposing: true });
    expect(onClose).not.toHaveBeenCalled();
    expect(fireEvent.keyDown(input, { key: 'Enter', isComposing: true })).toBe(false);
    fireEvent.submit(input.closest('form')!);
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.compositionEnd(input);
    fireEvent.change(input, { target: { value: '確定' } });
    fireEvent.submit(input.closest('form')!);
    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({ value: '確定', textType: type });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('uses the native composition flag even without compositionstart', () => {
    const { input, onClose } = setup();
    fireEvent.keyDown(input, { key: 'Escape', isComposing: true });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores legacy IME key code 229 after compositionend', () => {
    const { input, onClose } = setup('alphabet');
    fireEvent.compositionStart(input);
    fireEvent.compositionEnd(input);
    fireEvent.keyDown(input, { key: 'Escape', keyCode: 229 });
    expect(onClose).not.toHaveBeenCalled();
    expect(fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 })).toBe(false);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
