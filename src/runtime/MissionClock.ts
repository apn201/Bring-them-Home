export interface MissionClockSnapshot {
  cycle: number;
  paused: boolean;
}

/** The worker cycle count is the authoritative scenario clock. */
export class MissionClock {
  private cycle = 0;
  private paused = false;

  reset(): void { this.cycle = 0; this.paused = false; }
  setPaused(paused: boolean): void { this.paused = paused; }
  sync(cycle: number): void { if (!this.paused && cycle >= this.cycle) this.cycle = cycle; }
  snapshot(): MissionClockSnapshot { return { cycle: this.cycle, paused: this.paused }; }
}
