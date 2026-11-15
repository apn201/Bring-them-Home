/// <reference lib="webworker" />
import { keyCodes, type AgcKey } from './KeyCodec';
import type { ChannelEvent, WorkerRequest, WorkerResponse } from './protocol';

declare const self: DedicatedWorkerGlobalScope;
type Exports = {
  malloc(size: number): number; free(pointer: number): void; set_fixed(pointer: number): void;
  cpu_reset(): void; cpu_step(steps: number): void; packet_write(channel: number, value: number): void;
  packet_read(): number; version(): number; get_erasable_ptr(): number;
};

let memory: WebAssembly.Memory;
let engine: Exports;
let cycle = 0;
let running = false;
let booting: Promise<void> | undefined;
let interval: number | undefined;
let wasmUrl = '';
let romUrl = '';
let romName = '';

const post = (message: WorkerResponse): void => self.postMessage(message);

self.addEventListener('message', ({ data }: MessageEvent<WorkerRequest>) => {
  void handle(data).catch((error: unknown) => post({ type: 'error', message: error instanceof Error ? error.message : String(error) }));
});

async function handle(message: WorkerRequest): Promise<void> {
  if (message.type === 'start') { wasmUrl = message.wasmUrl; romUrl = message.romUrl; romName = message.romName; await start(); return; }
  if (!engine) return;
  if (message.type === 'pause') { running = !message.paused; return; }
  if (message.type === 'restart') { await restart(); post({ type: 'restarted' }); tick(10_000); return; }
  writeKey(message.key, message.down);
  tick(600);
}

async function start(): Promise<void> {
  if (!booting) booting = instantiate();
  await booting;
  if (interval === undefined) interval = self.setInterval(() => { if (running) tick(1700); }, 20);
  running = true;
}

async function instantiate(): Promise<void> {
  memory = new WebAssembly.Memory({ initial: 5 });
  const wasi = {
    fd_close: (): number => 0,
    fd_fdstat_get: (): number => 0,
    fd_seek: (): number => 0,
    fd_write: (_fd: number, _iovs: number, _count: number, written: number): number => {
      new DataView(memory.buffer).setUint32(written, 0, true); return 0;
    },
  };
  const wasm = await fetch(wasmUrl);
  if (!wasm.ok) throw new Error(`Could not load yaAGC.wasm (${wasm.status}).`);
  const module = await WebAssembly.compile(await wasm.arrayBuffer());
  const instance = await WebAssembly.instantiate(module, { env: { memory }, wasi_snapshot_preview1: wasi });
  engine = instance.exports as unknown as Exports;
  await loadRom();
  post({ type: 'ready', engineVersion: cString(engine.version()), rom: romName });
  tick(10_000);
}

async function loadRom(): Promise<void> {
  const response = await fetch(romUrl);
  if (!response.ok) throw new Error(`Could not load LM131R1 ROM (${response.status}).`);
  const rom = new Uint8Array(await response.arrayBuffer());
  const pointer = engine.malloc(rom.byteLength);
  new Uint8Array(memory.buffer).set(rom, pointer);
  engine.set_fixed(pointer); engine.free(pointer); engine.cpu_reset(); cycle = 0;
}

async function restart(): Promise<void> { await loadRom(); }

function writeKey(key: AgcKey, down: boolean): void {
  if (key === 'PRO') { engine.packet_write(0o32, down ? 1 << 13 : 0); return; }
  if (!down) return;
  const code = keyCodes[key];
  if (code === undefined) throw new Error(`Unsupported AGC key ${key}`);
  engine.packet_write(0o15, code);
}

function tick(steps: number): void {
  engine.cpu_step(steps); cycle += steps;
  const events = drain();
  post({ type: 'frame', cycle, events, erasableHash: hashErasable(), coreWords: coreWords() });
}

function drain(): ChannelEvent[] {
  const events: ChannelEvent[] = [];
  for (let guard = 0; guard < 10_000; guard += 1) {
    const packet = engine.packet_read() >>> 0;
    if (packet === 0) break;
    events.push({ channel: packet >>> 16, value: packet & 0xffff, cycle });
  }
  return events;
}

function cString(pointer: number): string {
  const bytes = new Uint8Array(memory.buffer); let end = pointer;
  while (bytes[end] !== 0) end += 1;
  return new TextDecoder().decode(bytes.slice(pointer, end));
}

function hashErasable(): string {
  const words = new Uint16Array(memory.buffer, engine.get_erasable_ptr(), 2048);
  let hash = 2166136261;
  for (const word of words) { hash ^= word; hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function coreWords(): number[] { return [...new Uint16Array(memory.buffer, engine.get_erasable_ptr(), 8)].map((word) => word & 0o77777); }
