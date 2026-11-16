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

  it('uses the hardware relay code for digit four rather than showing an unknown glyph', () => {
    const decoder = new DskyDecoder();
    decoder.apply(0o10, (10 << 11) | (15 << 5) | 3);
    expect(decoder.snapshot().verb).toBe('41');
  });

  it('honours the channel-013 DSKY light-test relay, including the flashing lamps', () => {
    const decoder = new DskyDecoder();
    decoder.apply(0o13, 1 << 9);
    expect(decoder.snapshot().lamps.size).toBe(14);
    decoder.apply(0o13, 0);
    expect(decoder.snapshot().lamps.size).toBe(0);
  });

  it('maps selector-12 GIMBAL LOCK and TRACKER relay bits without an offset', () => {
    const decoder = new DskyDecoder();
    decoder.apply(0o10, (12 << 11) | (1 << 5) | (1 << 7));
    expect(decoder.snapshot().lamps).toEqual(new Set(['GIMBAL LOCK', 'TRACKER']));
  });
});
