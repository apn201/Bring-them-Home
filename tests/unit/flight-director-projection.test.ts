import { describe, expect, it } from 'vitest';
import { projectGuidanceOutcome, svgPath } from '../../src/runtime/FlightDirectorProjection';

describe('flight director consequence display', () => {
  it('overlays the documented path for the reviewed values', () => {
    const projection = projectGuidanceOutcome([30243, 34778, 813]);
    expect(projection.state).toBe('documented');
    expect(projection.player).toEqual(projection.historical);
  });

  it('separates the projected path after an alternate alignment', () => {
    const projection = projectGuidanceOutcome([30243, -10, 813]);
    expect(projection.state).toBe('alternate');
    expect(projection.player.at(-1)).not.toEqual(projection.historical.at(-1));
    expect(svgPath(projection.historical)).toMatch(/^M/);
  });
});
