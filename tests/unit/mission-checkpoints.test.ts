import { describe, expect, it } from 'vitest';
import { romHarness } from '../support/romHarness';
import { prepareImuCheckpoint } from '../../src/agc/ImuCheckpoint';
import { typingMissions } from '../../src/runtime/TypingMissions';
import { MissionProgress, anglesMatch } from '../../src/runtime/MissionProgress';
import type { AgcKey } from '../../src/agc/KeyCodec';
describe('every playable mission against the actual ROM', () => {
  it.each(typingMissions.map(mission=>({mission,title:mission.title})))('$title boots nonzero and completes every requested operation', ({mission}) => {
    const host=romHarness(); prepareImuCheckpoint(mission.initialAngles,host);
    expect(anglesMatch(host.angles(),mission.initialAngles)).toBe(true);
    expect(host.decoder.snapshot()).toMatchObject({verb:'06',noun:'20'});
    expect(host.decoder.snapshot().registers.every(value=>/^\d{5}$/.test(value))).toBe(true);
    expect(host.decoder.snapshot().registers.some(value=>value!=='00000')).toBe(true);
    const progress=new MissionProgress(mission);
    if (progress.active!.command !== 'V35') expect(progress.accept(progress.active!.command,[0,0,0])).toBe(false);
    for(const task of mission.tasks) {
      const command = task.command.split(' ').flatMap(token=>[token[0]==='V'?'VERB':'NOUN',...token.slice(1)]) as AgcKey[];
      host.keys([...command,'ENTR']);
      if(task.angles)for(const value of task.angles)host.keys([value<0?'MINUS':'PLUS',...Math.abs(value).toString().padStart(5,'0').split('') as AgcKey[],'ENTR']);
      host.step(1700000);
      if(task.command==='V35')expect(host.lampTest()).toBe(true);
      else if(!task.angles)expect(host.decoder.snapshot()).toMatchObject({verb:task.command.slice(1,3),noun:task.command.slice(-2)});
      const values=task.angles?host.angles():host.decoder.snapshot().registers.map(value=>Number(value)/100);
      expect(progress.accept(task.command,values),`${mission.id}: ${task.command} ${values}`).toBe(true);
    }
    expect(progress.complete).toBe(true);
  });
  it('includes seven new extended assignments and a 250+ key endurance sequence', () => {
    expect(typingMissions.filter(mission=>mission.id!=='checkout'&&mission.epoch==='TRAINING')).toHaveLength(7);
    const endurance=typingMissions.find(mission=>mission.id==='endurance')!;
    const keys=endurance.tasks.reduce((count,task)=>count+task.command.split(' ').reduce((sum,token)=>sum+token.length,0)+1+(task.angles?21:0),0);
    expect(keys).toBeGreaterThan(250);
  });
});
