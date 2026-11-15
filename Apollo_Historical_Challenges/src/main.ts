import 'webdsky';
import './styles/app.css';
import { isAgcKey, keyCodes, type AgcKey } from './agc/KeyCodec';
import { WorkerClient } from './agc/WorkerClient';
import type { WorkerResponse } from './agc/protocol';
import { QualificationRun } from './runtime/QualificationRun';

type DskyElement = HTMLElement;
const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Application root unavailable.');

app.innerHTML = `
  <main class="shell">
    <header class="masthead">
      <a class="brand" href="#top" aria-label="Apollo Historical Challenges home"><span class="brand-mark">A</span><span>APOLLO<br><b>HISTORICAL CHALLENGES</b></span></a>
      <div class="mission-stamp"><span>MISSION CONSOLE</span><strong>LM-131R1</strong><em id="engine-status">INITIALIZING</em></div>
    </header>
    <section id="top" class="hero">
      <div class="hero-copy"><p class="eyebrow">A procedure game collection</p><h1>Keep the machine<br><i>honest.</i></h1><p class="lede">Take the keyboard of an Apollo guidance computer. Read the panel, work the procedure, and accept what the original software tells you.</p><div class="hero-actions"><button class="primary" id="focus-dsky">Enter the console <span>↓</span></button><button class="quiet" id="about-button">Fidelity notes</button></div></div>
      <aside class="brief-card"><p class="eyebrow">NOW LOADED</p><h2>DSKY <span>QUALIFICATION</span></h2><div class="rule"></div><p>Training bench · Real Apollo 13 LM software · No historical claim</p><span class="ready-dot"><i></i> Browser computer online</span></aside>
    </section>
    <section class="console-section" aria-labelledby="console-title">
      <div class="section-label"><span>01 / LIVE CONSOLE</span><h2 id="console-title">Lunar module guidance computer</h2><p>Output comes from the Apollo 13 LM131R1 ROM in a dedicated worker. This is not a simulated display.</p></div>
      <div class="console-grid">
        <article class="dsky-bay"><div class="bay-top"><span>DISPLAY &amp; KEYBOARD</span><span id="cycle-readout">CYCLE 00000000</span></div><div id="dsky-mount" class="dsky-mount" aria-label="Apollo DSKY instrument"></div><p id="screen-reader-output" class="sr-only" aria-live="polite">Computer loading.</p><div class="key-hints"><span><kbd>V</kbd> VERB</span><span><kbd>N</kbd> NOUN</span><span><kbd>↵</kbd> ENTR</span><span><kbd>Space</kbd> PRO</span><span><kbd>R</kbd> RSET</span></div></article>
        <aside class="control-bay">
          <div class="status-line"><span class="pulse"></span><span id="computer-state">Booting original flight software</span></div>
          <h3>Qualification run</h3>
          <ol class="checklist" id="training-list"><li class="active"><b>01</b><span>Press any number to verify the key path.</span></li><li><b>02</b><span>Press <strong>VERB</strong> to begin a verb entry.</span></li><li><b>03</b><span>Enter <strong>35</strong>, then press <strong>ENTR</strong>.</span></li></ol><p class="qualification-status" id="qualification-status">Awaiting a numeric key · 0/3 complete</p><div class="qualification-complete" id="qualification-complete" hidden><strong>QUALIFIED</strong><span>Input route verified. The computer remains live for practice.</span></div>
          <div class="control-actions"><button class="outline" id="pause-button">Pause</button><button class="outline" id="restart-button">Exact restart</button></div>
          <dl class="telemetry"><div><dt>ENGINE</dt><dd id="engine-version">—</dd></div><div><dt>ERASABLE HASH</dt><dd id="erasable-hash">—</dd></div><div><dt>LAST CHANNEL 010</dt><dd id="channel-ten">AWAITING RELAY</dd></div></dl>
          <p class="checkpoint-note">This is an authored input drill running the Apollo 13 LM131R1 ROM; it is not a historical mission checkpoint. Restart builds a fresh engine and replays the immutable boot sequence.</p>
        </aside>
      </div>
    </section>
    <section class="chapters" aria-labelledby="chapters-title"><div class="section-label"><span>02 / EPISODES</span><h2 id="chapters-title">The first collection</h2><p>Short missions, not a fictional free-flight simulator.</p></div><div class="chapter-grid">
      <article class="chapter available"><span class="chapter-no">01</span><p class="eyebrow">TRAINING · AVAILABLE</p><h3>DSKY Qualification</h3><p>Learn the instrument through real computer responses. This is a modern training exercise, not a reconstructed Apollo event.</p><button class="text-button" id="launch-training">Load console <span>→</span></button></article>
      <article class="chapter held"><span class="chapter-no">02</span><p class="eyebrow">AQUARIUS · RESEARCH HOLD</p><h3>Preserve the platform</h3><p>Coarse IMU alignment is awaiting verified peripheral behavior, episode audio alignment, and final historical procedure evidence.</p><span class="hold-label">G4 evidence gate</span></article>
      <article class="chapter held"><span class="chapter-no">03</span><p class="eyebrow">AQUARIUS · RESEARCH HOLD</p><h3>Fine alignment</h3><p>A separate checkpoint at the later mission epoch. The long intervening interval will remain an explicit chapter jump.</p><span class="hold-label">G4 evidence gate</span></article>
    </div></section>
    <section class="fidelity" id="fidelity"><p class="eyebrow">FIDELITY STATEMENT</p><div><h2>Real computer.<br>Careful claims.</h2><p>The browser console runs the supplied LM131R1 Apollo 13 flight-software ROM and corresponding yaAGC WebAssembly engine. The historical alignment chapters are intentionally withheld: their audio, IMU/CDU model, initial conditions and complete procedure verification are not yet release-ready.</p><a href="./THIRD_PARTY_NOTICES.md" target="_blank" rel="noreferrer">Read source &amp; notices <span>↗</span></a></div></section>
    <footer><span>APOLLO HISTORICAL CHALLENGES · DEVELOPMENT BUILD</span><span>LOCAL, NO ACCOUNT · <a href="./THIRD_PARTY_NOTICES.md" target="_blank" rel="noreferrer">NOTICES</a></span></footer>
  </main>`;

