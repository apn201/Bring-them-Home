import { describe, expect, it } from 'vitest';
import { isAgcKey, keyCodes } from '../../src/agc/KeyCodec';

describe('DSKY key codec', () => {
  it('uses the documented five-bit main DSKY values', () => {
    expect(keyCodes.VERB).toBe(0o21);
    expect(keyCodes.NOUN).toBe(0o37);
    expect(keyCodes.ENTR).toBe(0o34);
    expect(keyCodes['0']).toBe(0o20);
  });

  it('accepts no unknown keys at the application boundary', () => {
    expect(isAgcKey('VERB')).toBe(true);
    expect(isAgcKey('HELLO')).toBe(false);
  });
});
