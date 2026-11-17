/**
 * A small, deterministic instrument-bus visual driven by the live AGC
 * instruction-cycle counter. It is deliberately not a reconstructed Apollo
 * state vector: the qualification ROM begins at a local boot, not a mission.
 */
export const AGC_CYCLES_PER_SECOND = 85_333;

export interface BenchTelemetry {
  elapsed: string;
  altitudeKm: number;
  altitudeRateMps: number;
  velocityMps: number;
  propellantPercent: number;
  throttlePercent: number;
  pitchDeg: number;
  rollDeg: number;
  yawDeg: number;
}

export function formatAgcElapsed(cycle: number): string {
  const totalSeconds = Math.max(0, Math.floor(cycle / AGC_CYCLES_PER_SECOND));
  const hours = Math.floor(totalSeconds / 3_600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3_600) / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function sampleBenchTelemetry(cycle: number): BenchTelemetry {
  const seconds = Math.max(0, cycle) / AGC_CYCLES_PER_SECOND;
  const phase = seconds / 9;
  return {
    elapsed: formatAgcElapsed(cycle),
    altitudeKm: 14.2 + Math.sin(phase * 0.7) * 0.35,
    altitudeRateMps: Math.cos(phase * 0.7) * 7.4,
    velocityMps: 1_612 + Math.sin(phase * 0.35) * 18,
    propellantPercent: 82.4 - Math.min(1.9, seconds / 4_000),
    throttlePercent: 0,
    pitchDeg: Math.sin(phase * 0.42) * 5.5,
    rollDeg: Math.sin(phase * 0.31) * 8.5,
    yawDeg: Math.cos(phase * 0.26) * 4.2,
  };
}
