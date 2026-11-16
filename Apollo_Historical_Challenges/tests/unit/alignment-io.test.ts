import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { DskyDecoder } from '../../src/agc/DskyDecoder';
import { keyCodes, type AgcKey } from '../../src/agc/KeyCodec';
import { ImuPeripheral } from '../../src/agc/ImuPeripheral';

describe('LM131R1 alignment I/O', () => {
  it.each([['30243','34778','00813'], ['30343','26750','00450']])('closes the real ROM servo loop for %s / %s / %s', (outer, inner, middle) => {
    const memory = new WebAssembly.Memory({ initial: 5 });
    const instance = new WebAssembly.Instance(new WebAssembly.Module(readFileSync('public/wasm/yaAGC.wasm')), { env: { memory }, wasi_snapshot_preview1: { fd_close: () => 0, fd_fdstat_get: () => 0, fd_seek: () => 0, fd_write: (_a:number,_b:number,_c:number,w:number) => { new DataView(memory.buffer).setUint32(w, 0, true); return 0; } } });
    const e = instance.exports as unknown as { malloc(n:number):number; free(n:number):void; set_fixed(n:number):void; cpu_reset():void; cpu_step(n:number):void; packet_read():number; packet_write(c:number,v:number):number; get_erasable_ptr():number };
    const rom = readFileSync('public/roms/LM131R1.bin'); const ptr = e.malloc(rom.length); new Uint8Array(memory.buffer).set(rom,ptr); e.set_fixed(ptr); e.free(ptr); e.cpu_reset();
    const decoder = new DskyDecoder(); const imu = new ImuPeripheral();
    const step = (n:number) => { for(let elapsed=0;elapsed<n;elapsed+=1000) { imu.flush((channel,value) => e.packet_write(channel,value)); e.cpu_step(1000); let packet; while((packet=e.packet_read()>>>0)!==0) { const channel=packet>>>16; const value=packet&0x7fff; decoder.apply(channel,value); imu.applyOutput(channel,value); } } };
    const keys = (sequence:string[]) => { for(const key of sequence) { e.packet_write(0o15,keyCodes[key as AgcKey]!); step(15000); } };
    step(200000);
    keys(['VERB','4','1','NOUN','2','0','ENTR']);
    for(const raw of [outer,inner,middle]) keys(['PLUS',...raw,'ENTR']);
    step(1500000);
    keys(['VERB','0','6','NOUN','2','0','ENTR']); step(100000);
    expect(decoder.snapshot()).toMatchObject({ noun: '20', verb: '06' });
    // A drive pulse is four encoder counts (~0.044°), so arbitrary decimal
    // targets need not be exactly representable by the physical encoder.
    decoder.snapshot().registers.forEach((raw,index) => expect(Math.abs(Number(raw)-Number([outer,inner,middle][index]))).toBeLessThanOrEqual(5));
    expect(imu.driveCounts.some((count) => count !== 0)).toBe(true);
    const cdu = [...new Uint16Array(memory.buffer,e.get_erasable_ptr()+0o32*2,3)];
    cdu.forEach((word,index) => expect(word*360/32768).toBeCloseTo(Number([outer,inner,middle][index])/100,1));
  });
});
