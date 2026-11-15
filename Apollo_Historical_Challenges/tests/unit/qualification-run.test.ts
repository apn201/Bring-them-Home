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

  it('does not qualify a different two-digit verb', () => {
    const run = new QualificationRun();
    run.accept('7');
    run.accept('VERB');
    run.accept('4');
    run.accept('5');
    expect(run.accept('ENTR')).toMatchObject({ complete: false, completedSteps: 2 });
  });
});
