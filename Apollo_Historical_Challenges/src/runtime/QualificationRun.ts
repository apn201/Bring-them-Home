import type { AgcKey } from '../agc/KeyCodec';
import { ScenarioRuntime, type ScenarioDefinition, type ScenarioSnapshot } from './ScenarioRuntime';

export interface QualificationSnapshot extends ScenarioSnapshot {}

const named = (target: AgcKey) => (key: AgcKey): boolean => key === target;

export const qualificationDefinition: ScenarioDefinition = {
  initial: 'awaiting-verb',
  phases: {
    'awaiting-verb': {
      id: 'awaiting-verb', completedSteps: 0, message: 'Start the real DSKY light test · press VERB · 0/3 complete',
      transitions: [{ accepts: named('VERB'), next: 'awaiting-3', message: 'Verb entry open · type 3 · 1/3 complete' }],
      unexpected: { outcome: 'correctable-error', message: 'The exercise begins with VERB, not a free numeric key.' },
    },
    'awaiting-3': {
      id: 'awaiting-3', completedSteps: 1, message: 'Verb entry open · type 3 · 1/3 complete',
      transitions: [{ accepts: named('3'), next: 'awaiting-5', message: 'Verb entry open · type 5 · 1/3 complete' }],
      unexpected: { outcome: 'correctable-error', next: 'clear-entry', message: 'That is not V35. Press CLR, then reopen VERB.' },
    },
    'awaiting-5': {
      id: 'awaiting-5', completedSteps: 1, message: 'Verb entry open · type 5 · 1/3 complete',
      transitions: [{ accepts: named('5'), next: 'awaiting-entr', message: 'V35 selected · press ENTR · 2/3 complete' }],
      unexpected: { outcome: 'correctable-error', next: 'clear-entry', message: 'Correctable entry error. Press CLR, then reopen VERB.' },
    },
    'awaiting-entr': {
      id: 'awaiting-entr', completedSteps: 2, message: 'V35 selected · press ENTR · 2/3 complete',
      transitions: [{ accepts: named('ENTR'), next: 'complete', outcome: 'complete', message: 'V35 sent · watch the DSKY illuminate · 3/3 complete' }],
      unexpected: { outcome: 'correctable-error', message: 'V35 is ready. Press ENTR and verify the visible light test.' },
    },
    'clear-entry': {
      id: 'clear-entry', completedSteps: 0, message: 'Entry needs correction · press CLR',
      transitions: [{ accepts: named('CLR'), next: 'awaiting-verb', message: 'Entry cleared · press VERB to begin again · 0/3 complete' }],
      unexpected: { outcome: 'correctable-error', message: 'Correct the entry with CLR before continuing.' },
    },
    complete: {
      id: 'complete', completedSteps: 3, message: 'Qualification complete · 3/3 complete',
      transitions: [],
      unexpected: { outcome: 'complete', message: 'Qualification complete · continue exploring the live DSKY.' },
    },
    diverged: {
      id: 'diverged', completedSteps: 0, message: 'Training divergence · use Exact restart to begin a fresh instance',
      transitions: [],
      unexpected: { outcome: 'diverged', message: 'Training divergence · use Exact restart to begin a fresh instance' },
    },
  },
};

export class QualificationRun {
  private readonly runtime = new ScenarioRuntime(qualificationDefinition);

  reset(): void { this.runtime.reset(); }
  accept(key: AgcKey, cycle = 0): QualificationSnapshot {
    if (key === 'RSET') return this.runtime.diverge(key, cycle, 'Training divergence · use Exact restart to begin a fresh instance');
    return this.runtime.accept(key, cycle);
  }
  snapshot(): QualificationSnapshot { return this.runtime.snapshot(); }
}
