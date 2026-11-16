import type { AgcKey } from './KeyCodec';

export interface ChannelEvent { channel: number; value: number; cycle: number }

export type WorkerRequest =
  | { type: 'start'; wasmUrl: string; romUrl: string; romName: string }
  | { type: 'key'; key: AgcKey; down: boolean }
  | { type: 'pause'; paused: boolean }
  | { type: 'restart'; imuCheckpoint?: readonly number[] };

export type WorkerResponse =
  | { type: 'ready'; engineVersion: string; rom: string }
  | { type: 'frame'; cycle: number; events: ChannelEvent[]; erasableHash: string; coreWords: number[]; imuAngles: number[] }
  | { type: 'restarted' }
  | { type: 'preparing' }
  | { type: 'error'; message: string };
