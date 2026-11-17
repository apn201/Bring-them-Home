import { describe, expect, it } from 'vitest';
import { formatSignedGet, getToRecordingSeconds, recordingToGetSeconds } from '../../src/runtime/PaoAudioTimeline';

describe('405-AAA track 1 PAO commentary timeline', () => {
  it('puts launch at the verified recording offset', () => {
    expect(recordingToGetSeconds(1 * 3_600 + 31 * 60 + 7)).toBe(0);
    expect(formatSignedGet(recordingToGetSeconds(0))).toBe('T−01:31:07');
  });

  it('preserves the second anchor as commentary at GET 04:45:14', () => {
    const recordingEnd = 6 * 3_600 + 16 * 60 + 21;
    expect(recordingToGetSeconds(recordingEnd)).toBe(4 * 3_600 + 45 * 60 + 14);
    expect(getToRecordingSeconds(4 * 3_600 + 45 * 60 + 14)).toBe(recordingEnd);
  });
});
