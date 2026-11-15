export type DskyKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'VERB' | 'NOUN' | 'PLUS' | 'MINUS' | 'ENTR' | 'CLR' | 'PRO' | 'KEY_REL' | 'RSET';

export interface DskyState {
  program: string;
  verb: string;
  noun: string;
  registers: [string, string, string];
  signs: [string, string, string];
  lamps: ReadonlySet<string>;
}

const digitMap: Readonly<Record<number, string>> = { 0: ' ', 3: '1', 13: '4', 19: '7', 21: '0', 25: '2', 27: '3', 28: '6', 29: '8', 30: '5', 31: '9' };
const lampNames = ['UPLINK ACTY', 'TEMP', 'NO ATT', 'GIMBAL LOCK', 'STBY', 'PROG', 'KEY REL', 'RESTART', 'OPR ERR', 'TRACKER', 'PRIO DISP', 'ALT', 'NO DAP', 'VEL'] as const;

export class DskyDecoder {
  private state: DskyState = { program: '  ', verb: '  ', noun: '  ', registers: ['     ', '     ', '     '], signs: [' ', ' ', ' '], lamps: new Set() };
  private signBits = [{ minus: false, plus: false }, { minus: false, plus: false }, { minus: false, plus: false }];

  apply(channel: number, value: number): DskyState {
    if (channel === 0o10) this.applyRelay(value);
    if (channel === 0o11 || channel === 0o163) this.applyLamps(channel, value);
    return this.snapshot();
  }

  snapshot(): DskyState { return { ...this.state, registers: [...this.state.registers] as DskyState['registers'], signs: [...this.state.signs] as DskyState['signs'], lamps: new Set(this.state.lamps) }; }

  private applyRelay(value: number): void {
    const selector = value >> 11;
    const first = digitMap[(value >> 5) & 0b11111] ?? '?';
    const second = digitMap[value & 0b11111] ?? '?';
    const set = (field: 'program' | 'verb' | 'noun', pair: string): void => { this.state = { ...this.state, [field]: pair }; };
    const setRegister = (row: number, changes: Array<[number, string]>): void => { const register = this.state.registers[row].split(''); changes.forEach(([index, digit]) => { register[index] = digit; }); const registers = [...this.state.registers] as DskyState['registers']; registers[row] = register.join(''); this.state = { ...this.state, registers }; };
    const sign = (row: number): void => { const bits = this.signBits[row]; const signs = [...this.state.signs] as DskyState['signs']; signs[row] = bits.plus && !bits.minus ? '+' : bits.minus ? '−' : ' '; this.state = { ...this.state, signs }; };
    switch (selector) {
      case 1: setRegister(2, [[3, first], [4, second]]); this.signBits[2].minus = Boolean(value & (1 << 10)); sign(2); break;
      case 2: setRegister(2, [[1, first], [2, second]]); this.signBits[2].plus = Boolean(value & (1 << 10)); sign(2); break;
      case 3: setRegister(1, [[4, first]]); setRegister(2, [[0, second]]); break;
      case 4: setRegister(1, [[2, first], [3, second]]); this.signBits[1].minus = Boolean(value & (1 << 10)); sign(1); break;
      case 5: setRegister(1, [[0, first], [1, second]]); this.signBits[1].plus = Boolean(value & (1 << 10)); sign(1); break;
      case 6: setRegister(0, [[3, first], [4, second]]); this.signBits[0].minus = Boolean(value & (1 << 10)); sign(0); break;
      case 7: setRegister(0, [[1, first], [2, second]]); this.signBits[0].plus = Boolean(value & (1 << 10)); sign(0); break;
      case 8: setRegister(0, [[0, second]]); break;
      case 9: set('noun', `${first}${second}`); break;
      case 10: set('verb', `${first}${second}`); break;
      case 11: set('program', `${first}${second}`); break;
      case 12: this.applyDisplayLamps(value); break;
      default: break;
    }
  }

  private applyLamps(channel: number, value: number): void {
    const lamps = new Set(this.state.lamps);
    const set = (name: string, on: boolean): void => { if (on) lamps.add(name); else lamps.delete(name); };
    if (channel === 0o11) { set('UPLINK ACTY', Boolean(value & (1 << 2))); set('TEMP', Boolean(value & (1 << 3))); }
    else { set('KEY REL', Boolean(value & (1 << 4))); set('OPR ERR', Boolean(value & (1 << 6))); set('RESTART', Boolean(value & (1 << 7))); set('STBY', Boolean(value & (1 << 8))); }
    this.state = { ...this.state, lamps };
  }

  private applyDisplayLamps(value: number): void {
    const lamps = new Set(this.state.lamps);
    const bits = [5, 6, 7, 8, 9, 10, 12, 13, 14];
    const names = ['PRIO DISP', 'NO DAP', 'VEL', 'NO ATT', 'ALT', 'GIMBAL LOCK', 'TRACKER', 'PROG', ''] as const;
    bits.forEach((bit, index) => { const name = names[index]; if (!name) return; if (value & (1 << bit)) lamps.add(name); else lamps.delete(name); });
    this.state = { ...this.state, lamps };
  }
}

export const dskyLamps = lampNames;
