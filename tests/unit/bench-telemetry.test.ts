import { describe, expect, it } from 'vitest';
import { AGC_CYCLES_PER_SECOND, formatAgcElapsed, sampleBenchTelemetry } from '../../src/runtime/BenchTelemetry';

describe('bench telemetry', () => {
  it('formats a local worker-cycle clock without claiming a historical GET', () => {
    expect(formatAgcElapsed(0)).toBe('00:00:00');
    expect(formatAgcElapsed(AGC_CYCLES_PER_SECOND * 3_661)).toBe('01:01:01');
  });

  it('keeps the deterministic training vector inside readable instrument ranges', () => {
    const sample = sampleBenchTelemetry(AGC_CYCLES_PER_SECOND * 20);
    expect(sample.altitudeKm).toBeGreaterThan(13);
    expect(sample.propellantPercent).toBeLessThanOrEqual(82.4);
    expect(sample.throttlePercent).toBe(0);
    expect(Math.abs(sample.rollDeg)).toBeLessThanOrEqual(8.5);
  });
});
