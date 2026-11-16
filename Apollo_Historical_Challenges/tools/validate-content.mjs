import { readFile } from 'node:fs/promises';

const scenario = JSON.parse(await readFile('content/scenarios/training/scenario.json', 'utf8'));
if (scenario.kind !== 'training') throw new Error('Only clearly labeled training content may be released at this stage.');
if (scenario.fidelity !== 'design-choice') throw new Error('Training fidelity must be explicitly labeled.');
const historicalDraft = JSON.parse(await readFile('content/scenarios/alignment-coarse/research-draft.json', 'utf8'));
if (historicalDraft.release !== false) throw new Error('Historical research drafts must stay unavailable until their evidence gates are complete.');
const audioCatalog = JSON.parse(await readFile('content/evidence/apollo13-audio-catalog.json', 'utf8'));
if (audioCatalog.rights !== 'Public Domain Mark 1.0') throw new Error('Apollo archive rights marker must be retained.');
if (!audioCatalog.transcripts.some((source) => source.id === 'as13-tec' && source.role === 'technical-air-to-ground')) throw new Error('Technical air-to-ground transcript is required for mission-event verification.');
console.log(`valid content: ${scenario.id}; historical draft held at ${historicalDraft.fidelity}; archive catalog ${audioCatalog.id}`);
