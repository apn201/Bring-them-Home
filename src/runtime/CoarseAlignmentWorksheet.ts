/**
 * ACT 30's docked-coarse-alignment worksheet, limited to its documented
 * operating configuration. This is a calculation aid, not an IMU/CDU model.
 */
export interface CmCoarseAngles {
  outerDeg: number;
  innerDeg: number;
  middleDeg: number;
  rollCalibrationDeg: number;
}

export interface LmCoarseAngles {
  outerHundredths: number;
  innerHundredths: number;
  middleHundredths: number;
}

export function wrap360Hundredths(value: number): number {
  const fullTurn = 36_000;
  return ((Math.round(value) % fullTurn) + fullTurn) % fullTurn;
}

export function calculateAct30CoarseAlignment(input: CmCoarseAngles): LmCoarseAngles {
  const outer = 300 - input.outerDeg + input.rollCalibrationDeg;
  const inner = 180 + input.innerDeg;
  const middle = 360 - input.middleDeg;
  return {
    outerHundredths: wrap360Hundredths(outer * 100),
    innerHundredths: wrap360Hundredths(inner * 100),
    middleHundredths: wrap360Hundredths(middle * 100),
  };
}

export function formatHundredths(angle: number): string {
  return `${Math.floor(angle / 100).toString().padStart(3, '0')}.${(angle % 100).toString().padStart(2, '0')}`;
}
