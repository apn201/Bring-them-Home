// Development-only diagnostic: confirms the supplied LM131R1 reacts to channel 015 changes.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const memory = new WebAssembly.Memory({ initial: 5 });
const wasm = fs.readFileSync(path.join(root, 'public/wasm/yaAGC.wasm'));
const wasi = { fd_close: () => 0, fd_fdstat_get: () => 0, fd_seek: () => 0,
  fd_write: (_fd, _iovs, _count, written) => { new DataView(memory.buffer).setUint32(written, 0, true); return 0; } };
const rom = fs.readFileSync(path.join(root, 'public/roms/LM131R1.bin'));
function run(dskyFlag) {
  const instance = new WebAssembly.Instance(new WebAssembly.Module(wasm), { env: { memory }, wasi_snapshot_preview1: wasi });
  const agc = instance.exports;
  const pointer = agc.malloc(rom.length); new Uint8Array(memory.buffer).set(rom, pointer); agc.set_fixed(pointer); agc.free(pointer); agc.cpu_reset();
  function advance(steps) { agc.cpu_step(steps); const output = []; for (let guard = 0; guard < 10_000; guard += 1) { const packet = agc.packet_read() >>> 0; if (!packet) break; output.push([packet >>> 16, packet & 0xffff]); } return output; }
  advance(200_000);
  new Uint16Array(memory.buffer, agc.get_erasable_ptr(), 2048)[0o101] = dskyFlag;
  const reports = [];
  for (const [label, code] of [['VERB', 0o21], ['3', 0o3], ['5', 0o5], ['ENTR', 0o34]]) {
    agc.packet_write(0o15, code);
    const output = advance(60_000).filter(([channel]) => channel === 0o10 || channel === 0o11 || channel === 0o163);
    reports.push({ label, code: code.toString(8), output: output.map(([channel, value]) => [channel.toString(8), value.toString(8)]) });
  }
  return reports;
}
console.log(JSON.stringify({ flagOff: run(0), flagOn: run(0o40000) }, null, 2));
