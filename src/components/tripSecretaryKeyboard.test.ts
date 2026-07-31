import { describe, expect, it } from 'vitest';
import { shouldSubmitSecretaryInput } from './tripSecretaryKeyboard';

describe('AI secretary keyboard submission', () => {
  it('does not submit when Enter confirms an active IME composition', () => {
    expect(shouldSubmitSecretaryInput({
      key: 'Enter',
      shiftKey: false,
      isComposing: true,
      keyCode: 13,
    })).toBe(false);
  });

  it('does not submit the WebKit IME Enter fallback event', () => {
    expect(shouldSubmitSecretaryInput({
      key: 'Enter',
      shiftKey: false,
      isComposing: false,
      keyCode: 229,
    })).toBe(false);
  });

  it('submits a normal Enter after composition is complete', () => {
    expect(shouldSubmitSecretaryInput({
      key: 'Enter',
      shiftKey: false,
      isComposing: false,
      keyCode: 13,
    })).toBe(true);
  });

  it('keeps Shift+Enter and non-Enter keys from submitting', () => {
    expect(shouldSubmitSecretaryInput({
      key: 'Enter',
      shiftKey: true,
      isComposing: false,
      keyCode: 13,
    })).toBe(false);
    expect(shouldSubmitSecretaryInput({
      key: 'Process',
      shiftKey: false,
      isComposing: false,
      keyCode: 229,
    })).toBe(false);
  });
});
