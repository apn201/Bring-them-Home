import {it,expect} from 'vitest';
import {AgcInputQueue} from '../../src/agc/AgcInputQueue';
import {romHarness} from '../support/romHarness';
import {prepareImuCheckpoint} from '../../src/agc/ImuCheckpoint';
import {validIgnitionTime} from '../../src/game/Campaign';
import type {AgcKey} from '../../src/agc/KeyCodec';
it('preserves a whole PAD typed as one rapid burst through the real ROM',()=>{
 const host=romHarness();prepareImuCheckpoint([30226,34592,1179],host);
 for(const [noun,values] of [['33',['+00061','+00029','+04284']],['81',['-00213','+00041','-00312']]] as const){
  const queue=new AgcInputQueue();
  const sequence:AgcKey[]=['VERB','2','5','NOUN',...noun.split('') as AgcKey[],'ENTR'];
  for(const raw of values)sequence.push(raw[0]==='-'?'MINUS':'PLUS',...raw.slice(1).split('') as AgcKey[],'ENTR');
  sequence.push('VERB','0','6','NOUN',...noun.split('') as AgcKey[],'ENTR');
  sequence.forEach(key=>queue.push(key));let cycle=0;
  for(;queue.length;cycle+=1000){const key=queue.take(cycle);if(key)host.key(key);host.step(1000);}
  host.step(100000);
  const panel=host.decoder.snapshot();expect(panel.registers.map((value,index)=>(panel.signs[index]==='−'?'-':'+')+value)).toEqual(values);
 }
});
it('never interprets blank/zero or malformed N33 storage as an ignition epoch',()=>{
 for(const values of [undefined,[0,0,0],[61,60,0],[61,29,6000],[61,-1,0],[61,29,NaN]])expect(validIgnitionTime(values)).toBeUndefined();
 expect(validIgnitionTime([61,29,4284])).toBeCloseTo(221382.84,4);
});
