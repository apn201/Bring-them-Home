import { readFile } from 'node:fs/promises';

const fixture = JSON.parse(await readFile('content/scenarios/training/golden-replay.json', 'utf8'));
if (!Array.isArray(fixture.events) || fixture.events.some((event) => typeof event.key !== 'string')) throw new Error('Malformed training replay.');
console.log(`replay fixture is structurally valid (${fixture.events.length} inputs). Historical replay validation awaits G4/G5.`);
