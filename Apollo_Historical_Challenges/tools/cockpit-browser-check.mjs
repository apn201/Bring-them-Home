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
  await waitFor(()=>evaluate(`document.querySelector('#computer-state')?.textContent.includes('checkpoint ready')`),'initial platform ready');
  await evaluate(`document.querySelector('[data-mission="ptc"]').click()`);
  await waitFor(()=>evaluate(`document.querySelector('#computer-state')?.textContent.includes('checkpoint ready')`),'PTC checkpoint ready');
  const registers=()=>evaluate(`Array.from(document.querySelector('apollo-dsky').shadowRoot.querySelectorAll('[data-register]')).map(field=>field.textContent)`);
  const before=await registers();if(before.every(value=>Number(value)===0))throw Error('PTC checkpoint is zero');
  for(const key of ['VERB','1','6','NOUN','2','0','ENTR']){await evaluate(`document.querySelector('apollo-dsky').shadowRoot.querySelector('button[data-key="${key}"]').click()`);await delay(170);}
  await waitFor(()=>evaluate(`document.querySelectorAll('#training-list li.done').length===1`),'monitor confirmed by actual browser flow');
  await evaluate(`document.querySelector('#restart-button').click()`);
  await waitFor(()=>evaluate(`document.querySelector('#computer-state')?.textContent.includes('checkpoint ready')`),'exact restart checkpoint');
  const restarted=await registers();if(restarted.every(value=>Number(value)===0))throw Error('Restart lost the nonzero checkpoint');
  if(!await evaluate(`document.querySelector('#current-assignment').textContent.includes('Watch the gimbals')`))throw Error('Restart changed the assignment');
  const image=await call('Page.captureScreenshot',{format:'png'});const output=path.join(cache,'cockpit-ptc-check.png');await writeFile(output,Buffer.from(image.data,'base64'));
  if(exceptions.length)throw Error('Browser exceptions: '+exceptions.join(', '));
  console.log(JSON.stringify({before,restarted,screenshot:output,browserExceptions:exceptions,monitorStepVerified:true}));
} finally {socket?.close();browser?.kill();server.kill();}
