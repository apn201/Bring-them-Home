export interface FlightPlotPoint { x: number; y: number; label?: string; }
export interface FlightProjection {
  historical: readonly FlightPlotPoint[];
  player: readonly FlightPlotPoint[];
  state: 'standby' | 'documented' | 'alternate';
  status: string;
  note: string;
}

// Mission-phase geometry, not a navigation-grade ephemeris. The phase order
// and timing labels come from NASA's Apollo 13 mission timeline. A complete
// propagator needs documented state vectors and burn solutions, which are not
// yet part of this browser build.
export const apollo13MissionGeometry: readonly FlightPlotPoint[] = [
  { x: 12, y: 68, label: 'EARTH · GET 00:00' },
  { x: 31, y: 51, label: 'TLI · 02:35' },
  { x: 48, y: 35, label: 'O₂ FAILURE · 56:09' },
  { x: 61, y: 25, label: 'AQUARIUS · 58:40' },
  { x: 78, y: 20, label: 'FREE RETURN · 61:30' },
  { x: 91, y: 34, label: 'LUNAR FLYBY · 77:08' },
  { x: 79, y: 54, label: 'PC+2 · 79:28' },
  { x: 45, y: 72, label: 'ENTRY · 142:40' },
  { x: 15, y: 69, label: 'PACIFIC' },
];

const documentedValues = [30_243, 34_778, 813] as const;

function circularError(actual: number, expected: number): number {
  const difference = Math.abs(actual - expected) % 36_000;
  return Math.min(difference, 36_000 - difference) / 100;
}

export function projectGuidanceOutcome(values: readonly number[] | undefined): FlightProjection {
  if (!values || values.length !== 3) return {
    historical: apollo13MissionGeometry, player: [], state: 'standby',
    status: 'WAITING FOR GUIDANCE INPUT',
    note: 'V41 N20 loads alignment data. The documented free-return and PC+2 path are shown for mission context.',
  };
  const totalError = values.reduce((sum, value, index) => sum + circularError(value, documentedValues[index]), 0);
  if (totalError < 0.005) return {
    historical: apollo13MissionGeometry, player: apollo13MissionGeometry, state: 'documented',
    status: 'DOCUMENTED FREE-RETURN PATH RETAINED',
    note: 'Your alignment values match the reviewed Apollo 13 command. V41 itself does not fire RCS or DPS.',
  };
  const severity = Math.min(1, totalError / 42);
  const player = apollo13MissionGeometry.map((point, index) => {
    if (index < 4) return point;
    const drift = severity * (index - 3) * 7;
    return { x: point.x, y: point.y + drift };
  });
  return {
    historical: apollo13MissionGeometry, player, state: 'alternate',
    status: severity > 0.55 ? 'RETURN CORRIDOR LOST · UNASSESSED' : 'GUIDANCE SOLUTION OFF-NOMINAL',
    note: 'Projection shows where an alignment error would contaminate later guidance-dependent maneuvers. It is a training consequence display, not an orbital propagator or a prediction of crew survival.',
  };
}

export function svgPath(points: readonly FlightPlotPoint[]): string {
  return points.map((point, index) => `${index ? 'L' : 'M'}${point.x} ${point.y}`).join(' ');
}
