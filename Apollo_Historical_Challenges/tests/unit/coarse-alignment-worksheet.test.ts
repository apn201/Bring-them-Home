import { describe, expect, it } from 'vitest';
import { calculateAct30CoarseAlignment, formatHundredths, wrap360Hundredths } from '../../src/runtime/CoarseAlignmentWorksheet';

describe('ACT 30 coarse-alignment worksheet', () => {
  it('reproduces the research cross-check values in documented O/I/M order', () => {
    const result = calculateAct30CoarseAlignment({ outerDeg: 355.57, innerDeg: 167.78, middleDeg: 351.87, rollCalibrationDeg: -2 });
    expect(result).toEqual({ outerHundredths: 30243, innerHundredths: 34778, middleHundredths: 813 });
    expect(Object.values(result).map(formatHundredths)).toEqual(['302.43', '347.78', '008.13']);
  });

  it('wraps documented worksheet outputs into a 0–360 degree turn', () => {
    expect(wrap360Hundredths(-1)).toBe(35999);
    expect(wrap360Hundredths(36_000)).toBe(0);
  });
});
