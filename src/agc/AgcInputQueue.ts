import type { AgcKey } from './KeyCodec';
/** Preserve fast human input while allowing the real keyrupt/PINBALL jobs to
 * complete. ENTER has an extra display/operation settling interval. Timing is
 * in CPU cycles, shared with the emulation clock, never guessed wall delays. */
export class AgcInputQueue {
 private keys:AgcKey[]=[];
 private availableAt=0;
 push(key:AgcKey):void {this.keys.push(key);}
 take(cycle:number):AgcKey|undefined {
  if(cycle<this.availableAt)return;
  const key=this.keys.shift();
  if(key)this.availableAt=cycle+(key==='ENTR'?45000:15000);
  return key;
 }
 get length():number {return this.keys.length;}
 reset():void {this.keys=[];this.availableAt=0;}
}
