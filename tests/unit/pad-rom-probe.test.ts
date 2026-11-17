import { it, expect } from 'vitest';
import { romHarness } from '../support/romHarness';
import { prepareImuCheckpoint } from '../../src/agc/ImuCheckpoint';
import type { AgcKey } from '../../src/agc/KeyCodec';
it('loads ignition time and velocity PAD components through the real ROM', () => {
 const host=romHarness();prepareImuCheckpoint([120,26750,450],host);
 for(const [noun,values] of [['33',['+00061','+00029','+04284']],['81',['-00213','+00041','-00312']]] as const){
  host.keys(['VERB','2','5','NOUN',...noun.split('') as AgcKey[],'ENTR']);
  for(const raw of values)host.keys([raw[0]==='-'?'MINUS':'PLUS',...raw.slice(1).split('') as AgcKey[],'ENTR']);
  host.keys(['VERB','0','6','NOUN',...noun.split('') as AgcKey[],'ENTR']);host.step(100000);
  const panel=host.decoder.snapshot();expect(panel.noun).toBe(noun);expect(panel.registers.map((raw,index)=>(panel.signs[index]==='−'?'-':'+')+raw)).toEqual(values);
 }
});
