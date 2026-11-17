import { it, expect } from 'vitest';
import { romHarness } from '../support/romHarness';
import { prepareImuCheckpoint } from '../../src/agc/ImuCheckpoint';
import type { AgcKey } from '../../src/agc/KeyCodec';
it('uses the CM ROM for the final latitude, longitude and lift-up load',()=>{
 const host=romHarness('Manche72R3');
 prepareImuCheckpoint([0,15200,0],host);
 host.keys(['VERB','2','5','NOUN','6','1','ENTR']);
 for(const raw of ['02166','16537','00001'])host.keys(['MINUS',...raw.split('') as AgcKey[],'ENTR']);
 host.keys(['VERB','0','6','NOUN','6','1','ENTR']);host.step(100000);
 const panel=host.decoder.snapshot();
 expect(panel.registers).toEqual(['02166','16537','00001']);
 expect(panel.signs).toEqual(['−','−','−']);
});
