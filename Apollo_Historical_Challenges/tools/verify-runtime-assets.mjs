import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const expected = new Map([
  ['public/wasm/yaAGC.wasm', 'a595f3ad3cc6833638b49879e2d41149a7327b1a10577828f50466d6c7747f14'],
  ['public/roms/LM131R1.bin', 'ae4f9e51ac9491c3da6462233936daeffc16277cd302c43a70b8459ebcd6cca5'],
  ['public/roms/Manche72R3.bin', '420548f25ce95c2ab36c4c7c0505dc17c3ab77840eb9d5f9a5aecc968bb40b02'],
  ['public/audio/aquarius-v41-n20.mp3','e53630a3c41a91b2aece69069dc256f93a855ddd283c64a42a952c7818cdd6ac'],
]);

for (const [file, digest] of expected) {
  const actual = createHash('sha256').update(await readFile(file)).digest('hex');
  if (actual !== digest) throw new Error(`${file}: expected ${digest}, got ${actual}`);
  console.log(`verified ${file}`);
}
