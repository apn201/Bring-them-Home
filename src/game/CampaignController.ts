import { WorkerClient } from '../agc/WorkerClient';
import { DskyDecoder } from '../agc/DskyDecoder';
import type { AgcKey } from '../agc/KeyCodec';
import type { WorkerResponse } from '../agc/protocol';
import { SpacecraftDynamics, type FlightState } from '../agc/SpacecraftDynamics';
import { DskyView } from '../ui/DskyView';
import { CommandNarrator, angleMeaning } from '../runtime/CommandNarrator';
import { TranscriptCuePlayer } from '../runtime/TranscriptCuePlayer';
import { campaign, manuals, padMatches, validIgnitionTime, type CampaignTask } from './Campaign';
import { spacecraftMarkup } from '../ui/SpacecraftView';
import { CockpitAudio } from '../runtime/CockpitAudio';
import { CautionWarning } from './CautionWarning';

const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id)! as T;
const signed=(n:number)=>`${n<0?'−':'+'}${Math.abs(n).toString().padStart(5,'0')}`;
const getTime=(n:number)=>{const v=Math.max(0,Math.floor(n));return `${Math.floor(v/3600).toString().padStart(3,'0')}:${Math.floor(v%3600/60).toString().padStart(2,'0')}:${(v%60).toString().padStart(2,'0')}`;};
const wrapError=(a:number,b:number)=>{const d=Math.abs((a+360)%360-(b+360)%360);return Math.min(d,360-d);};
const signedAngleDifference=(a:number,b:number)=>((a-b+540)%360)-180;

