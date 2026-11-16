import { describe, expect, it } from 'vitest';
import { AquariusCoarseRun } from '../../src/runtime/AquariusCoarseRun';
import type { AgcKey } from '../../src/agc/KeyCodec';

const reviewedSequence: readonly AgcKey[] = [
  'VERB', '4', '1', 'NOUN', '2', '0', 'ENTR',
  'PLUS', '3', '0', '2', '4', '3', 'ENTR',
  'PLUS', '3', '4', '7', '7', '8', 'ENTR',
  'PLUS', '0', '0', '8', '1', '3', 'ENTR',
];

describe('Aquarius coarse-alignment rehearsal', () => {
  it('requires the reviewed V41 N20 command and three source values', () => {
    const run = new AquariusCoarseRun();
    run.start();
    reviewedSequence.forEach((key, index) => run.accept(key, index * 100));
    expect(run.snapshot()).toMatchObject({ complete: true, completedSteps: 4, assistance: 0 });
  });

  it('requires CLR recovery after an incorrect entry', () => {
    const run = new AquariusCoarseRun();
    run.start();
    run.accept('VERB');
    run.accept('4');
    expect(run.accept('2')).toMatchObject({ phase: 'clear-entry', assistance: 1 });
    expect(run.accept('CLR')).toMatchObject({ phase: 'step-0', completedSteps: 0 });
  });
});
