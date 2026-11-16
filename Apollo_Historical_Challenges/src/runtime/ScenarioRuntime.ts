import type { AgcKey } from '../agc/KeyCodec';

export type ScenarioOutcome = 'advanced' | 'correctable-error' | 'diverged' | 'complete';

export interface ScenarioEvent {
  cycle: number;
  key: AgcKey;
  phase: string;
  outcome: ScenarioOutcome;
}

export interface PhaseTransition {
  accepts: (key: AgcKey) => boolean;
  next: string;
  outcome?: Extract<ScenarioOutcome, 'advanced' | 'complete'>;
  message: string;
}

export interface ScenarioPhase {
  id: string;
  completedSteps: number;
  message: string;
  transitions: readonly PhaseTransition[];
  unexpected: { outcome: ScenarioOutcome; next?: string; message: string };
}

export interface ScenarioDefinition {
  initial: string;
  phases: Readonly<Record<string, ScenarioPhase>>;
}

export interface ScenarioSnapshot {
  phase: string;
  completedSteps: number;
  complete: boolean;
  diverged: boolean;
  assistance: number;
  message: string;
  events: readonly ScenarioEvent[];
}

export class ScenarioRuntime {
  private phaseId: string;
  private assistance = 0;
  private events: ScenarioEvent[] = [];

  constructor(private readonly definition: ScenarioDefinition) { this.phaseId = definition.initial; }

  reset(): void { this.phaseId = this.definition.initial; this.assistance = 0; this.events = []; }

  accept(key: AgcKey, cycle: number): ScenarioSnapshot {
    const phase = this.currentPhase();
    const transition = phase.transitions.find((candidate) => candidate.accepts(key));
    if (transition) {
      this.phaseId = transition.next;
      const outcome = transition.outcome ?? 'advanced';
      this.events.push({ cycle, key, phase: phase.id, outcome });
      return this.snapshot(transition.message);
    }
    const { outcome, next, message } = phase.unexpected;
    if (next) this.phaseId = next;
    if (outcome === 'correctable-error') this.assistance += 1;
    this.events.push({ cycle, key, phase: phase.id, outcome });
    return this.snapshot(message);
  }

  diverge(key: AgcKey, cycle: number, message: string): ScenarioSnapshot {
    const phase = this.currentPhase();
    this.phaseId = 'diverged';
    this.events.push({ cycle, key, phase: phase.id, outcome: 'diverged' });
    return this.snapshot(message);
  }

  snapshot(overrideMessage?: string): ScenarioSnapshot {
    const phase = this.currentPhase();
    return {
      phase: phase.id,
      completedSteps: phase.completedSteps,
      complete: phase.id === 'complete',
      diverged: phase.id === 'diverged',
      assistance: this.assistance,
      message: overrideMessage ?? phase.message,
      events: [...this.events],
    };
  }

  private currentPhase(): ScenarioPhase {
    const phase = this.definition.phases[this.phaseId];
    if (!phase) throw new Error(`Unknown scenario phase: ${this.phaseId}`);
    return phase;
  }
}
