import { describe,it,expect } from 'vitest';
import { SpacecraftDynamics } from '../../src/agc/SpacecraftDynamics';
import { romHarness } from '../support/romHarness';
import { prepareImuCheckpoint } from '../../src/agc/ImuCheckpoint';
describe('player-controlled spacecraft consequences',()=>{
 it('preserves coast rotation and requires counterthrust to arrest it',()=>{
  const craft=new SpacecraftDynamics({attitude:[0,0,0],rates:[.1,0,0]});
  for(let i=0;i<100;i++)craft.step(.01);
  expect(craft.snapshot().attitude[0]).toBeCloseTo(.1,4);
  expect(craft.snapshot().rates[0]).toBeCloseTo(.1,6);
  craft.control(0,-1);craft.step(.05);craft.control(0,0);
  expect(craft.snapshot().rates[0]).toBeLessThan(.02);
  expect(craft.snapshot().propellantUsedKg).toBeGreaterThan(0);
 });
 it('a longer firing changes velocity and consumes more propellant',()=>{
  const run=(duration:number)=>{const craft=new SpacecraftDynamics({attitude:[0,0,0],rates:[0,0,0]});craft.engine(true,.1);for(let i=0;i<duration*100;i++)craft.step(.01);craft.engine(false);return craft.snapshot();};
  const correct=run(14),late=run(18);
  expect(late.deltaV[0]).toBeGreaterThan(correct.deltaV[0]*1.28);
  expect(late.propellantUsedKg).toBeGreaterThan(correct.propellantUsedKg);
  expect(correct.burnSeconds).toBeCloseTo(14,5);
 });
 it('modeled motion changes the real ROM encoder readout',()=>{
  const host=romHarness();prepareImuCheckpoint([120,26750,450],host);
  const before=host.angles();const craft=new SpacecraftDynamics({attitude:[0,0,0],rates:[.1,0,0]});
  for(let i=0;i<100;i++){host.moveEncoders(craft.step(.01));host.step(853);}
  expect(host.angles()[0]-before[0]).toBeCloseTo(.1,1);
  host.keys(['VERB','1','6','NOUN','2','0','ENTR']);host.step(100000);
  expect(Number(host.decoder.snapshot().registers[0])).toBeGreaterThan(120);
 });
 it('projects thrust onto a unit direction during a compound rotation',()=>{
  const craft=new SpacecraftDynamics({attitude:[0,0,0],rates:[0,60,45]});
  craft.step(1);craft.engine(true,.1);craft.step(.001);
  const state=craft.snapshot();
  const acceleration=4450/(43514-state.propellantUsedKg);
  expect(Math.hypot(...state.deltaV)).toBeCloseTo(acceleration*.001,10);
 });
});
