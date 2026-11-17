import type { AgcKey } from './KeyCodec';

/** Reconstruct a platform checkpoint by operating the ROM and its servo loop.
 * No DSKY strings or erasable registers are patched to the target values. */
export function prepareImuCheckpoint(angles: readonly number[], host: { key(key: AgcKey): void; step(cycles: number): void }): void {
  if (angles.length !== 3 || angles.some((value) => !Number.isInteger(value) || Math.abs(value) >= 36000)) throw new Error('Invalid IMU checkpoint angles.');
  const keys = (sequence: readonly AgcKey[]) => { for (const key of sequence) { host.key(key); host.step(15000); } };
  host.step(200000);
  keys(['VERB', '4', '1', 'NOUN', '2', '0', 'ENTR']);
  for (const angle of angles) keys([angle < 0 ? 'MINUS' : 'PLUS', ...Math.abs(angle).toString().padStart(5, '0').split('') as AgcKey[], 'ENTR']);
  host.step(1500000);
  keys(['VERB', '0', '6', 'NOUN', '2', '0', 'ENTR']);
  host.step(100000);
}
