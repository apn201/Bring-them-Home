import { describe, expect, it } from 'vitest';
import { CommandNarrator } from '../../src/runtime/CommandNarrator';
import type { AgcKey } from '../../src/agc/KeyCodec';

describe('operator command meaning', () => {
  it('emits completed operations and committed angles, never individual digit chatter', () => {
    const narrator = new CommandNarrator();
    const events = ['VERB', '4', '1', 'NOUN', '2', '0', 'ENTR', 'PLUS', '3', '0', '3', '4', '3', 'ENTR'].map((key) => narrator.accept(key as AgcKey)).filter(Boolean);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ command: 'V41 N20' });
    expect(events[1]).toMatchObject({ component: 0, value: 30343 });
    expect(events[1]?.message).toContain('Outer gimbal target submitted: +303.43° (303° 25′ 48″)');
  });
  it('keeps the component and replaces a typo after CLR', () => {
    const narrator = new CommandNarrator();
    ['VERB', '4', '1', 'NOUN', '2', '0', 'ENTR', 'PLUS', '9', 'CLR', 'PLUS', '3', '0', '2', '4', '3'].forEach((key) => narrator.accept(key as AgcKey));
    expect(narrator.accept('ENTR')).toMatchObject({ component: 0, value: 30243 });
    ['PLUS', '3', '4', '7', '7', '8'].forEach((key) => narrator.accept(key as AgcKey));
    expect(narrator.accept('ENTR')).toMatchObject({ component: 1, value: 34778 });
  });
  it('explains free-console commands after a previous operation', () => {
    const narrator = new CommandNarrator();
    ['VERB', '3', '5'].forEach((key) => narrator.accept(key as AgcKey));
    expect(narrator.accept('ENTR')?.message).toContain('Lamp test requested');
    ['VERB', '1', '6', 'NOUN', '2', '0'].forEach((key) => narrator.accept(key as AgcKey));
    expect(narrator.accept('ENTR')?.message).toContain('Continuous monitoring of actual gimbal encoders');
  });
});
