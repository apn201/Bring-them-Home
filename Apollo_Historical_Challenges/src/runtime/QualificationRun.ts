import type { AgcKey } from '../agc/KeyCodec';

type Phase = 'awaiting-number' | 'awaiting-verb' | 'awaiting-3' | 'awaiting-5' | 'awaiting-entr' | 'complete';

export interface QualificationSnapshot {
  completedSteps: number;
  complete: boolean;
  message: string;
}

export class QualificationRun {
  private phase: Phase = 'awaiting-number';

  reset(): void { this.phase = 'awaiting-number'; }

  accept(key: AgcKey): QualificationSnapshot {
    if (this.phase === 'awaiting-number' && /^[0-9]$/.test(key)) this.phase = 'awaiting-verb';
    else if (this.phase === 'awaiting-verb' && key === 'VERB') this.phase = 'awaiting-3';
    else if (this.phase === 'awaiting-3' && key === '3') this.phase = 'awaiting-5';
    else if (this.phase === 'awaiting-5' && key === '5') this.phase = 'awaiting-entr';
    else if (this.phase === 'awaiting-entr' && key === 'ENTR') this.phase = 'complete';
    return this.snapshot();
  }

  snapshot(): QualificationSnapshot {
    switch (this.phase) {
      case 'awaiting-number': return { completedSteps: 0, complete: false, message: 'Awaiting a numeric key · 0/3 complete' };
      case 'awaiting-verb': return { completedSteps: 1, complete: false, message: 'Key path confirmed · press VERB · 1/3 complete' };
      case 'awaiting-3': return { completedSteps: 2, complete: false, message: 'Verb entry open · type 3 · 2/3 complete' };
      case 'awaiting-5': return { completedSteps: 2, complete: false, message: 'Verb entry open · type 5 · 2/3 complete' };
      case 'awaiting-entr': return { completedSteps: 2, complete: false, message: 'Verb 35 entered · press ENTR · 2/3 complete' };
      case 'complete': return { completedSteps: 3, complete: true, message: 'Qualification complete · 3/3 complete' };
    }
  }
}
