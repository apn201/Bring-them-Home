import { readFileSync } from 'node:fs';
import { DskyDecoder } from '../../src/agc/DskyDecoder';
import { ImuPeripheral } from '../../src/agc/ImuPeripheral';
import { keyCodes, type AgcKey } from '../../src/agc/KeyCodec';
export function romHarness() {
  const memory = new WebAssembly.Memory({ initial: 5 });
  const instance = new WebAssembly.Instance(new WebAssembly.Module(readFileSync('public/wasm/yaAGC.wasm')), { env: { memory }, wasi_snapshot_preview1: { fd_close: () => 0, fd_fdstat_get: () => 0, fd_seek: () => 0, fd_write: (_a:number,_b:number,_c:number,w:number) => { new DataView(memory.buffer).setUint32(w, 0, true); return 0; } } });
  const e = instance.exports as unknown as { malloc(n:number):number; free(n:number):void; set_fixed(n:number):void; cpu_reset():void; cpu_step(n:number):void; packet_read():number; packet_write(c:number,v:number):number; get_erasable_ptr():number };
  const rom = readFileSync('public/roms/LM131R1.bin'); const ptr=e.malloc(rom.length); new Uint8Array(memory.buffer).set(rom,ptr); e.set_fixed(ptr); e.free(ptr); e.cpu_reset();
  const decoder = new DskyDecoder(); const imu=new ImuPeripheral(); let lampTest=false;
  const step = (n:number) => { for(let elapsed=0;elapsed<n;elapsed+=1000) { imu.flush((channel,value)=>e.packet_write(channel,value)); e.cpu_step(Math.min(1000,n-elapsed)); let packet; while((packet=e.packet_read()>>>0)!==0) { const channel=packet>>>16,value=packet&0x7fff; decoder.apply(channel,value); imu.applyOutput(channel,value); if(channel===0o13 && value&0o1000)lampTest=true; } } };
  const key=(key:AgcKey)=>{e.packet_write(0o15,keyCodes[key]!);};
  const keys=(sequence:readonly AgcKey[])=>{for(const k of sequence){key(k);step(15000);}};
  const angles=()=>[...new Uint16Array(memory.buffer,e.get_erasable_ptr()+0o32*2,3)].map(word=>(word&0x7fff)*360/32768);
  return { decoder, step, key, keys, angles, lampTest:()=>lampTest };
}
