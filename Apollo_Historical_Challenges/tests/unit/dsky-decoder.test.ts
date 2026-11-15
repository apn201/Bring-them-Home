import { describe, expect, it } from 'vitest';
import { DskyDecoder } from '../../src/agc/DskyDecoder';

describe('DskyDecoder', () => {
  it('decodes a VERB relay pair and retains it across blank relay writes', () => {
    const decoder = new DskyDecoder();
    decoder.apply(0o10, (10 << 11) | (27 << 5) | 30);
    decoder.apply(0o10, 0);
    expect(decoder.snapshot().verb).toBe('35');
  });

  it('decodes the sign and final digit of register one', () => {
    const decoder = new DskyDecoder();
    decoder.apply(0o10, (6 << 11) | (1 << 10) | (27 << 5) | 30);
    decoder.apply(0o10, (8 << 11) | 31);
    expect(decoder.snapshot().signs[0]).toBe('−');
    expect(decoder.snapshot().registers[0]).toBe('9  35');
  });
});