export class CampaignController {
 private client=new WorkerClient(); private decoder=new DskyDecoder(); private narrator=new CommandNarrator(); private cue=new TranscriptCuePlayer();
 private dsky=document.createElement('apollo-dsky') as DskyView;
 private chapterIndex=0; private taskIndex=0; private chosen=false; private busy=true; private complete=false; private paused=false;
 private flight?:FlightState; private imu=[0,0,0]; private cycle=0; private getOffset=0; private lastElapsed=0;
 private expectedRead=''; private readAt=0; private submitted:number[]=[]; private loading=''; private reportValues:number[]=[];
 private stable=0; private burnStarted=false; private wasFiring=false; private ignitionError=0; private assistance=0; private mistakes=0;
 private logLines:{kind:string;text:string}[]=[]; private loaded:Record<string,number[]>={}; private throttle=.1; private expert=false;
 private alignmentDeviation=false; private targetEvaluated=false;
 private completed=new Set<string>();
 private audio=new CockpitAudio();private warning=new CautionWarning();private muted=false;private fine=true;private inspected=false;private batteryAcknowledged=false;
 private motion=!matchMedia('(prefers-reduced-motion: reduce)').matches;private entryPhase='';private blackout=false;private lastBankGuide=-1;
 constructor(){
  el('dsky-mount').append(this.dsky);
  this.dsky.addEventListener('dsky-key',event=>{const detail=(event as CustomEvent<{key:AgcKey;down:boolean}>).detail;this.key(detail.key,detail.down);});
  this.client.addEventListener('message',event=>this.message((event as CustomEvent<WorkerResponse>).detail));
  this.client.addEventListener('error',event=>this.log('CAUTION',(event as CustomEvent<string>).detail));
  try{this.completed=new Set(JSON.parse(localStorage.getItem('apollo-campaign-complete')??'[]'));}catch{}
  this.buildMenu(); this.bind();
  this.client.start(new URL('wasm/yaAGC.wasm',document.baseURI).href,new URL('roms/LM131R1.bin',document.baseURI).href,'Apollo 13 LM131R1');
 }
 private get chapter(){return campaign[this.chapterIndex];}
 private get task():CampaignTask|undefined{return this.complete?undefined:this.chapter.tasks[this.taskIndex];}
 private buildMenu(){
  el('mission-options').innerHTML=campaign.map((chapter,index)=>`<button data-chapter="${index}"><span>${index===0?'ONE TRAINING SORTIE':`APOLLO 13 · ${getTime(chapter.epoch)} GET · DIFFICULTY ${chapter.difficulty}`}${this.completed.has(chapter.id)?' · COMPLETED':''}</span><b>${chapter.title}</b><p>${chapter.briefing}</p></button>`).join('');
  el('mission-options').querySelectorAll<HTMLButtonElement>('button').forEach(button=>button.onclick=()=>{this.choose(Number(button.dataset.chapter));el<HTMLDialogElement>('mission-menu').close();});
 }
 private bind(){
  el('missions-btn').onclick=()=>el<HTMLDialogElement>('mission-menu').showModal();
  el('close-menu').onclick=()=>el<HTMLDialogElement>('mission-menu').close();
  const enableAudio=()=>{void this.audio.enable().then(()=>el('sound-btn').textContent='SOUND: ON').catch(()=>el('sound-btn').textContent='SOUND: UNAVAILABLE');};
  window.addEventListener('pointerdown',event=>{if(!this.muted&&!this.audio.enabled&&(event.target as HTMLElement).id!=='sound-btn')enableAudio();},{once:true});
  window.addEventListener('keydown',()=>{if(!this.muted&&!this.audio.enabled)enableAudio();},{once:true});
  el('sound-btn').textContent='SOUND: ENABLE';el('sound-btn').onclick=()=>{if(this.audio.enabled&&!this.muted){this.muted=true;this.audio.mute();el('sound-btn').textContent='SOUND: OFF';this.cue.stop();}else{this.muted=false;enableAudio();}};
  el('motion-btn').textContent=`VIBRATION: ${this.motion?'ON':'OFF'}`;
  el('motion-btn').onclick=()=>{this.motion=!this.motion;el('motion-btn').textContent=`VIBRATION: ${this.motion?'ON':'OFF'}`;};
  el('fine-btn').textContent='FINE: ON';el('fine-btn').onclick=()=>{[0,1,2].forEach(axis=>this.client.rcs(axis,0));this.fine=!this.fine;el('fine-btn').textContent=`FINE: ${this.fine?'ON':'OFF'}`;};
  el('master-alarm').onclick=()=>{this.warning.acknowledge();if(this.warning.has('BATTERY 2'))this.batteryAcknowledged=true;this.log('C&W','Master alarm acknowledged. The attention tone is silenced; active fault indicators remain until the condition clears.');this.renderWarnings();};
  el('inspect-btn').onclick=()=>{this.inspected=true;this.log('ENGINEERING','Battery 2: the mission report identifies this intermittent indication as a false malfunction. No battery shutdown has been commanded. Acknowledge the master alarm; the persistent indicator is not proof of a repaired fault.');};
  const deviation=document.createElement('button');deviation.id='deviation-btn';deviation.textContent='ACCEPT DEVIATION / USE MY DATA';deviation.hidden=true;deviation.onclick=()=>{if(this.task?.kind!=='read')return;const noun=this.task.noun!;if(noun==='33'&&validIgnitionTime(this.loaded[noun])===undefined)return;this.log('NAVIGATION',`You explicitly accepted the actual N${noun} data. This maneuver may depart from the Apollo 13 plan.`);this.nextTask();};document.querySelector('.source-actions')!.append(deviation);
  el('entry-warp-btn').onclick=()=>{const current=Number(el('entry-warp-btn').dataset.factor??1);const next=current===1?4:current===4?16:1;el('entry-warp-btn').dataset.factor=String(next);el('entry-warp-btn').textContent=`TIME ${next}×`;this.client.warp(next);};
  const fullscreen=document.createElement('button');fullscreen.textContent='FULLSCREEN';fullscreen.className='fullscreen-button';fullscreen.onclick=()=>void document.documentElement.requestFullscreen().catch(()=>this.log('SYSTEM','Fullscreen is unavailable in this embedding. Use the itch.io fullscreen control.'));document.querySelector('.game-footer')!.append(fullscreen);
  el('restart-button').onclick=()=>this.choose(this.chapterIndex);
  el('pause-button').onclick=()=>{this.paused=!this.paused;this.client.pause(this.paused);el('pause-button').textContent=this.paused?'Resume':'Pause';this.renderFlight();};
  el('expert-btn').onclick=()=>{this.expert=!this.expert;el('expert-btn').textContent=this.expert?'EXPERT: ON':'EXPERT: OFF';el('game').classList.toggle('expert-mode',this.expert);this.renderTask();};
  el('flightbag-btn').onclick=()=>this.openBag();el('close-bag').onclick=()=>el<HTMLDialogElement>('flight-bag').close();
  const reference=document.createElement('details');reference.className='routine-reference';reference.innerHTML='<summary>DSKY entry and readback routines</summary><p>V06 Nxx ENTR reads three decimal components. V16 Nxx ENTR monitors them. V25 Nxx ENTR opens a three-component decimal load; enter a sign and five digits, then ENTR for each component. N33: hours, minutes, hundredths of a second. N81: signed X/Y/Z velocity components in tenths of a foot per second. N20: measured gimbal angles. N22: desired angle targets. CLR clears the current entry. V41 N20 starts coarse platform alignment; consult ACT 30 for the transformation.</p>';el('flight-bag').querySelector('header')!.after(reference);
  el('manual-btn').onclick=()=>this.openBag(this.task?.manual??'dictionary');
  el('radio-btn').onclick=()=>this.radio();
  const stopRadio=document.createElement('button');stopRadio.textContent='STOP RADIO';stopRadio.id='stop-radio';stopRadio.onclick=()=>{this.cue.stop();el('radio-status').textContent='Radio stopped.';};document.querySelector('.source-actions')!.append(stopRadio);
  el('archive-btn').onclick=()=>{if(this.chapter.archive)this.cue.preview(this.chapter.archive,message=>el('radio-status').textContent=message);};
  el('repeat-btn').onclick=()=>{this.assistance++;el('written-radio').textContent=this.task?.radio??this.task?.prompt??'';el('written-radio').hidden=false;};
  el('hint-btn').onclick=()=>{this.assistance++;const task=this.task;if(!task)return;const command=task.kind==='align'?'V41 N20 ENTR':task.kind==='load'?`V25 N${task.noun} ENTR`:task.kind==='read'?`V${task.verb??'06'} N${task.noun} ENTR`:'';el('written-radio').textContent=(command||task.prompt)+(task.values?' → '+task.values.map(value=>signed(value)+' ENTR').join(' → '):'');el('written-radio').hidden=false;};
  el('report-form').onsubmit=event=>{event.preventDefault();this.report();};
  el('mark-btn').onclick=()=>{this.reportValues=this.displayValues();this.log('MARK',`Captured panel: ${this.reportValues.map(signed).join(' / ')}. Report this snapshot, including signs.`);};
  el('ignite-btn').onclick=()=>{if(this.task?.kind!=='burn'||this.busy||this.flight?.firing)return;if(this.targetIgnition()===undefined){this.log('CAUTION','Ignition blocked: N33 contains no valid ignition time. Load and verify hours, minutes and hundredths of a second.');return;}this.burnStarted=true;this.ignitionError=this.get()-this.chapter.ignition!;this.client.engine(true,this.chapter.propulsion==='rcs'?1:this.throttle);this.log(this.chapter.propulsion==='rcs'?'RCS':'DPS',`Firing commanded at GET ${getTime(this.get())}. ${this.chapter.propulsion==='rcs'?'Balanced translation jets':Math.round(this.throttle*100)+'% thrust'}. Watch the burn clock and attitude.`);};
  el('cutoff-btn').onclick=()=>{this.client.engine(false);this.log(this.chapter.propulsion==='rcs'?'RCS':'DPS','Shutdown commanded. Checking delivered impulse and burn duration.');};
  document.querySelectorAll<HTMLButtonElement>('[data-throttle]').forEach(button=>button.onclick=()=>{this.throttle=Number(button.dataset.throttle);this.client.engine(this.flight?.firing??false,this.throttle);this.log('DPS',`Throttle selected: ${Math.round(this.throttle*100)}%.`);});
  el('warp-btn').onclick=()=>{const factor=el('warp-btn').textContent?.includes('1×')?4:1;this.client.warp(factor);el('warp-btn').textContent=`TIME ${factor}×`;};
  el('continue-btn').onclick=()=>this.choose(Math.min(campaign.length-1,this.chapterIndex+1));
  document.querySelectorAll<HTMLButtonElement>('[data-rcs]').forEach(button=>{const [axis,direction]=button.dataset.rcs!.split(',').map(Number);button.onpointerdown=event=>{button.setPointerCapture(event.pointerId);this.rcs(axis,direction);};button.onpointerup=()=>this.rcs(axis,0);button.onpointercancel=()=>this.rcs(axis,0);button.onlostpointercapture=()=>this.rcs(axis,0);});
  const controls:Record<string,[number,number]>={q:[0,-1],e:[0,1],ArrowUp:[1,1],ArrowDown:[1,-1],ArrowLeft:[2,-1],ArrowRight:[2,1]};
  window.addEventListener('keydown',event=>{
   if(document.querySelector('dialog[open]')||event.target instanceof HTMLInputElement||event.ctrlKey||event.metaKey||event.altKey)return;
   const control=controls[event.key];if(control){event.preventDefault();if(!event.repeat)this.rcs(...control);return;}
   if(event.repeat)return;const key=this.keyboard(event);if(key){event.preventDefault();this.key(key,true);}
  });
  window.addEventListener('keyup',event=>{const control=controls[event.key];if(control)this.rcs(control[0],0);if(event.code==='Space')this.key('PRO',false);});
  window.addEventListener('blur',()=>{[0,1,2].forEach(axis=>this.rcs(axis,0));this.client.key('PRO',false);});
 }
 private choose(index:number){
  this.chosen=true;this.chapterIndex=index;this.taskIndex=0;this.complete=false;this.busy=true;this.expectedRead='';this.loading='';this.submitted=[];this.loaded={};this.logLines=[];this.assistance=0;this.mistakes=0;this.stable=0;this.burnStarted=false;this.wasFiring=false;this.lastElapsed=0;this.throttle=.1;this.getOffset=this.chapter.id==='manual-burn'?104*3600+33*60:this.chapter.epoch;
  this.alignmentDeviation=false;this.targetEvaluated=false;this.cue.stop();this.narrator.reset();this.decoder=new DskyDecoder();this.dsky.reset();this.warning.reset();this.inspected=false;this.batteryAcknowledged=false;this.entryPhase='';this.blackout=false;this.lastBankGuide=-1;
  document.getElementById('ship-plane')!.innerHTML=spacecraftMarkup(this.chapter.vehicle??'stack');
  el('computer-location').textContent=this.chapter.rom==='Manche72R3'?'ODYSSEY / CM GUIDANCE COMPUTER':'AQUARIUS / LM GUIDANCE COMPUTER';
  document.querySelector('.mission-stamp strong')!.textContent=`${this.chapter.rom??'LM131R1'} / ORIGINAL ROM`;
  el('vehicle-title').textContent=this.chapter.vehicle==='cm'?'Odyssey / CM only':'Odyssey + Aquarius';el('vehicle-configuration').textContent=this.chapter.vehicle==='cm'?'CM ONLY / SM + LM JETTISONED':'CM APEX ↔ LM ROOF / DOCKED';
  el('chapter-label').textContent=this.chapter.title;el('chapter-title').textContent=this.chapter.title;el('stakes').textContent=this.chapter.stakes;el('continue-btn').hidden=true;el('warp-btn').textContent='TIME 1×';
  el('computer-state').textContent='Preparing mission state…';
  this.client.restart(this.chapter.initialAngles,{attitude:this.chapter.body,rates:this.chapter.rates,vehicle:this.chapter.vehicle==='cm'?'cm':'lm',propulsion:this.chapter.propulsion,massKg:this.chapter.massKg},this.chapter.rom);this.client.pause(false);this.paused=false;el('pause-button').textContent='Pause';
  this.log('MISSION',this.chapter.briefing);this.enterTask();
 }
 private message(message:WorkerResponse){
  if(message.type==='key-processed'){if(!this.busy){this.cycle=message.cycle;this.interpret(message.key);}return;}
  if(message.type==='ready'){el('engine-version').textContent=message.engineVersion;if(!this.chosen){const next=campaign.findIndex(chapter=>!this.completed.has(chapter.id));this.choose(next<0?1:next);}return;}
  if(message.type==='preparing'){this.busy=true;el('computer-state').textContent='Preparing mission state…';return;}
  if(message.type==='error'){this.busy=true;this.log('CAUTION',message.message);el('computer-state').textContent='Computer unavailable / restart mission';return;}
  if(message.type==='restarted'){this.decoder=new DskyDecoder();this.dsky.reset();this.narrator.reset();this.busy=false;el('computer-state').textContent='Mission live / computer online';return;}
  if(message.type!=='frame')return;
  el('input-state').textContent=message.pendingKeys?'KEYBOARD BUFFERING · WAIT FOR COMPUTER':'KEYBOARD READY';
  this.cycle=message.cycle;this.imu=message.imuAngles;
  for(const output of message.events){this.decoder.apply(output.channel,output.value);this.dsky.applyChannel(output.channel,output.value);if(output.channel===0o13&&(output.value&0o1000)&&this.task?.kind==='lamp'&&!this.busy){this.log('AGC','The real lamp-test relay is on. Check the panel illumination.');this.nextTask();}}
  if(message.flight){const dt=Math.max(0,message.flight.elapsed-this.lastElapsed);this.flight=message.flight;this.lastElapsed=this.flight.elapsed;if(!this.busy)this.evaluateTask(dt);}
  el('erasable-hash').textContent=message.erasableHash;el('cycle-readout').textContent=`AGC ${message.cycle.toString().padStart(8,'0')}`;this.renderFlight();
 }
 private key(key:AgcKey,down=true){
  if(this.busy)return;this.client.key(key,down);
 }
 private interpret(key:AgcKey){
  const meaning=this.narrator.accept(key);if(!meaning)return;
  this.log(meaning.kind,meaning.message);
  if(meaning.command){el('computer-state').textContent=`${meaning.command} / awaiting computer response`;if(meaning.command.startsWith('V06')||meaning.command.startsWith('V16')){this.expectedRead=meaning.command;this.readAt=this.cycle;}if(meaning.command.startsWith('V25')||meaning.command==='V41 N20'){this.loading=meaning.command;this.submitted=[];this.targetEvaluated=false;}}
  if(meaning.component!==undefined&&meaning.value!==undefined){this.submitted[meaning.component]=meaning.value;if(meaning.component===2&&this.task?.kind==='load'&&this.loading===`V25 N${this.task.noun}`){this.log('PAD','Three components submitted. Verify the stored values before trusting this load.');this.nextTask();}}
 }
 private evaluateTask(dt:number){
  const task=this.task;if(!this.flight)return;
  if(!this.targetEvaluated&&this.loading==='V41 N20'&&this.submitted.length===3&&this.imu.every((value,index)=>wrapError(value,this.submitted[index]/100)<.10)){const reference=this.chapter.tasks.find(item=>item.kind==='align')?.values;if(reference)this.alignmentDeviation=reference.some((value,index)=>Math.abs(value-this.submitted[index])>5);this.targetEvaluated=true;}
  if(this.expectedRead&&this.cycle-this.readAt>35000){
   const panel=this.decoder.snapshot();if(`V${panel.verb} N${panel.noun}`===this.expectedRead&&panel.registers.every(value=>/^\d{5}$/.test(value))){
    const values=this.displayValues();this.loaded[panel.noun]=values;this.log('AGC',this.meaning(panel.noun,values));el('computer-state').textContent=`V${panel.verb} N${panel.noun} / computer readback confirmed`;this.expectedRead='';
    if(task?.kind==='read'&&task.noun===panel.noun){
     const prior=this.chapter.tasks.slice(0,this.taskIndex).reverse().find(item=>item.noun===task.noun&&item.values);
     if(prior?.values&&!padMatches(task.noun!,values,prior.values)){this.mistakes++;this.log('CAUTION',`Stored N${task.noun} is ${values.map(signed).join(' / ')}; Houston supplied ${prior.values.map(signed).join(' / ')}. The operation is NOT verified. Re-enter V25 N${task.noun}, correct all three components, then V06 N${task.noun} ENTR.`);el('task-state').textContent='PAD NOT VERIFIED / CORRECT AND READ BACK';el('deviation-btn').hidden=task.noun==='33'&&validIgnitionTime(values)===undefined;return;}
     this.nextTask();return;
    }
   }
  }
  if(!task)return;
  if(task.kind==='systems'){if(this.inspected&&this.batteryAcknowledged){this.log('C&W','Warning identified and acknowledged. The battery indication remains visible; keep monitoring rather than removing healthy power.');this.nextTask();}return;}
  if(task.kind==='entry'&&this.flight.entry){const entry=this.flight.entry;
   if(entry.bankTarget!==this.lastBankGuide){this.lastBankGuide=entry.bankTarget;this.log('MODEL BANK GUIDE',entry.bankTarget===90?'Bank toward 90° to turn lift sideways and remove energy. Counterthrust to arrest roll. This is the reduced model’s guide, not an AGC command.':'Return toward 0° bank for lift-up. Arrest roll with counterthrust. Watch deceleration and altitude.');}
   if(entry.blackout!==this.blackout){this.blackout=entry.blackout;this.log('COMMS',entry.blackout?'Ionization blackout in the entry model. Guidance and local instruments remain available.':'Radio path recovered as modeled velocity and ionization decrease.');}
   if(entry.phase!==this.entryPhase){this.entryPhase=entry.phase;if(entry.phase==='chutes'||entry.phase==='skipout'){
    if(entry.phase==='skipout'||entry.peakG>10)this.mistakes+=3;
    this.log('ENTRY RESULT',`${entry.phase==='chutes'?'Modeled parachute transition below 3 km':'Modeled skip-out'}. Peak deceleration ${entry.peakG.toFixed(2)} g; ground distance ${(entry.range/1000).toFixed(0)} km. This is a reduced model result, not an Apollo landing prediction.`);this.nextTask();return;
   }}
   el('task-state').textContent=`MODEL BANK GUIDE ${entry.bankTarget}° / ACTUAL ${signedAngleDifference(this.flight.attitude[0],0).toFixed(1)}° · PEAK ${entry.peakG.toFixed(2)} g · ${entry.blackout?'BLACKOUT / LOCAL GUIDANCE LIVE':'LOCAL GUIDANCE LIVE'}`;return;
  }
  if(task.kind==='align'&&this.loading==='V41 N20'&&this.submitted.length===3&&this.imu.every((value,index)=>wrapError(value,this.submitted[index]/100)<.10)){
   const error=task.values!.some((value,index)=>Math.abs(value-this.submitted[index])>5);if(error){this.mistakes++;this.log('CAUTION','The platform reached your alternate targets, but they do not match the ACT 30 solution. This run has departed from the documented alignment.');}else this.log('AGC','Encoder feedback confirms the platform reached the calculated targets.');this.nextTask();return;
  }
  if(task.kind==='rates'){
   const rates=this.flight.rates;const ptc=this.chapter.id==='ptc';const good=ptc?Math.abs(rates[0]-.30)<.08&&Math.abs(rates[1])<.07&&Math.abs(rates[2])<.07:rates.every(value=>Math.abs(value)<.04);
   this.stable=good?this.stable+dt:0;el('task-state').textContent=`RATE HOLD ${this.stable.toFixed(1)} / ${ptc?8:5} s · release preserves rotation; counterthrust stops it`;
   if(this.stable>=(ptc?8:5)){this.log('RCS',ptc?'Controlled slow roll established. The sunlight will sweep around the stack.':'Unwanted rotation arrested. The visual reference is steady enough for the manual correction.');this.nextTask();}return;
  }
  if(task.kind==='burn'){
   if(this.burnStarted&&this.wasFiring&&!this.flight.firing){this.finishBurn();return;}
   this.wasFiring=this.flight.firing;
   const target=this.targetIgnition(),remaining=target===undefined?undefined:target-this.get();
   el('task-state').textContent=this.flight.firing?`BURN ${this.flight.burnSeconds.toFixed(1)} / ${this.chapter.duration!.toFixed(2)} s · SHUTDOWN IS YOUR RESPONSIBILITY`:remaining===undefined?'IGNITION BLOCKED / LOAD AND VERIFY N33':remaining<0?`IGNITION WINDOW MISSED / ${Math.abs(remaining).toFixed(1)} s late · restart chapter or accept a late maneuver`:`PAD IGNITION IN ${remaining.toFixed(1)} s · select thrust, then ignite`;
   if(this.flight.burnSeconds>this.chapter.duration!+20){this.client.engine(false);this.log('CAUTION','Burn exceeded the scenario limit. Emergency shutdown commanded.');}
  }
 }
 private nextTask(){this.taskIndex++;if(this.taskIndex>=this.chapter.tasks.length){this.finish();return;}this.enterTask();}
 private enterTask(){
  this.stable=0;this.expectedRead='';this.submitted=[];this.loading='';el('written-radio').hidden=true;el('deviation-btn').hidden=true;const task=this.task;if(!task)return;
  if(task.kind==='report')this.reportValues=this.displayValues();
  if(task.kind==='burn'&&this.flight){const target=this.targetIgnition();if(target!==undefined)this.getOffset=target-10-this.flight.elapsed;this.burnStarted=false;this.wasFiring=false;this.client.warp(1);el('warp-btn').textContent='TIME 1×';this.log('TIME JUMP',`Preparation complete. Advancing to ten seconds before ${this.loaded['33']?'the verified/accepted onboard ignition time':'the documented ignition window'}.`);}
  if(task.kind==='entry'&&this.flight){this.getOffset=142*3600+40*60+46-this.flight.elapsed;this.client.entry();this.client.warp(1);el('entry-warp-btn').textContent='TIME 1×';el('entry-warp-btn').dataset.factor='1';this.log('ENTRY','Time jump to the final PAD’s entry interface. CM only. The local lifting-entry model is active; the original CM computer retains your entry targets and live angle counters. P61–P67 has not been restored.');}
  this.log('OBJECTIVE',task.title);this.renderTask();
 }
 private renderTask(){
  const task=this.task;if(!task)return;
  el('task-source').textContent={direct:'HOUSTON / DIRECT INSTRUCTION',manual:'FLIGHT BAG / CONSULT THE SCAN',radio:'COMMS CARD / COPY THE NUMBERS',panel:'DSKY / TRANSMIT A READBACK'}[task.source];
  el('task-title').textContent=task.title;el('task-instruction').textContent=task.prompt;el('task-state').textContent=`OPERATION ${this.taskIndex+1} OF ${this.chapter.tasks.length}`;
  el('radio-btn').hidden=task.source!=='radio';el('repeat-btn').hidden=task.source!=='radio';el('manual-btn').hidden=task.source!=='manual';el('archive-btn').hidden=!this.chapter.archive;el('report-form').hidden=task.kind!=='report';el('burn-controls').hidden=task.kind!=='burn';
  el('stop-radio').hidden=task.source!=='radio'&&!this.chapter.archive;
  el('inspect-btn').hidden=task.kind!=='systems';el('entry-controls').hidden=task.kind!=='entry';
  const translation=this.chapter.propulsion==='rcs';el('ignite-btn').textContent=translation?'RCS TRANSLATE':'IGNITE DPS';el('cutoff-btn').textContent=translation?'STOP TRANSLATION':'ENGINE SHUTDOWN';el('burn-controls').querySelector('span')!.textContent=translation?'LM RCS / BALANCED TRANSLATION':'DPS / MANUAL ENGINE CONTROLS';el('burn-controls').querySelector('div')!.hidden=translation;
  el('rcs-controls').hidden=this.chapterIndex===0;el('hint-btn').hidden=this.expert;el('task-instruction').classList.toggle('expert-hidden',this.expert&&task.source!=='direct');
 }
 private displayValues(){const panel=this.decoder.snapshot();return panel.registers.map((value,index)=>Number(value)*(panel.signs[index]==='−'?-1:1));}
 private report(){
  if(this.task?.kind!=='report')return;
  const raw=[0,1,2].map(index=>el<HTMLInputElement>(`report-${index}`).value.replace('−','-'));
  const values=raw.map(Number);
  if(raw.some(value=>!(/^[+-]?\d{5}$/).test(value))||values.some((value,index)=>!Number.isFinite(value)||Math.abs(value-this.reportValues[index])>1)){this.mistakes++;this.log('RADIO','Houston cannot verify that readback. Check the sign and all five digits. MARK captures the panel if you need a fresh snapshot.');return;}
  this.log('RADIO',`Houston confirms your readback: ${values.map(signed).join(' / ')}.`);[0,1,2].forEach(index=>el<HTMLInputElement>(`report-${index}`).value='');this.nextTask();
 }
 private finishBurn(){
  const flight=this.flight!;const reference=new SpacecraftDynamics({attitude:this.chapter.body,rates:[0,0,0],massKg:this.chapter.massKg,propulsion:this.chapter.propulsion});const duration=this.chapter.duration!;const profile=this.chapter.throttleProfile!;
  for(let elapsed=0;elapsed<duration;elapsed+=.02){const throttle=elapsed<profile[0]?profile[1]:(profile.length>3&&elapsed>=profile[3]?profile[4]:profile[2]);reference.engine(true,throttle);reference.step(Math.min(.02,duration-elapsed));}
  const target=reference.snapshot().deltaV[0];const residual=Math.hypot(flight.deltaV[0]-target,flight.deltaV[1],flight.deltaV[2]);
  const durationError=Math.abs(flight.burnSeconds-duration);if(durationError>1||residual>target*.12||Math.abs(this.ignitionError)>4)this.mistakes+=3;
  this.log('BURN RESULT',`Duration ${flight.burnSeconds.toFixed(2)} s (${(flight.burnSeconds-duration)>=0?'+':''}${(flight.burnSeconds-duration).toFixed(2)} s). Ignition offset ${this.ignitionError.toFixed(2)} s. Modeled ΔV ${Math.hypot(...flight.deltaV).toFixed(2)} m/s; residual to nominal profile ${residual.toFixed(2)} m/s. Propellant used ${flight.propellantUsedKg.toFixed(1)} kg.`);
  this.nextTask();
 }
 private finish(){
  this.complete=true;const unresolved=this.alignmentDeviation||this.chapter.tasks.filter(task=>task.kind==='load').some(task=>!this.loaded[task.noun!]||!padMatches(task.noun!,this.loaded[task.noun!],task.values!));let score=Math.max(0,100-this.mistakes*15);if(unresolved){score=Math.min(40,score);this.log('NAVIGATION','Unresolved guidance discrepancy. The flight computer still contains data that differ from Houston’s maneuver plan. This run cannot be counted as a verified historical maneuver.');}if(score>=70)this.completed.add(this.chapter.id);try{localStorage.setItem('apollo-campaign-complete',JSON.stringify([...this.completed]));}catch{}
  el('task-title').textContent=score>=70?'Houston has your result':'Off the documented plan';el('task-source').textContent='MISSION DEBRIEF';el('task-instruction').textContent=`Performance ${score}/100. ${score<70?'The operation is unresolved. Review the actual data and maneuver residual, then restart this chapter.':this.mistakes?'Objectives complete with corrections; review the event console.':'All objectives confirmed by computer, instrument or control-state feedback.'}${this.assistance?` Written repeats / assistance: ${this.assistance}. No score penalty.`:''}`;el('task-state').textContent=score>=70?'CHAPTER COMPLETE':'RETRY / CORRECTION REQUIRED';el('continue-btn').hidden=score<70||this.chapterIndex>=campaign.length-1;el('report-form').hidden=true;el('burn-controls').hidden=true;el('entry-controls').hidden=true;this.log('DEBRIEF',el('task-instruction').textContent!);this.buildMenu();
 }
 private renderFlight(){
  const flight=this.flight;if(!flight)return;
  this.renderWarnings();
  el('mission-time').textContent=getTime(this.get());el('burn-time').textContent=flight.burnSeconds.toFixed(1)+' s';el('thrust-value').textContent=flight.firing?Math.round(flight.throttle*100)+'%':'OFF';el('dv-value').textContent=Math.hypot(...flight.deltaV).toFixed(2)+' m/s';el('prop-value').textContent=flight.propellantUsedKg.toFixed(1)+' kg';
  flight.rates.forEach((rate,index)=>el(`rate-${index}`).textContent=(rate>=0?'+':'')+rate.toFixed(3)+'°/s');
  this.imu.forEach((angle,index)=>{el(`imu-value-${index}`).textContent=angle.toFixed(2)+'°';document.getElementById(`imu-needle-${index}`)?.setAttribute('transform',`rotate(${angle} 60 60)`);});
  const roll=flight.attitude[0];const pitch=wrapError(flight.attitude[1],this.chapter.body[1]);const yaw=wrapError(flight.attitude[2],this.chapter.body[2]);
  document.getElementById('ship-plane')?.setAttribute('transform',`translate(200 120) rotate(${roll}) scale(${Math.max(.45,Math.cos(pitch*Math.PI/180))} ${Math.max(.45,Math.cos(yaw*Math.PI/180))}) translate(-200 -120)`);
  document.getElementById('earth-reference')?.setAttribute('transform',`translate(${signedAngleDifference(flight.attitude[2],this.chapter.body[2])*3} ${signedAngleDifference(flight.attitude[1],this.chapter.body[1])*3})`);
  document.querySelectorAll<SVGElement>('.engine-plume').forEach(plume=>plume.style.opacity=flight.firing&&flight.propulsion==='dps'?String(.3+flight.throttle*.7):'0');
  document.querySelectorAll<SVGElement>('.axial-rcs').forEach(jets=>jets.style.opacity=flight.firing&&flight.propulsion==='rcs'?'1':'0');
  document.querySelectorAll<SVGElement>('[data-jet]').forEach(jet=>{const [axis,sign]=jet.dataset.jet!.split(',').map(Number);jet.style.opacity=Math.sign(flight.rcs[axis])===sign?'1':'0';});
  el('flight-scene').style.transform=`translateY(${flight.vibration.toFixed(3)}px)`;el('flight-scene').classList.toggle('engine-active',flight.firing);
  el('thrust-label').textContent='DPS / RCS THRUST';el('clock-label').textContent='BURN CLOCK';el('dv-label').textContent='MODELED ΔV';el('prop-label').textContent='PROP USED';
  el('hold-progress').textContent=this.task?.kind==='rates'?`HOLD ${this.stable.toFixed(1)} s`:flight.firing?`${flight.propulsion==='rcs'?'RCS TRANSLATION':'DPS'} FIRING`:flight.rcs.some(value=>value!==0)?'RCS FIRING':'COAST / ANGULAR MOMENTUM CONSERVED';
  el('scene-status').textContent=this.chapter.vehicle==='cm'?'CM RCS / ENTRY':flight.firing?(flight.propulsion==='rcs'?'BALANCED RCS TRANSLATION':'DPS FIRING'):'LM RCS + DPS';
  const entry=flight.entry;
  if(entry){el('thrust-label').textContent='ALT';el('thrust-value').textContent=(entry.altitude/1000).toFixed(2)+' km';el('clock-label').textContent='VI';el('burn-time').textContent=entry.velocity.toFixed(0)+' m/s';el('dv-label').textContent='DECEL';el('dv-value').textContent=entry.dragG.toFixed(2)+' g';el('prop-label').textContent='COMMS';el('prop-value').textContent=entry.blackout?'BLACKOUT':'LOCK';el('entry-status').textContent=`BANK ${signedAngleDifference(flight.attitude[0],0).toFixed(1)}° · ${(entry.range/1000).toFixed(0)} km traveled`;el('scene-status').textContent=entry.phase.toUpperCase();
   document.querySelector<SVGElement>('.entry-plasma')!.style.opacity=String(entry.phase==='entry'?Math.min(1,entry.dragG*.3):0);document.querySelector<SVGElement>('.entry-chutes')!.style.opacity=entry.phase==='chutes'||entry.phase==='landed'?'1':'0';el('hold-progress').textContent=entry.blackout?'BLACKOUT / GUIDANCE LIVE':`${entry.phase.toUpperCase()} · PEAK ${entry.peakG.toFixed(2)} g`;
  }
  const amplitude=this.motion&&!this.paused?Math.min(2.5,(flight.firing?.5+flight.throttle:0)+(flight.rcs.some(value=>value!==0)?.25:0)+(entry?.dragG??0)*.25):0;
  (document.querySelector('.game-stage') as HTMLElement).style.translate=`${(Math.sin(flight.elapsed*53)*amplitude).toFixed(2)}px ${(Math.sin(flight.elapsed*67)*amplitude*.7).toFixed(2)}px`;
  this.audio.update(flight,this.warning.master,this.chapter.rom==='Manche72R3',this.paused||this.busy);
 }
 private renderWarnings(){
  const flight=this.flight;const conditions:string[]=[];
  if(this.chapter.id==='battery-warning')conditions.push('BATTERY 2');
  if(flight?.rates.some(value=>Math.abs(value)>1))conditions.push('ATT RATE');
  if(flight?.firing&&this.chapter.duration&&flight.burnSeconds>this.chapter.duration+1)conditions.push('BURN TIME');
  if((flight?.entry?.dragG??0)>8)conditions.push('G LOAD');
  if(this.warning.set(conditions))this.log('C&W',`Master alarm: ${conditions.join(', ')}. Identify the active condition; press MASTER ALARM to acknowledge.`);
  el('master-alarm').classList.toggle('active',this.warning.master);el('master-alarm').setAttribute('aria-pressed',String(this.warning.master));
  document.querySelectorAll<HTMLElement>('[data-warning]').forEach(lamp=>lamp.classList.toggle('active',lamp.dataset.warning==='COMMS'?!!flight?.entry?.blackout:this.warning.has(lamp.dataset.warning!)));
 }
 private get(){return this.getOffset+(this.flight?.elapsed??0);}
 private targetIgnition(){return this.loaded['33']?validIgnitionTime(this.loaded['33']):this.chapter.ignition;}
 private rcs(axis:number,direction:number){if(!this.busy)this.client.rcs(axis,direction*(this.fine?.25:1));}
 private radio(){const task=this.task;if(!task)return;el('written-radio').textContent=task.radio??task.prompt;el('written-radio').hidden=false;el('radio-status').textContent='Written comms / original audio retained only for the reviewed activation cue.';}
 private openBag(which:'activation'|'dictionary'|'cm'=this.chapter.rom==='Manche72R3'?'cm':'dictionary'){
  const manual=manuals[which];el('manual-title').textContent=`${manual.title} · ${manual.page}`;el<HTMLIFrameElement>('manual-frame').src=manual.url;el<HTMLAnchorElement>('manual-link').href=manual.url;
  el('source-notes').textContent=this.chapter.sources.join('\n')+'\n\nSimulation: short chapter jumps; representative starting drift, inertia and mass; RCS rigid-body rates and DPS thrust/mass integration. Gimbal movement is fed to the ROM through encoder inputs. This is a reduced local flight model, not a validated orbital/reentry propagator. Historical burn times and observed ΔV are reference data; the modeled ΔV and profile residual are reported separately.\n\nManual PAD entry uses V25 N33 / N81 and ROM readbacks. Complete historical P30/P40 execution with a restored state vector has not been implemented. The reviewed original activation cue is bundled locally; other comms are written. CM entry uses real Manche72R3 N61 storage plus a separate reduced lifting-entry model and game bank guide; P61-P67 guidance is not restored.';
  if(this.chapter.referenceDvFps)el('source-notes').textContent+=`\nHistorical reference ΔV: ${this.chapter.referenceDvFps} ft/s; burn ${this.chapter.duration} s.`;
  el<HTMLDialogElement>('flight-bag').showModal();
 }
 private meaning(noun:string,values:number[]){if(noun==='61')return `CM entry target: latitude ${(values[0]/100).toFixed(2)}°, longitude ${(values[1]/100).toFixed(2)}°; ${values[2]===-1?'lift vector UP':values[2]===1?'lift vector DOWN':'invalid lift selection'}. Stored by the actual CM ROM.`;if(noun==='33')return `Stored ignition time ${values[0]} h ${values[1]} min ${(values[2]/100).toFixed(2)} s.`;if(noun==='81')return `Stored maneuver velocity: X ${(values[0]/10).toFixed(1)}, Y ${(values[1]/10).toFixed(1)}, Z ${(values[2]/10).toFixed(1)} ft/s.`;return `${noun==='22'?'Desired targets':'Measured gimbals'}: ${values.map(angleMeaning).join(' / ')}.`;}
 private log(kind:string,text:string){this.logLines.push({kind,text});if(this.logLines.length>12)this.logLines.shift();const log=el('event-log');log.replaceChildren(...this.logLines.map(entry=>{const item=document.createElement('li');const label=document.createElement('b');label.textContent=entry.kind;const body=document.createElement('span');body.textContent=entry.text;item.append(label,body);return item;}));log.scrollTop=log.scrollHeight;}
 private keyboard(event:KeyboardEvent):AgcKey|undefined{if(event.code==='Space')return 'PRO';if(event.key==='Enter')return 'ENTR';const key=event.key.toUpperCase();if(/^\d$/.test(key))return key as AgcKey;return ({V:'VERB',N:'NOUN','+':'PLUS','-':'MINUS',C:'CLR',K:'KEY_REL',R:'RSET'} as Record<string,AgcKey>)[key];}
}