const dsky = document.createElement('dsky-interface') as DskyElement;
document.querySelector('#dsky-mount')?.append(dsky);
const client = new WorkerClient();
const elements = {
  status: byId('engine-status'), computer: byId('computer-state'), version: byId('engine-version'),
  cycles: byId('cycle-readout'), hash: byId('erasable-hash'), channelTen: byId('channel-ten'),
  screenReader: byId('screen-reader-output'), pause: byId<HTMLButtonElement>('pause-button'),
  restart: byId<HTMLButtonElement>('restart-button'), training: byId('training-list'),
  qualificationStatus: byId('qualification-status'), completion: byId('qualification-complete'),
};
let lampState = 0;
let paused = false;
const qualification = new QualificationRun();

client.addEventListener('message', (event) => handleWorkerMessage((event as CustomEvent<WorkerResponse>).detail));
client.addEventListener('error', (event) => setFailure((event as CustomEvent<string>).detail));
dsky.addEventListener('keypress', (event) => {
  const code = (event as unknown as CustomEvent<number>).detail;
  const key = Object.entries(keyCodes).find(([, value]) => value === code)?.[0];
  if (key && isAgcKey(key)) sendKey(key);
});
dsky.addEventListener('proceed', (event) => client.key('PRO', (event as CustomEvent<number>).detail === 0));

elements.pause.addEventListener('click', () => { paused = !paused; client.pause(paused); elements.pause.textContent = paused ? 'Resume' : 'Pause'; elements.computer.textContent = paused ? 'Paused safely' : 'Running original flight software'; });
elements.restart.addEventListener('click', () => { qualification.reset(); updateTraining(); client.restart(); elements.computer.textContent = 'Rebuilding exact boot state'; });
byId<HTMLButtonElement>('focus-dsky').addEventListener('click', () => document.querySelector('.console-section')?.scrollIntoView({ behavior: 'smooth' }));
byId<HTMLButtonElement>('launch-training').addEventListener('click', () => document.querySelector('.console-section')?.scrollIntoView({ behavior: 'smooth' }));
byId<HTMLButtonElement>('about-button').addEventListener('click', () => document.querySelector('#fidelity')?.scrollIntoView({ behavior: 'smooth' }));

