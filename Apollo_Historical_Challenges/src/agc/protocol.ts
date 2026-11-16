import type { AgcKey } from './KeyCodec';
import type { FlightSetup, FlightState } from './SpacecraftDynamics';

export interface ChannelEvent { channel: number; value: number; cycle: number }

export type WorkerRequest =
  | { type: 'start'; wasmUrl: string; romUrl: string; romName: string }
  | { type: 'key'; key: AgcKey; down: boolean }
  | { type: 'pause'; paused: boolean }
  | { type: 'restart'; imuCheckpoint?: readonly number[]; flight?: FlightSetup }
  | { type: 'rcs'; axis: number; direction: number }
  | { type: 'engine'; firing: boolean; throttle?: number }
  | { type: 'warp'; factor: number };

export type WorkerResponse =
  | { type: 'ready'; engineVersion: string; rom: string }
  | { type: 'frame'; cycle: number; events: ChannelEvent[]; erasableHash: string; coreWords: number[]; imuAngles: number[]; flight?: FlightState }
  | { type: 'restarted' }
  | { type: 'preparing' }
  | { type: 'error'; message: string };
