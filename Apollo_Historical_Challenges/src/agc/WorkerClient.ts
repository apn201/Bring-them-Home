import type { AgcKey } from './KeyCodec';
import type { WorkerRequest, WorkerResponse } from './protocol';

export class WorkerClient extends EventTarget {
  private readonly worker = new Worker(new URL('./agc.worker.ts', import.meta.url), { type: 'module' });

  constructor() {
    super();
    this.worker.addEventListener('message', ({ data }: MessageEvent<WorkerResponse>) => {
      this.dispatchEvent(new CustomEvent<WorkerResponse>('message', { detail: data }));
    });
    this.worker.addEventListener('error', (event) => this.dispatchEvent(new CustomEvent<string>('error', { detail: event.message })));
  }

  start(wasmUrl: string, romUrl: string, romName: string): void { this.post({ type: 'start', wasmUrl, romUrl, romName }); }
  restart(imuCheckpoint: readonly number[] = [30243, 34778, 813]): void { this.post({ type: 'restart', imuCheckpoint }); }
  pause(paused: boolean): void { this.post({ type: 'pause', paused }); }
  key(key: AgcKey, down = true): void { this.post({ type: 'key', key, down }); }
  dispose(): void { this.worker.terminate(); }
  private post(message: WorkerRequest): void { this.worker.postMessage(message); }
}