window.addEventListener('keydown', (event) => {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  const key = keyboardKey(event);
  if (!key) return;
  event.preventDefault(); sendKey(key, true);
});
window.addEventListener('keyup', (event) => { if (event.code === 'Space') { event.preventDefault(); client.key('PRO', false); } });
window.addEventListener('blur', () => client.key('PRO', false));
document.addEventListener('visibilitychange', () => { if (document.hidden) { client.key('PRO', false); client.pause(true); } });
client.start(new URL('wasm/yaAGC.wasm', document.baseURI).href, new URL('roms/LM131R1.bin', document.baseURI).href, 'LM131R1 · Apollo 13 LM ROM');

function handleWorkerMessage(message: WorkerResponse): void {
  if (message.type === 'ready') { elements.status.textContent = 'ONLINE'; elements.computer.textContent = 'LM131R1 ready — select a key'; elements.version.textContent = message.engineVersion; return; }
  if (message.type === 'error') { setFailure(message.message); return; }
  if (message.type === 'restarted') { elements.computer.textContent = 'Fresh LM131R1 instance restored'; return; }
  if (message.type !== 'frame') return;
  elements.cycles.textContent = `CYCLE ${message.cycle.toString().padStart(8, '0')}`;
  elements.hash.textContent = message.erasableHash.toUpperCase();
  for (const output of message.events) {
    if (output.channel === 0o10) { dsky.setAttribute('data-input1', output.value.toString(2).padStart(15, '0')); if (output.value !== 0) elements.channelTen.textContent = output.value.toString(8).padStart(5, '0'); }
    if (output.channel === 0o11) lampState = (lampState & ~0b110) | (output.value & 0b110);
    if (output.channel === 0o163) lampState = (lampState & ~0b111111000) | (output.value & 0b111111000);
  }
  dsky.setAttribute('data-input2', lampState.toString(2).padStart(15, '0'));
}

function sendKey(key: AgcKey, down = true): void {
  client.key(key, down);
  if (down && key !== 'PRO') {
    recordQualification(key);
    elements.computer.textContent = `${key} sent to channel 015`;
    elements.screenReader.textContent = `${key} sent to the Apollo guidance computer.`;
  }
}

function recordQualification(key: AgcKey): void {
  qualification.accept(key);
  updateTraining();
}

function updateTraining(): void {
  const items = [...elements.training.querySelectorAll('li')];
  const snapshot = qualification.snapshot();
  items.forEach((item, index) => { item.classList.toggle('done', index < snapshot.completedSteps); item.classList.toggle('active', index === snapshot.completedSteps && !snapshot.complete); });
  elements.qualificationStatus.textContent = snapshot.message;
  if (snapshot.complete) { elements.completion.hidden = false; elements.computer.textContent = 'Input path qualified — continue exploring the real console'; elements.screenReader.textContent = 'Input qualification complete.'; return; }
  elements.completion.hidden = true;
}

function keyboardKey(event: KeyboardEvent): AgcKey | undefined {
  if (event.code === 'Space') return 'PRO'; if (event.key === 'Enter') return 'ENTR';
  const upper = event.key.toUpperCase();
  if (/^[0-9]$/.test(upper)) return upper as AgcKey;
  const map: Record<string, AgcKey> = { V: 'VERB', N: 'NOUN', '+': 'PLUS', '-': 'MINUS', C: 'CLR', K: 'KEY_REL', R: 'RSET', P: 'PRO' };
  return map[upper];
}

function setFailure(message: string): void { elements.status.textContent = 'OFFLINE'; elements.computer.textContent = message; elements.screenReader.textContent = `Computer error: ${message}`; }
function byId<T extends HTMLElement = HTMLElement>(id: string): T { const element = document.getElementById(id); if (!element) throw new Error(`Missing ${id}`); return element as T; }
