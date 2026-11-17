import { it,expect } from 'vitest';
import { EntryDynamics } from '../../src/agc/EntryDynamics';
import { CautionWarning } from '../../src/game/CautionWarning';
it('retains the fault lamp when the master alarm is acknowledged',()=>{
 const panel=new CautionWarning();expect(panel.set(['BATTERY 2'])).toBe(true);
 panel.acknowledge();expect(panel.master).toBe(false);expect(panel.has('BATTERY 2')).toBe(true);
 expect(panel.set(['BATTERY 2'])).toBe(false);expect(panel.master).toBe(false);
 panel.set([]);expect(panel.set(['BATTERY 2'])).toBe(true);expect(panel.master).toBe(true);
});
it('integrates an entry and changes the outcome when lift is rolled down',()=>{
 const fly=(bank:number|undefined)=>{const model=new EntryDynamics();let blackout=false,angle=0;for(let i=0;i<12000;i++){const target=model.snapshot().bankTarget;angle+=Math.max(-.5,Math.min(.5,target-angle));model.step(.1,bank??angle);const frame=model.snapshot();blackout ||=frame.blackout;if(frame.phase!=='entry')break;}return {state:model.snapshot(),blackout};};
 const nominal=fly(undefined),inverted=fly(180);
 expect(nominal.blackout).toBe(true);
 expect(nominal.state.phase).toBe('chutes');
 expect(nominal.state.peakG).toBeLessThan(10);
 expect(inverted.state.peakG).toBeGreaterThan(nominal.state.peakG);
 expect(Math.abs(nominal.state.range-inverted.state.range)).toBeGreaterThan(10000);
});
