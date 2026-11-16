import {build} from 'vite';
import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {deflateRawSync} from 'node:zlib';
import path from 'node:path';

// A fresh staging directory avoids deleting a developer's build or research.
const staging=path.resolve('node_modules/.cache/html5-release-'+Date.now());
await build({build:{outDir:staging,emptyOutDir:false,sourcemap:false}});
const files=[];
async function collect(directory,prefix=''){
 for(const entry of (await readdir(directory,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
  const name=prefix+entry.name,absolute=path.join(directory,entry.name);
  if(entry.isDirectory())await collect(absolute,name+'/');
  else {if(!/^(index\.html|(?:THIRD_PARTY_NOTICES\.md|COPYING-GPL-2\.0\.txt)|(?:assets|images|audio|roms|wasm)\/[a-zA-Z0-9_.-]+)$/.test(name)||name.endsWith('.map'))throw Error('Non-runtime file in release: '+name);files.push({name,data:await readFile(absolute)});}
 }
}
await collect(staging);
for(const required of ['index.html','roms/LM131R1.bin','roms/Manche72R3.bin','wasm/yaAGC.wasm','images/dsky-front-dsky-v2.png','audio/aquarius-v41-n20.mp3','COPYING-GPL-2.0.txt','THIRD_PARTY_NOTICES.md'])if(!files.some(file=>file.name===required))throw Error('Missing runtime asset '+required);
const table=Array.from({length:256},(_,n)=>{let c=n;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0);return c>>>0;});
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes)crc=table[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
const local=[],central=[];let offset=0;
for(const file of files){
 const name=Buffer.from(file.name),data=deflateRawSync(file.data),crc=crc32(file.data);
 const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(8,8);header.writeUInt16LE(33,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(data.length,18);header.writeUInt32LE(file.data.length,22);header.writeUInt16LE(name.length,26);
 local.push(header,name,data);
 const record=Buffer.alloc(46);record.writeUInt32LE(0x02014b50);record.writeUInt16LE(20,4);record.writeUInt16LE(20,6);record.writeUInt16LE(8,10);record.writeUInt16LE(33,14);record.writeUInt32LE(crc,16);record.writeUInt32LE(data.length,20);record.writeUInt32LE(file.data.length,24);record.writeUInt16LE(name.length,28);record.writeUInt32LE(offset,42);central.push(record,name);offset+=header.length+name.length+data.length;
}
const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
const archive=Buffer.concat([...local,directory,end]),sha256=createHash('sha256').update(archive).digest('hex');
await mkdir('release',{recursive:true});await writeFile('release/apollo13-html5.zip',archive);await writeFile('release/apollo13-html5.sha256',sha256+'  apollo13-html5.zip\n');
let commit='unknown';try{commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();}catch{}
await writeFile('release/build-info.json',JSON.stringify({commit,sha256,bytes:archive.length,staging,files:files.map(file=>({path:file.name,bytes:file.data.length,sha256:createHash('sha256').update(file.data).digest('hex')})),externalReferences:'Flight-manual links require internet. Reviewed radio clip and all runtime assets are bundled.'},null,2)+'\n');
console.log(JSON.stringify({archive:path.resolve('release/apollo13-html5.zip'),bytes:archive.length,files:files.map(file=>file.name),sha256}));
