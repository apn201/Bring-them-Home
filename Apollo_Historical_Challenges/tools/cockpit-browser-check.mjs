// Isolated Edge/CDP smoke check. Uses separate ports/profile; never attaches to
// or reloads the player's browser. Run from the game directory with Node 22+.
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const cache=path.resolve('node_modules/.cache'); await mkdir(cache,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5186','--strictPort'],{windowsHide:true,stdio:'ignore'});
let browser; let socket;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(fn,label){for(let i=0;i<150;i++){try{const result=await fn();if(result)return result;}catch{}await delay(100);}throw Error('Timed out: '+label);}
try {
  await waitFor(async()=> (await fetch('http://127.0.0.1:5186')).ok,'isolated Vite');
  browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=9228','--user-data-dir='+path.join(cache,'edge-cockpit-'+Date.now()),'about:blank'],{windowsHide:true,stdio:'ignore'});
  const pages=await waitFor(async()=>{const response=await fetch('http://127.0.0.1:9228/json/list');return response.ok?await response.json():undefined;},'headless Edge');
  socket=new WebSocket(pages.find(page=>page.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let next=0;const pending=new Map();const exceptions=[];
  socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.method==='Runtime.exceptionThrown')exceptions.push(message.params.exceptionDetails.text);if(message.id){const request=pending.get(message.id);pending.delete(message.id);if(message.error)request.reject(Error(message.error.message));else request.resolve(message.result);}});
  const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.text);return result.result.value;};
  await call('Runtime.enable'); await call('Page.enable');await call('Emulation.setDeviceMetricsOverride',{width:1918,height:1000,deviceScaleFactor:1,mobile:false});
  await call('Page.navigate',{url:'http://127.0.0.1:5186/'});
  await waitFor(()=>evaluate(`document.querySelector('#computer-state')?.textContent.includes('Mission live')`),'initial campaign ready');
  const type=async keys=>{for(const key of keys){await evaluate(`document.querySelector('apollo-dsky').shadowRoot.querySelector('button[data-key="${key}"]').click()`);await delay(170);}};
  await type(['VERB','3','5','ENTR']);
  await waitFor(()=>evaluate(`document.querySelector('#task-title')?.textContent.includes('Read')`),'training lamp test');
  await type(['VERB','0','6','NOUN','2','0','ENTR']);
  await waitFor(()=>evaluate(`!document.querySelector('#report-form').hidden`),'readback task');
  await evaluate(`{const root=document.querySelector('apollo-dsky').shadowRoot;[0,1,2].forEach(i=>{document.querySelector('#report-'+i).value=(root.querySelector('[data-sign="'+i+'"]').textContent==='−'?'-':'+')+root.querySelector('[data-register="'+i+'"]').textContent;});document.querySelector('#report-form').requestSubmit();}`);
  await waitFor(()=>evaluate(`!document.querySelector('#continue-btn').hidden`),'one training sortie complete');
  await evaluate(`document.querySelector('[data-chapter="1"]').click()`);
  await waitFor(()=>evaluate(`document.querySelector('#computer-state')?.textContent.includes('Mission live')`),'platform transfer ready');
  await evaluate(`document.querySelector('#manual-btn').click()`);
  if(!await evaluate(`document.querySelector('#flight-bag').open&&document.querySelector('#manual-link').href.endsWith('#page=48')`))throw Error('ACT 30 scan/page missing');
  await evaluate(`document.querySelector('#close-bag').click()`);
  await type(['VERB','4','1','NOUN','2','0','ENTR']);
  for(const value of ['30243','34778','00813'])await type(['PLUS',...value,'ENTR']);
  await waitFor(()=>evaluate(`document.querySelector('#task-title').textContent==='Read the moving platform'`),'actual platform encoder feedback');
  await type(['VERB','0','6','NOUN','2','0','ENTR']);
  await waitFor(()=>evaluate(`!document.querySelector('#report-form').hidden`),'aligned platform readback');
  if(!await evaluate(`Number(document.querySelector('apollo-dsky').shadowRoot.querySelector('[data-register="0"]').textContent)>30000`))throw Error('Platform returned to zero');
  await evaluate(`document.querySelector('[data-chapter="2"]').click()`);
  await waitFor(()=>evaluate(`document.querySelector('#computer-state')?.textContent.includes('Mission live')`),'free return mission ready');
  const registers=()=>evaluate(`Array.from(document.querySelector('apollo-dsky').shadowRoot.querySelectorAll('[data-register]')).map(field=>field.textContent)`);
  const before=await registers();if(before.every(value=>Number(value)===0))throw Error('Free-return checkpoint is zero');
  for(const [noun,values] of [['33',['+00061','+00029','+04284']],['81',['-00213','+00041','-00312']]]){
   await type(['VERB','2','5','NOUN',...noun,'ENTR']);
   for(const raw of values)await type([raw[0]==='-'?'MINUS':'PLUS',...raw.slice(1),'ENTR']);
   await type(['VERB','0','6','NOUN',...noun,'ENTR']);await delay(650);
  }
  await waitFor(()=>evaluate(`!document.querySelector('#burn-controls').hidden`),'burn controls after actual PAD readbacks');
  await evaluate(`document.querySelector('#ignite-btn').click()`);await delay(900);
  if(!await evaluate(`Number.parseFloat(document.querySelector('#dv-value').textContent)>0`))throw Error('Burn did not change velocity');
  if(!await evaluate(`getComputedStyle(document.querySelector('.engine-plume')).opacity!=='0'`))throw Error('Burn plume invisible');
  const image=await call('Page.captureScreenshot',{format:'png'});const output=path.join(cache,'campaign-burn-check.png');await writeFile(output,Buffer.from(image.data,'base64'));
  await evaluate(`document.querySelector('#cutoff-btn').click()`);await waitFor(()=>evaluate(`document.querySelector('#task-source').textContent==='MISSION DEBRIEF'`),'short burn consequence debrief');
  if(!await evaluate(`document.querySelector('#task-state').textContent.includes('CORRECTION REQUIRED')&&document.querySelector('#continue-btn').hidden`))throw Error('Premature shutdown incorrectly passed the maneuver');
  // Retry with a deliberately wrong ignition hour, then correct the actual ROM
  // storage. Finish the nominal throttle profile to exercise the success path.
  await evaluate(`document.querySelector('#restart-button').click()`);
  await waitFor(()=>evaluate(`document.querySelector('#computer-state')?.textContent.includes('Mission live')`),'restart retains the selected chapter');
  const load=async(noun,values)=>{await type(['VERB','2','5','NOUN',...noun,'ENTR']);for(const raw of values)await type([raw[0]==='-'?'MINUS':'PLUS',...raw.slice(1),'ENTR']);await type(['VERB','0','6','NOUN',...noun,'ENTR']);await waitFor(()=>evaluate(`document.querySelector('#computer-state').textContent==='V06 N${noun} / computer readback confirmed'`),'N'+noun+' computer readback');};
  await load('33',['+00062','+00029','+04284']);
  if(!await evaluate(`document.querySelector('#event-log').textContent.includes('Stored data differs')`))throw Error('Wrong PAD silently accepted: '+await evaluate(`document.querySelector('#event-log').textContent`));
  await load('33',['+00061','+00029','+04284']);
  await load('81',['-00213','+00041','-00312']);
  await waitFor(()=>evaluate(`!document.querySelector('#burn-controls').hidden`),'corrected PAD authorizes burn');
  await evaluate(`document.querySelector('#warp-btn').click()`);
  await waitFor(()=>evaluate(`{const remaining=Number(document.querySelector('#task-state').textContent.match(/PAD IGNITION IN ([0-9.-]+)/)?.[1]);remaining>0&&remaining<2;}`),'ignition window');
  await evaluate(`document.querySelector('#ignite-btn').click()`);
  await waitFor(()=>evaluate(`Number.parseFloat(document.querySelector('#burn-time').textContent)>=4.9`),'minimum-throttle phase');
  await evaluate(`document.querySelector('[data-throttle="0.4"]').click()`);
  await waitFor(()=>evaluate(`Number.parseFloat(document.querySelector('#burn-time').textContent)>=34.1`),'nominal cutoff');
  await evaluate(`document.querySelector('#cutoff-btn').click()`);
  await waitFor(()=>evaluate(`document.querySelector('#task-state').textContent==='CHAPTER COMPLETE'`),'corrected PAD and successful burn');
  await evaluate(`document.querySelector('[data-chapter="3"]').click()`);await waitFor(()=>evaluate(`document.querySelector('#computer-state')?.textContent.includes('Mission live')`),'thermal control ready');
  const rateBefore=await evaluate(`document.querySelector('#rate-0').textContent`);
  if(!await evaluate(`document.querySelector('#earth-reference').transform.baseVal.getItem(0).matrix.e<30`))throw Error('Angle wrapping displaced the attitude reference');
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'e',code:'KeyE'});await delay(250);await call('Input.dispatchKeyEvent',{type:'keyUp',key:'e',code:'KeyE'});await delay(100);
  const rateAfter=await evaluate(`document.querySelector('#rate-0').textContent`);if(rateBefore===rateAfter)throw Error('RCS did not change angular velocity');
  await type(['VERB','1','6','NOUN','2','0','ENTR']);await delay(800);
  const movingBefore=await registers();await delay(1000);const movingAfter=await registers();
  if(JSON.stringify(movingBefore)===JSON.stringify(movingAfter))throw Error('Live gimbal readback did not move');
  await call('Emulation.setDeviceMetricsOverride',{width:960,height:540,deviceScaleFactor:1,mobile:false});await delay(300);
  const fits=await evaluate(`(()=>{const r=document.querySelector('#game').getBoundingClientRect();return r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight;})()`);
  if(!fits)throw Error('Embedded cockpit escapes the viewport');
  const embedded=await call('Page.captureScreenshot',{format:'png'});await writeFile(path.join(cache,'campaign-embedded-check.png'),Buffer.from(embedded.data,'base64'));
  const counts=await evaluate(`document.querySelectorAll('[data-chapter]').length`);if(counts!==6)throw Error('Campaign still contains duplicate training drills');
  if(exceptions.length)throw Error('Browser exceptions: '+exceptions.join(', '));
  console.log(JSON.stringify({trainingCompleted:true,manualPageVerified:true,platformAlignmentVerified:true,padLoadVerified:true,burnPlumeAndVelocity:true,earlyCutoffFails:true,wrongPadRetainedAndCorrected:true,nominalBurnPasses:true,liveGimbalReadback:true,embeddedViewportFits:fits,rateBefore,rateAfter,chapters:counts,screenshot:output,browserExceptions:exceptions}));
} finally {socket?.close();browser?.kill();server.kill();}
