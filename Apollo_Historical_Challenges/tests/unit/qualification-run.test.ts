import { describe, expect, it } from 'vitest';
import { QualificationRun } from '../../src/runtime/QualificationRun';

describe('QualificationRun', () => {
  it('requires the documented training sequence', () => {
    const run = new QualificationRun();
    run.accept('7');
    run.accept('VERB');
    run.accept('3');
    run.accept('5');
    expect(run.accept('ENTR')).toMatchObject({ complete: true, completedSteps: 3 });
  });

  it('requires CLR recovery after a wrong verb digit', () => {
    const run = new QualificationRun();
    run.accept('7');
    run.accept('VERB');
    run.accept('4');
    expect(run.snapshot()).toMatchObject({ phase: 'clear-entry', complete: false, completedSteps: 1, assistance: 1 });
    run.accept('CLR');
    run.accept('VERB');
    run.accept('3');
    run.accept('5');
    expect(run.accept('ENTR')).toMatchObject({ complete: true, completedSteps: 3, assistance: 1 });
  });

  it('records cycle-stamped inputs and has an explicit divergence state', () => {
    const run = new QualificationRun();
    run.accept('7', 1200);
    const snapshot = run.accept('RSET', 1400);
    expect(snapshot).toMatchObject({ phase: 'diverged', diverged: true });
    expect(snapshot.events).toEqual([
      { cycle: 1200, key: '7', phase: 'awaiting-number', outcome: 'advanced' },
      { cycle: 1400, key: 'RSET', phase: 'awaiting-verb', outcome: 'diverged' },
    ]);
  });
});
