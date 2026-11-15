import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const expected = new Map([
  ['public/wasm/yaAGC.wasm', 'a595f3ad3cc6833638b49879e2d41149a7327b1a10577828f50466d6c7747f14'],
  ['public/roms/LM131R1.bin', 'ae4f9e51ac9491c3da6462233936daeffc16277cd302c43a70b8459ebcd6cca5'],
]);

for (const [file, digest] of expected) {
  const actual = createHash('sha256').update(await readFile(file)).digest('hex');
  if (actual !== digest) throw new Error(`${file}: expected ${digest}, got ${actual}`);
  console.log(`verified ${file}`);
}
