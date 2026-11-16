import type { AgcKey } from '../agc/KeyCodec';

export interface CommandMeaning { kind: 'AGC' | 'GUIDANCE' | 'CAUTION'; message: string; command?: string; component?: number; value?: number; }
const axes = ['Outer', 'Inner', 'Middle'];
export function angleMeaning(raw: number): string {
  const degrees = Math.abs(raw) / 100;
  const seconds = Math.round(degrees * 3600);
  return `${raw < 0 ? '−' : '+'}${degrees.toFixed(2)}° (${Math.floor(seconds / 3600)}° ${Math.floor(seconds % 3600 / 60)}′ ${seconds % 60}″)`;
}

/** Interprets completed operator requests. Acceptance is reported separately from ROM output. */
export class CommandNarrator {
  private verb = '';
  private noun = '';
  private editing: 'verb' | 'noun' | undefined;
  private number = '';
  private component = -1;
  reset(): void { this.verb = ''; this.noun = ''; this.editing = undefined; this.number = ''; this.component = -1; }
  accept(key: AgcKey): CommandMeaning | undefined {
    if (key === 'VERB' || key === 'NOUN') { this.editing = key === 'VERB' ? 'verb' : 'noun'; this[this.editing] = ''; this.component = -1; this.number = ''; return; }
    if (key === 'CLR') { if (this.editing) this[this.editing] = ''; else this.number = ''; return; }
    if (key === 'RSET') { this.reset(); return { kind: 'AGC', message: 'Reset request sent. Watch the annunciators for the computer response.' }; }
    if (/^\d$/.test(key)) { if (this.editing) this[this.editing] = (this[this.editing] + key).slice(-2); else if (this.component >= 0) this.number += key; return; }
    if (key === 'PLUS' || key === 'MINUS') { if (this.component >= 0) this.number = key === 'PLUS' ? '+' : '-'; return; }
    if (key !== 'ENTR') return;
    if (this.editing) {
      this.editing = undefined;
      const command = `V${this.verb.padStart(2, '0')}${this.verb === '35' ? '' : ` N${this.noun.padStart(2, '0')}`}`;
      if (this.verb === '35') return { kind: 'AGC', command, message: 'Lamp test requested (V35). The computer should illuminate the display and annunciators.' };
      if (this.noun === '20' && this.verb === '41') { this.component = 0; return { kind: 'GUIDANCE', command, message: 'Coarse IMU alignment requested (V41 N20). Enter outer, inner, then middle gimbal angles in hundredths of a degree. These are platform angles, not a spacecraft heading or engine firing.' }; }
      if (['20', '22'].includes(this.noun) && ['06', '16'].includes(this.verb)) return { kind: 'AGC', command, message: `${this.verb === '16' ? 'Continuous monitoring' : 'Readout'} of ${this.noun === '22' ? 'desired platform targets' : 'actual gimbal encoders'} requested (${command}). R1 is outer, R2 inner, R3 middle gimbal angle; +30343 means +303.43°. Waiting for the computer display.` };
      return { kind: 'AGC', command, message: `${command} requested. Its effect depends on the active flight program; watch the computer response.` };
    }
    if (this.component >= 0 && this.component < 3) {
      if (!/^[+-]\d{5}$/.test(this.number)) return { kind: 'CAUTION', message: `The ${axes[this.component].toLowerCase()} angle entry is incomplete. Use CLR and enter a sign followed by five digits.` };
      const component = this.component++; const value = Number(this.number); this.number = '';
      return { kind: 'GUIDANCE', component, value, message: `${axes[component]} gimbal target submitted: ${angleMeaning(value)}. ${component < 2 ? `Next: ${axes[component + 1].toLowerCase()} gimbal angle.` : 'All three targets submitted. Use V06 N20 to inspect the actual ICDU angles; submission alone does not confirm the platform moved.'}` };
    }
  }
}
