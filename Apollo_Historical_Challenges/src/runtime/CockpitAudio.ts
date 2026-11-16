import type { FlightState } from '../agc/SpacecraftDynamics';

/** Local reconstructed effects, never labeled as Apollo recordings. No TTS.
 * LM C&W 3000 Hz; CM alternating 750/2000 Hz: NASA TN D-7919 p.16. */
export class CockpitAudio {
 private context?:AudioContext;
 private output?:GainNode;
 private engineGain?:GainNode;
 private rcsGain?:GainNode;
 private alarmGain?:GainNode;
 private alarm?:OscillatorNode;
 enabled=false;
 async enable():Promise<void> {
  if(!this.context){
   const context=this.context=new AudioContext();
   const output=this.output=context.createGain();output.gain.value=.35;output.connect(context.destination);
   const noise=context.createBuffer(1,context.sampleRate*2,context.sampleRate);const samples=noise.getChannelData(0);
   let seed=130413;for(let i=0;i<samples.length;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;samples[i]=seed/2147483648;}
   const source=context.createBufferSource();source.buffer=noise;source.loop=true;
   const low=context.createBiquadFilter();low.type='lowpass';low.frequency.value=180;low.Q.value=.7;
   this.engineGain=context.createGain();this.engineGain.gain.value=0;source.connect(low).connect(this.engineGain).connect(output);
   const high=context.createBiquadFilter();high.type='bandpass';high.frequency.value=850;high.Q.value=.8;
   this.rcsGain=context.createGain();this.rcsGain.gain.value=0;source.connect(high).connect(this.rcsGain).connect(output);source.start();
   this.alarm=context.createOscillator();this.alarm.type='sine';this.alarmGain=context.createGain();this.alarmGain.gain.value=0;this.alarm.connect(this.alarmGain).connect(output);this.alarm.start();
  }
  await this.context.resume();this.enabled=true;
 }
 mute():void {this.enabled=false;if(this.output)this.output.gain.value=0;}
 update(flight:FlightState|undefined,master:boolean,cm:boolean,paused:boolean):void {
  const context=this.context;if(!context||!this.output)return;
  this.output.gain.setTargetAtTime(this.enabled&&!paused?.35:0,context.currentTime,.03);
  const entry=flight?.entry;
  this.engineGain!.gain.setTargetAtTime(flight?.firing?(flight.propulsion==='rcs'?.12:.35+flight.throttle*.5):entry?Math.min(.8,entry.dragG*.09):0,context.currentTime,.08);
  this.rcsGain!.gain.setTargetAtTime(flight?.rcs.some(value=>value!==0)?.12:0,context.currentTime,.02);
  this.alarm!.frequency.setValueAtTime(cm?(Math.floor(context.currentTime*4)%2?750:2000):3000,context.currentTime);
  this.alarmGain!.gain.setTargetAtTime(master?.035:0,context.currentTime,.008);
 }
}
