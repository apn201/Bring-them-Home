/// <reference lib="webworker" />
import { keyCodes, type AgcKey } from './KeyCodec';
import type { ChannelEvent, WorkerRequest, WorkerResponse } from './protocol';
import { ImuPeripheral } from './ImuPeripheral';
import { prepareImuCheckpoint } from './ImuCheckpoint';
import { SpacecraftDynamics } from './SpacecraftDynamics';
import { AgcInputQueue } from './AgcInputQueue';

declare const self: DedicatedWorkerGlobalScope;
type Exports = {
  malloc(size: number): number; free(pointer: number): void; set_fixed(pointer: number): void;
  cpu_reset(): void; cpu_step(steps: number): void; packet_write(channel: number, value: number): number;
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
let imu = new ImuPeripheral();
let requests = Promise.resolve();
let preparing = false;
let preparedEvents: ChannelEvent[] = [];
let flight: SpacecraftDynamics | undefined;
let warp = 1;
const input=new AgcInputQueue();

const post = (message: WorkerResponse): void => self.postMessage(message);

self.addEventListener('message', ({ data }: MessageEvent<WorkerRequest>) => {
  requests = requests.then(() => handle(data)).catch((error: unknown) => post({ type: 'error', message: error instanceof Error ? error.message : String(error) }));
});

async function handle(message: WorkerRequest): Promise<void> {
  if (message.type === 'start') { wasmUrl = message.wasmUrl; romUrl = message.romUrl; romName = message.romName; await start(); return; }
  if (!engine) return;
  if (message.type === 'pause') { running = !message.paused; return; }
  if (message.type === 'rcs') { flight?.control(message.axis,message.direction); return; }
  if (message.type === 'entry') {flight?.beginEntry();return;}
  if (message.type === 'engine') { flight?.engine(message.firing,message.throttle); return; }
  if (message.type === 'warp') { warp=Math.max(1,Math.min(16,message.factor)); return; }
  if (message.type === 'restart') {
    post({ type: 'preparing' }); preparing = true; preparedEvents = [];
    try {
      if(message.rom){romUrl=new URL(`${message.rom}.bin`,romUrl).href;romName=message.rom;}
      await restart();
      if (message.imuCheckpoint) {
        prepareImuCheckpoint(message.imuCheckpoint, { key: (key) => writeKey(key, true), step: tick });
        const counters = new Uint16Array(memory.buffer, engine.get_erasable_ptr() + 0o32 * 2, 3);
        if (!message.imuCheckpoint.every((target, index) => { const actual = (counters[index] & 0x7fff) * 360 / 32768; const delta = Math.abs(actual - ((target / 100 % 360 + 360) % 360)); return Math.min(delta, 360 - delta) < 0.06; })) throw new Error('Mission checkpoint failed encoder verification. Restart the assignment.');
      }
      flight = message.flight ? new SpacecraftDynamics(message.flight) : undefined; warp=1;
      preparing = false;
      post({ type: 'restarted' }); publishFrame(preparedEvents); preparedEvents = [];
    } finally { preparing = false; }
    return;
  }
  if(message.key==='PRO'){writeKey(message.key,message.down);return;}
  if(message.down)input.push(message.key);
}

async function start(): Promise<void> {
  if (!booting) booting = instantiate();
  await booting;
  if (interval === undefined) interval = self.setInterval(() => { if (running) tick(1700*warp); }, 20);
  running = true;
}

async function instantiate(): Promise<void> {
  imu = new ImuPeripheral();
  flight = undefined;
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
  if (!preparing) post({ type: 'ready', engineVersion: cString(engine.version()), rom: romName });
  tick(10_000);
}

async function loadRom(): Promise<void> {
  input.reset();
  const response = await fetch(romUrl);
  if (!response.ok) throw new Error(`Could not load LM131R1 ROM (${response.status}).`);
  const rom = new Uint8Array(await response.arrayBuffer());
  const pointer = engine.malloc(rom.byteLength);
  new Uint8Array(memory.buffer).set(rom, pointer);
  engine.set_fixed(pointer); engine.free(pointer); engine.cpu_reset(); cycle = 0;
}

async function restart(): Promise<void> { const resume = running; running = false; try { await instantiate(); } finally { running = resume; } }

function writeKey(key: AgcKey, down: boolean): void {
  if (key === 'PRO') { engine.packet_write(0o32, down ? 1 << 13 : 0); return; }
  if (!down) return;
  const code = keyCodes[key];
  if (code === undefined) throw new Error(`Unsupported AGC key ${key}`);
  engine.packet_write(0o15, code);
}

function tick(steps: number): void {
  const events: ChannelEvent[] = [];
  for (let remaining = steps; remaining > 0;) {
    if(!preparing){const key=input.take(cycle);if(key){writeKey(key,true);post({type:'key-processed',key,cycle});}}
    imu.flush((channel, value) => engine.packet_write(channel, value));
    const quantum = Math.min(remaining, 1000);
    if (!preparing && flight) imu.moveEncoders(flight.step(quantum/85333));
    engine.cpu_step(quantum); cycle += quantum; remaining -= quantum;
    events.push(...drain());
  }
  if (preparing) { preparedEvents.push(...events.filter((event) => [0o10, 0o11, 0o13, 0o163].includes(event.channel))); return; }
  publishFrame(events);
}

function publishFrame(events: ChannelEvent[]): void {
  const cdu = [...new Uint16Array(memory.buffer, engine.get_erasable_ptr() + 0o32 * 2, 3)].map((word) => (word & 0x7fff) * 360 / 32768);
  post({ type: 'frame', cycle, events, erasableHash: hashErasable(), coreWords: coreWords(), imuAngles: cdu, flight: flight?.snapshot(),pendingKeys:input.length });
}

function drain(): ChannelEvent[] {
  const events: ChannelEvent[] = [];
  for (let guard = 0; guard < 10_000; guard += 1) {
    const packet = engine.packet_read() >>> 0;
    if (packet === 0) break;
    imu.applyOutput(packet >>> 16, packet & 0xffff);
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
