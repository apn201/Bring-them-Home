// Lossless MPEG Layer III frame cut; keeps the user-reviewed original recording.
// Research acquisition stays local. Only this 48-second cue is redistributed.
import {open,mkdir,writeFile} from 'node:fs/promises';
const source=await open('assets/audio/414-AAA_TRACK-1.mp3','r');
const size=(await source.stat()).size;
let buffer=Buffer.alloc(262144),base=-1,available=0;
async function bytes(position,length){if(position<base||position+length>base+available){base=position;available=(await source.read(buffer,0,buffer.length,position)).bytesRead;}return buffer.subarray(position-base,position-base+length);}
function header(data){
 if(data.length<4||data[0]!==255||(data[1]&224)!==224)return;
 const version=(data[1]>>3)&3,layer=(data[1]>>1)&3,rate=data[2]>>4,sample=(data[2]>>2)&3;
 if(version===1||layer!==1||rate===0||rate===15||sample===3)return;
 const bitrate=(version===3?[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320]:[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160])[rate];
 const frequency=[44100,48000,32000][sample]/(version===3?1:version===2?2:4);
 return {length:Math.floor((version===3?144000:72000)*bitrate/frequency)+((data[2]>>1)&1),seconds:(version===3?1152:576)/frequency,frequency};
}
const start=5*3600+7*60+32,end=start+48;
const first=await bytes(0,10);let position=0;
if(first.subarray(0,3).toString()==='ID3')position=10+((first[6]&127)*2097152+(first[7]&127)*16384+(first[8]&127)*128+(first[9]&127))+((first[5]&16)?10:0);
let seconds=0,frames=0,actualStart;const selected=[];
try{
 while(position+4<size&&seconds<end){
  const frame=header(await bytes(position,4));
  if(!frame||position+frame.length>size){position++;continue;}
  const next=header(await bytes(position+frame.length,4));if(!next&&seconds===0){position++;continue;}
  if(seconds>=start){actualStart??=seconds;selected.push(Buffer.from(await bytes(position,frame.length)));frames++;}
  seconds+=frame.seconds;position+=frame.length;
 }
 if(seconds<end||!selected.length)throw Error('Original recording ended before the reviewed cue.');
 await mkdir('public/audio',{recursive:true});await writeFile('public/audio/aquarius-v41-n20.mp3',Buffer.concat(selected));
 console.log(JSON.stringify({file:'public/audio/aquarius-v41-n20.mp3',source:'414-AAA_TRACK-1.mp3',startSeconds:actualStart,endSeconds:seconds,duration:seconds-actualStart,frames,bytes:selected.reduce((n,b)=>n+b.length,0)}));
}finally{await source.close();}
