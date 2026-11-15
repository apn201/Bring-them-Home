import { readFile } from 'node:fs/promises';

const scenario = JSON.parse(await readFile('content/scenarios/training/scenario.json', 'utf8'));
if (scenario.kind !== 'training') throw new Error('Only clearly labeled training content may be released at this stage.');
if (scenario.fidelity !== 'design-choice') throw new Error('Training fidelity must be explicitly labeled.');
console.log(`valid content: ${scenario.id}`);
