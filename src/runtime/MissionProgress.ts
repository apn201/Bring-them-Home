import type { TypingMission, TypingTask } from './TypingMissions';
export function anglesMatch(actual: readonly number[], expected: readonly number[]): boolean {
  return actual.length === 3 && actual.every((value, index) => { if (!Number.isFinite(value)) return false; const delta = Math.abs(((value % 360 + 360) % 360) - ((expected[index] / 100 % 360 + 360) % 360)); return Math.min(delta, 360 - delta) < 0.06; });
}
/** Only completed ROM displays/encoder feedback may advance an assignment. */
export class MissionProgress {
  index = 0;
  private goal: readonly number[];
  constructor(readonly mission: TypingMission) { this.goal = mission.initialAngles; }
  get active(): TypingTask | undefined { return this.mission.tasks[this.index]; }
  get complete(): boolean { return this.index >= this.mission.tasks.length; }
  accept(command: string, values?: readonly number[]): boolean {
    const task = this.active;
    if (!task || command !== task.command) return false;
    if (command !== 'V35' && (!values || !anglesMatch(values, task.angles ?? this.goal))) return false;
    if (task.angles) this.goal = task.angles;
    this.index++; return true;
  }
}
