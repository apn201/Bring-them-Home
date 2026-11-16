import { describe, expect, it } from 'vitest';
import { AQUARIUS_V41_N20_CUE, cueDurationSeconds, formatCueSeconds } from '../../src/runtime/TranscriptCuePlayer';

describe('Aquarius reviewed audio cue', () => {
  it('keeps the confirmed V41 N20 source and cue boundary', () => {
    expect(AQUARIUS_V41_N20_CUE.sourceUrl).toContain('414-AAA_TRACK-1.mp3');
    expect(formatCueSeconds(AQUARIUS_V41_N20_CUE.startSeconds)).toBe('05:07:40');
    expect(cueDurationSeconds(AQUARIUS_V41_N20_CUE)).toBe(16);
  });
});
