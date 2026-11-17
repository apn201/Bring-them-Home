import { describe,it,expect } from 'vitest';
import { campaign, padMatches } from '../../src/game/Campaign';
import { romHarness } from '../support/romHarness';
import { prepareImuCheckpoint } from '../../src/agc/ImuCheckpoint';
import type { AgcKey } from '../../src/agc/KeyCodec';
describe('historical campaign',()=>{
 it('never treats a wrong ignition hour or minute as readout quantization',()=>{
  expect(padMatches('33',[62,29,4284],[61,29,4284])).toBe(false);
  expect(padMatches('33',[61,30,4284],[61,29,4284])).toBe(false);
  expect(padMatches('33',[61,29,4284],[61,29,4284])).toBe(true);
  expect(padMatches('81',[213,41,-312],[-213,41,-312])).toBe(false);
 });
 it('has one introduction, chronological emergencies and varied information sources',()=>{
  expect(campaign.filter(chapter=>chapter.difficulty===0)).toHaveLength(1);
  expect(campaign.map(chapter=>chapter.epoch)).toEqual([...campaign.map(chapter=>chapter.epoch)].sort((a,b)=>a-b));
  expect(new Set(campaign.flatMap(chapter=>chapter.tasks.map(task=>task.source)))).toEqual(new Set(['direct','manual','radio','panel']));
  expect(campaign.filter(chapter=>chapter.duration)).toHaveLength(4);
  expect(campaign.some(chapter=>chapter.tasks.some(task=>task.kind==='rates'))).toBe(true);
 });
 it.each(campaign.filter(chapter=>chapter.tasks.some(task=>task.kind==='load')).map(chapter=>({chapter,title:chapter.title})))('$title PAD components survive actual ROM load and readback',({chapter})=>{
  const host=romHarness(chapter.rom);prepareImuCheckpoint(chapter.initialAngles,host);
  for(const task of chapter.tasks.filter(task=>task.kind==='load')){
   host.keys(['VERB','2','5','NOUN',...task.noun!.split('') as AgcKey[],'ENTR']);
   for(const value of task.values!)host.keys([value<0?'MINUS':'PLUS',...Math.abs(value).toString().padStart(5,'0').split('') as AgcKey[],'ENTR']);
   host.keys(['VERB','0','6','NOUN',...task.noun!.split('') as AgcKey[],'ENTR']);host.step(100000);
   const panel=host.decoder.snapshot();const values=panel.registers.map((raw,index)=>Number(raw)*(panel.signs[index]==='−'?-1:1));
   expect(values).toEqual(task.values);
  }
 });
});
