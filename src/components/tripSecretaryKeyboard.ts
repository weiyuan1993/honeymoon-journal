interface SecretaryInputKeyEvent {
  key: string;
  shiftKey: boolean;
  isComposing: boolean;
  keyCode: number;
}

const WEBKIT_IME_KEY_CODE = 229;

export const shouldSubmitSecretaryInput = ({
  key,
  shiftKey,
  isComposing,
  keyCode,
}: SecretaryInputKeyEvent): boolean => (
  key === 'Enter'
  && !shiftKey
  && !isComposing
  && keyCode !== WEBKIT_IME_KEY_CODE
);
