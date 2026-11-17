// Acquisition smoke probe only: no browser, peripheral fidelity or native parity claim.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const wasm=fs.readFileSync(path.join(root,'assets/software/webAGC/src/yaAGC.wasm'));
const module=new WebAssembly.Module(wasm);
const reports=[];
for(const program of ['LM131R1','Manche72R3']) {
 const rom=fs.readFileSync(path.join(root,`assets/software/virtualagc/${program}/${program}.bin`));
 const runs=[];
 for(let trial=0;trial<2;trial++) {
  const memory=new WebAssembly.Memory({initial:5});
  // Minimal host functions suffice for this probe; not a production WASI runtime.
  const wasi={fd_close:()=>0,fd_fdstat_get:()=>0,fd_seek:()=>0,
   fd_write:(fd,iovs,count,nwritten)=>{new DataView(memory.buffer).setUint32(nwritten,0,true);return 0;}};
  const instance=new WebAssembly.Instance(module,{env:{memory},wasi_snapshot_preview1:wasi});
  const e=instance.exports;
  const ptr=e.malloc(rom.length);new Uint8Array(memory.buffer).set(rom,ptr);
  e.set_fixed(ptr);e.free(ptr);e.cpu_reset();
  const events=[];
  for(let i=0;i<1000;i++) {e.cpu_step(100);let packet;let guard=0;while((packet=e.packet_read())!==0) {events.push(packet>>>0);if(++guard>10000)throw new Error('output not draining');}}
  const v=e.version();const bytes=new Uint8Array(memory.buffer);let end=v;while(bytes[end])end++;
  const version=new TextDecoder().decode(bytes.slice(v,end));
  const erasable=Buffer.from(new Uint8Array(memory.buffer,e.get_erasable_ptr(),4096));
  runs.push({version,eventCount:events.length,outputHash:crypto.createHash('sha256').update(JSON.stringify(events)).digest('hex'),erasableHash:crypto.createHash('sha256').update(erasable).digest('hex')});
 }
 if(JSON.stringify(runs[0])!==JSON.stringify(runs[1]))throw new Error('fresh-instance nondeterminism');
 if(!runs[0].eventCount)throw new Error('no output observed');
 reports.push({program,cyclesRequested:100000,freshInstanceRepeatMatches:true,...runs[0]});
}
const result={scope:'headless acquisition smoke only; not G1, not native parity, not historical checkpoint validation',imports:WebAssembly.Module.imports(module),exports:WebAssembly.Module.exports(module),reports};
fs.writeFileSync(path.join(root,'research/wasm-smoke.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result.reports,null,2));
