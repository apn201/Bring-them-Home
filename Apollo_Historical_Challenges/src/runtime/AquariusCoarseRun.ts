import type { AgcKey } from '../agc/KeyCodec';
import { ScenarioRuntime, type ScenarioDefinition, type ScenarioPhase, type ScenarioSnapshot } from './ScenarioRuntime';

const sequence: readonly AgcKey[] = [
  'VERB', '4', '1', 'NOUN', '2', '0', 'ENTR',
  'PLUS', '3', '0', '2', '4', '3', 'ENTR',
  'PLUS', '3', '4', '7', '7', '8', 'ENTR',
  'PLUS', '0', '0', '8', '1', '3', 'ENTR',
];

const groupProgress = (nextIndex: number): number => {
  if (nextIndex >= sequence.length) return 4;
  if (nextIndex >= 23) return 3;
  if (nextIndex >= 15) return 2;
  if (nextIndex >= 7) return 1;
  return 0;
};

const groupMessage = (nextIndex: number): string => {
  if (nextIndex >= sequence.length) return 'Coarse-angle command set entered · 4/4 complete';
  if (nextIndex >= 23) return 'First two values entered · enter +00813 · 3/4 complete';
  if (nextIndex >= 15) return 'First value entered · enter +34778 · 2/4 complete';
  if (nextIndex >= 7) return 'V41 N20 accepted · enter +30243 · 1/4 complete';
  return `Enter ${sequence[nextIndex]} · ${groupProgress(nextIndex)}/4 complete`;
};

function buildDefinition(): ScenarioDefinition {
  const phases: Record<string, ScenarioPhase> = {};
  sequence.forEach((expected, index) => {
    const nextIndex = index + 1;
    phases[`step-${index}`] = {
      id: `step-${index}`,
      completedSteps: groupProgress(index),
      message: groupMessage(index),
      transitions: [{ accepts: (key) => key === expected, next: nextIndex === sequence.length ? 'complete' : `step-${nextIndex}`, outcome: nextIndex === sequence.length ? 'complete' : 'advanced', message: groupMessage(nextIndex) }],
      unexpected: { outcome: 'correctable-error', next: 'clear-entry', message: `Entry differs from the reviewed command. Press CLR, then restart V41 N20 · ${groupProgress(index)}/4 complete` },
    };
  });
  phases['clear-entry'] = {
    id: 'clear-entry', completedSteps: 0, message: 'Correct the DSKY entry with CLR',
    transitions: [{ accepts: (key) => key === 'CLR', next: 'step-0', message: groupMessage(0) }],
    unexpected: { outcome: 'correctable-error', message: 'Press CLR to clear the incorrect entry, then restart the reviewed command.' },
  };
  phases.complete = { id: 'complete', completedSteps: 4, message: groupMessage(sequence.length), transitions: [], unexpected: { outcome: 'complete', message: groupMessage(sequence.length) } };
  phases.diverged = { id: 'diverged', completedSteps: 0, message: 'Rehearsal reset required · use Exact restart', transitions: [], unexpected: { outcome: 'diverged', message: 'Rehearsal reset required · use Exact restart' } };
  return { initial: 'step-0', phases };
}

export class AquariusCoarseRun {
  private readonly runtime = new ScenarioRuntime(buildDefinition());
  private running = false;

  start(): void { this.runtime.reset(); this.running = true; }
  reset(): void { this.runtime.reset(); this.running = false; }
  isRunning(): boolean { return this.running; }
  accept(key: AgcKey, cycle = 0): ScenarioSnapshot {
    if (key === 'RSET') return this.runtime.diverge(key, cycle, 'Rehearsal reset required · use Exact restart');
    return this.runtime.accept(key, cycle);
  }
  snapshot(): ScenarioSnapshot { return this.runtime.snapshot(); }
}
