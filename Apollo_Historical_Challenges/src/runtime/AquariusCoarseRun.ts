import type { AgcKey } from '../agc/KeyCodec';

export interface AquariusCoarseSnapshot {
  phase: 'command' | 'value' | 'clear-entry' | 'complete' | 'diverged';
  completedSteps: number;
  complete: boolean;
  diverged: boolean;
  assistance: number;
  message: string;
  values: readonly number[];
  historicalReplay: boolean | undefined;
}

const command: readonly AgcKey[] = ['VERB', '4', '1', 'NOUN', '2', '0', 'ENTR'];
const documentedValues = [30_243, 34_778, 813] as const;
const valueNames = ['+30243', '+34778', '+00813'] as const;

export class AquariusCoarseRun {
  private running = false;
  private phase: AquariusCoarseSnapshot['phase'] = 'command';
  private commandIndex = 0;
  private valueIndex = 0;
  private sign = 1;
  private digits = '';
  private values: number[] = [];
  private assistance = 0;
  private message = 'Enter VERB · 0/4 complete';

  start(): void { this.reset(); this.running = true; }
  reset(): void {
    this.running = false; this.phase = 'command'; this.commandIndex = 0; this.valueIndex = 0;
    this.sign = 1; this.digits = ''; this.values = []; this.assistance = 0; this.message = 'Enter VERB · 0/4 complete';
  }
  isRunning(): boolean { return this.running; }

  accept(key: AgcKey, _cycle = 0): AquariusCoarseSnapshot {
    if (key === 'RSET') { this.phase = 'diverged'; this.message = 'Rehearsal reset required · use Exact restart'; return this.snapshot(); }
    if (this.phase === 'complete' || this.phase === 'diverged') return this.snapshot();
    if (this.phase === 'clear-entry') return this.acceptClear(key);
    if (this.phase === 'command') return this.acceptCommand(key);
    return this.acceptValue(key);
  }

  snapshot(): AquariusCoarseSnapshot {
    const complete = this.phase === 'complete';
    return {
      phase: this.phase, completedSteps: complete ? 4 : this.valueIndex + (this.phase === 'command' ? 0 : 1),
      complete, diverged: this.phase === 'diverged', assistance: this.assistance, message: this.message,
      values: [...this.values], historicalReplay: complete ? this.values.every((value, index) => value === documentedValues[index]) : undefined,
    };
  }

  private acceptCommand(key: AgcKey): AquariusCoarseSnapshot {
    const expected = command[this.commandIndex];
    if (key !== expected) return this.requireClear(`Expected ${expected}. Press CLR to correct the DSKY entry, then restart V41 N20.`);
    this.commandIndex += 1;
    if (this.commandIndex < command.length) { this.message = `Enter ${command[this.commandIndex]} · 0/4 complete`; return this.snapshot(); }
    this.phase = 'value'; this.message = `V41 N20 accepted · enter ${valueNames[0]} · 1/4 complete`;
    return this.snapshot();
  }

  private acceptValue(key: AgcKey): AquariusCoarseSnapshot {
    if (!this.digits) {
      if (key === 'PLUS') { this.sign = 1; this.digits = '+'; this.message = `Enter ${valueNames[this.valueIndex].slice(1)} · ${this.valueIndex + 1}/4 complete`; return this.snapshot(); }
      if (key === 'MINUS') { this.sign = -1; this.digits = '-'; this.message = 'Alternate negative value entered · type five digits'; return this.snapshot(); }
      return this.requireClear(`Begin this value with PLUS or MINUS. Press CLR to retry value ${this.valueIndex + 1}.`);
    }
    if (/^[0-9]$/.test(key) && this.digits.replace(/[^0-9]/g, '').length < 5) {
      this.digits += key;
      const digitCount = this.digits.replace(/[^0-9]/g, '').length;
      this.message = digitCount === 5 ? 'Press ENTR to commit this value.' : `Enter digit ${digitCount + 1} of 5.`;
      return this.snapshot();
    }
    if (key === 'ENTR' && this.digits.replace(/[^0-9]/g, '').length === 5) {
      this.values.push(this.sign * Number(this.digits.replace(/[^0-9]/g, ''))); this.valueIndex += 1; this.digits = ''; this.sign = 1;
      if (this.valueIndex === 3) { this.phase = 'complete'; this.message = 'All three coarse-alignment values accepted · 4/4 complete'; return this.snapshot(); }
      this.message = `Value accepted · enter ${valueNames[this.valueIndex]} · ${this.valueIndex + 1}/4 complete`;
      return this.snapshot();
    }
    return this.requireClear('Invalid numeric entry. Press CLR to re-enter the current value.');
  }

  private acceptClear(key: AgcKey): AquariusCoarseSnapshot {
    if (key !== 'CLR') { this.assistance += 1; this.message = 'Press CLR to clear the current entry.'; return this.snapshot(); }
    this.phase = this.commandIndex < command.length ? 'command' : 'value'; this.digits = ''; this.sign = 1;
    this.message = this.phase === 'command' ? 'Entry cleared · restart V41 N20 with VERB.' : `Entry cleared · begin value ${this.valueIndex + 1} with PLUS or MINUS.`;
    if (this.phase === 'command') this.commandIndex = 0;
    return this.snapshot();
  }

  private requireClear(message: string): AquariusCoarseSnapshot { this.phase = 'clear-entry'; this.assistance += 1; this.message = message; return this.snapshot(); }
}
