import './styles/app.css';
import { keyCodes, type AgcKey } from './agc/KeyCodec';
import { WorkerClient } from './agc/WorkerClient';
import type { WorkerResponse } from './agc/protocol';
import { MissionClock } from './runtime/MissionClock';
import { AquariusCoarseRun } from './runtime/AquariusCoarseRun';
import { sampleBenchTelemetry } from './runtime/BenchTelemetry';
import { projectGuidanceOutcome, svgPath } from './runtime/FlightDirectorProjection';
import { QualificationRun } from './runtime/QualificationRun';
import { AQUARIUS_V41_N20_CUE, TranscriptCuePlayer } from './runtime/TranscriptCuePlayer';
import { DskyView } from './ui/DskyView';

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
      <aside class="brief-card"><p class="eyebrow">NOW LOADED</p><h2><span class="brief-dsky">DSKY</span><span class="brief-qualification">QUALIFICATION</span></h2><div class="rule"></div><p>Training bench · Real Apollo 13 LM software · No historical claim</p><span class="ready-dot"><i></i> Browser computer online</span></aside>
    </section>
    <section class="console-section" aria-labelledby="console-title">
      <div class="section-label"><span>01 / LIVE CONSOLE</span><h2 id="console-title">Lunar module guidance computer</h2><p>Output comes from the Apollo 13 LM131R1 ROM in a dedicated worker. This is not a simulated display.</p></div>
      <div class="console-grid">
        <article class="dsky-bay"><div class="bay-top"><span>DISPLAY &amp; KEYBOARD</span><span id="cycle-readout">CYCLE 00000000</span></div><div id="dsky-mount" class="dsky-mount" aria-label="Apollo DSKY instrument"></div><p id="screen-reader-output" class="sr-only" aria-live="polite">Computer loading.</p><div class="key-hints"><span><kbd>V</kbd> VERB</span><span><kbd>N</kbd> NOUN</span><span><kbd>↵</kbd> ENTR</span><span><kbd>Space</kbd> PRO</span><span><kbd>R</kbd> RSET</span></div></article>
        <aside class="control-bay">
          <div class="status-line"><span class="pulse"></span><span id="computer-state">Booting original flight software</span></div>
          <h3>Qualification run</h3>
          <ol class="checklist" id="training-list"><li class="active"><b>01</b><span>Press <strong>VERB</strong> to begin the actual light-test command.</span></li><li><b>02</b><span>Enter <strong>35</strong> to select the DSKY test-lights verb.</span></li><li><b>03</b><span>Press <strong>ENTR</strong> and verify the panel illuminates.</span></li></ol><p class="qualification-status" id="qualification-status">Start the real DSKY light test · press VERB · 0/3 complete</p><div class="qualification-complete" id="qualification-complete" hidden><strong>QUALIFIED</strong><span>V35 was accepted and the computer remains live for practice.</span></div>
          <section class="try-this" id="try-this" hidden aria-labelledby="try-title"><p class="eyebrow" id="try-title">TRY THE LIVE ROM</p><p>These are real LM131R1 verb/noun paths. The boot state has zero ICDU angles; load the source-checked training attitude first to see a non-zero display.</p><div class="experiment-grid"><button data-experiment="coarse"><b>V41 N20</b><span>Load 302.43 / 347.78 / 008.13°</span></button><button data-experiment="angles"><b>V06 N20 ENTR</b><span>Display ICDU angles</span></button><button data-experiment="monitor"><b>V16 N20 ENTR</b><span>Monitor ICDU angles</span></button><button data-experiment="lights"><b>V35 ENTR</b><span>Test DSKY lights</span></button></div></section>
          <div class="control-actions"><button class="outline" id="pause-button">Pause</button><button class="outline" id="restart-button">Exact restart</button></div><details class="training-debrief" open><summary>Training debrief</summary><p id="training-debrief">No operator inputs recorded.</p></details>
          <dl class="telemetry"><div><dt>ENGINE</dt><dd id="engine-version">—</dd></div><div><dt>ERASABLE HASH</dt><dd id="erasable-hash">—</dd></div><div><dt>LAST CHANNEL 010</dt><dd id="channel-ten">AWAITING RELAY</dd></div></dl><details class="debug-stream" open><summary>Live computer trace <span>real worker data</span></summary><div class="core-words" id="core-words">ERASABLE 0000–0007 · —</div><ol id="trace-log" aria-live="polite"></ol></details>
          <p class="checkpoint-note">This is an authored input drill running the Apollo 13 LM131R1 ROM; it is not a historical mission checkpoint. Restart builds a fresh engine and replays the immutable boot sequence.</p>
        </aside>
      </div>
      <section class="flight-monitor" aria-labelledby="flight-monitor-title"><div class="monitor-head"><div><span>03 / INSTRUMENT BUS</span><h3 id="flight-monitor-title">Docked-stack training telemetry</h3></div><p>Worker-cycle fed · Bench vector only · Not Apollo flight telemetry</p></div><div class="monitor-grid"><article class="attitude-card"><svg viewBox="-82 -76 164 152" aria-label="Docked command module and lunar module attitude wireframe"><g class="attitude-reference"><path d="M-70 0H70M0-62V62"/><circle cx="0" cy="0" r="56"/></g><g id="attitude-vehicle"><g class="command-module"><path d="M-16-53H16L10-39H-10Z"/><path d="M-11-39H11M-7-53V-63H7V-53"/><path d="M-24-51 -43-62M24-51 43-62M-46-62h-10M46-62h10"/></g><path class="dock-ring" d="M-12-35H12M-8-32H8"/><g class="lunar-module"><path class="plume" d="M-7 35H7L15 61 0 54 -15 61Z"/><path d="M-5 24H5L9 35H-9Z"/><path d="M-26 8 -49 38M26 8 49 38M-49 39v11M49 39v11M-49 38h-10M49 38h10M0 11v33"/><path d="M-26 4H26V22H-26ZM-13 4V22M13 4V22"/><path d="M-21-20 -13-31H13L21-20V4H-21Z"/><path d="M-17-18H-3V-5H-17ZM3-18H17V-5H3ZM-8-31V-43H8V-31"/><path d="M-18-27 -39-42M18-27 39-42M-34-44h-10M34-44h10"/><path d="M-8 4 8 4M-20 28H20"/></g></g></svg><div class="attitude-readout"><span>VEHICLE <b>CM + LM / DOCKED</b></span><span>FDAI / PITCH <b id="attitude-pitch">+00.0°</b></span><span>FDAI / ROLL <b id="attitude-roll">+00.0°</b></span><span>FDAI / YAW <b id="attitude-yaw">+00.0°</b></span></div></article><article class="vitals-card"><dl><div><dt>T+ CPU</dt><dd id="telemetry-time">00:00:00</dd></div><div><dt>ALT <small>bench</small></dt><dd id="telemetry-alt">014.20 km</dd></div><div><dt>HDOT <small>bench</small></dt><dd id="telemetry-hdot">+000.0 m/s</dd></div><div><dt>VEL <small>bench</small></dt><dd id="telemetry-vel">0000 m/s</dd></div><div><dt>PROP <small>bench</small></dt><dd id="telemetry-prop">82.4%</dd></div><div><dt>DPS <small>bench</small></dt><dd id="telemetry-dps">0%</dd></div><div><dt>AGC CYCLES</dt><dd id="telemetry-cycles">00000000</dd></div><div><dt>MODE</dt><dd>LM131R1 / DOCKED</dd></div></dl></article></div></section>
    </section>
    <section class="chapters" aria-labelledby="chapters-title"><div class="section-label"><span>02 / EPISODES</span><h2 id="chapters-title">The first collection</h2><p>Short missions, not a fictional free-flight simulator.</p></div><div class="chapter-grid">
      <article class="chapter available"><span class="chapter-no">01</span><p class="eyebrow">TRAINING · AVAILABLE</p><h3>DSKY Qualification</h3><p>Learn the instrument through real computer responses. This is a modern training exercise, not a reconstructed Apollo event.</p><button class="text-button" id="launch-training">Load console <span>→</span></button></article>
      <article class="chapter held"><span class="chapter-no">02</span><p class="eyebrow">AQUARIUS · RESEARCH HOLD</p><h3>Preserve the platform</h3><p>The coarse-alignment worksheet is cross-checked. Peripheral behavior, procedure coverage, and audio synchronization still have to agree before this becomes playable.</p><span class="hold-label">G4 evidence gate</span></article>
      <article class="chapter held"><span class="chapter-no">03</span><p class="eyebrow">AQUARIUS · RESEARCH HOLD</p><h3>Fine alignment</h3><p>A separate checkpoint at the later mission epoch. The long intervening interval will remain an explicit chapter jump.</p><span class="hold-label">G4 evidence gate</span></article>
    </div></section>
    <section class="fidelity" id="fidelity"><p class="eyebrow">FIDELITY STATEMENT</p><div><h2>Real computer.<br>Careful claims.</h2><p>The browser console runs the supplied LM131R1 Apollo 13 flight-software ROM and corresponding yaAGC WebAssembly engine. The historical alignment chapters are intentionally withheld: their audio, IMU/CDU model, initial conditions and complete procedure verification are not yet release-ready.</p><a href="./THIRD_PARTY_NOTICES.md" target="_blank" rel="noreferrer">Read source &amp; notices <span>↗</span></a></div></section>
    <footer><span>APOLLO HISTORICAL CHALLENGES · DEVELOPMENT BUILD</span><span>LOCAL, NO ACCOUNT · <a href="./THIRD_PARTY_NOTICES.md" target="_blank" rel="noreferrer">NOTICES</a></span></footer>
  </main>`;

const dsky = document.createElement('apollo-dsky') as DskyView;
document.querySelector('#dsky-mount')?.append(dsky);
const missionReview = document.createElement('section');
missionReview.className = 'mission-review';
missionReview.setAttribute('aria-labelledby', 'mission-review-title');
missionReview.innerHTML = `<div><p class="eyebrow">02 / EVIDENCE STATION</p><h2 id="mission-review-title">Aquarius: preserve the platform</h2><p>The historical mission is still gated. One reviewed cue is ready: V41 N20 and the first coarse angle at GET 58:02:26.</p></div><div class="mission-cue"><span>VERIFIED CUE</span><strong>V41 N20 · +30243</strong><small>414-AAA Track 1 · 05:07:40<br>PAO line 14230 / TEC line 25146</small><div><button class="outline" id="play-aquarius-cue">Play reviewed cue</button><button class="quiet" id="stop-aquarius-cue">Stop</button></div><p id="aquarius-audio-status" aria-live="polite">Ready for operator-initiated review.</p></div>`;
const missionProcedure = document.createElement('section');
missionProcedure.className = 'mission-procedure';
missionProcedure.innerHTML = `<div><p class="eyebrow">EVIDENCE-GATED REHEARSAL</p><h3>Coarse alignment command set</h3><p>Runs V41 N20 and the reviewed values against the live LM131R1 ROM. The command and audio are historical evidence; the boot state is not an Apollo 13 spacecraft reconstruction.</p></div><div><ol id="aquarius-steps"><li class="active"><b>01</b><span>Enter V41 N20</span></li><li><b>02</b><span>Enter +30243</span></li><li><b>03</b><span>Enter +34778</span></li><li><b>04</b><span>Enter +00813</span></li></ol><div class="mission-actions"><button class="outline" id="start-aquarius-rehearsal">Take the hotseat</button><button class="quiet" id="leave-aquarius-rehearsal">Return to training</button></div><p id="aquarius-rehearsal-status" aria-live="polite">Audio cue reviewed · rehearsal not staged.</p><div class="mission-explore" id="mission-explore" hidden><span>LIVE ROM OPEN</span><p>Type your own verbs and nouns, or inspect the resulting angles.</p><button class="outline" id="show-icdu-angles">Display V06 N20</button></div></div>`;
missionReview.append(missionProcedure);
document.querySelector('.chapters')?.before(missionReview);
const guidanceTelemetry = document.createElement('div');
guidanceTelemetry.className = 'guidance-telemetry';
guidanceTelemetry.innerHTML = '<dt>GUIDANCE</dt><dd id="guidance-mode">TRAINING BENCH</dd><dd id="guidance-target">No mission target loaded</dd><small id="guidance-effect">No mission command active.</small>';
document.querySelector('.vitals-card dl')?.append(guidanceTelemetry);
const flightDirector = document.createElement('section');
flightDirector.className = 'flight-director';
flightDirector.setAttribute('aria-labelledby', 'flight-director-title');
flightDirector.innerHTML = `<header><div><span>FLIGHT DIRECTOR / TRAJECTORY REPLAY</span><h3 id="flight-director-title">The long way home</h3></div><strong id="flight-path-state">WAITING FOR GUIDANCE INPUT</strong></header><div class="flight-director-grid"><div class="trajectory-screen"><svg viewBox="0 0 100 100" role="img" aria-label="Apollo 13 mission geometry with historical and player guidance paths"><defs><pattern id="trajectory-grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none"/></pattern></defs><rect width="100" height="100" class="trajectory-grid"/><path id="flight-path-reference" class="flight-path reference"/><path id="flight-path-player" class="flight-path player"/><circle class="earth-marker" cx="12" cy="68" r="5"/><circle class="moon-marker" cx="91" cy="34" r="3.8"/><circle class="aquarius-marker" cx="61" cy="25" r="1.8"/><text x="5" y="79">EARTH</text><text x="83" y="27">MOON</text><text x="63" y="22">AQUARIUS</text></svg><div class="path-key"><span><i class="reference"></i> DOCUMENTED APOLLO 13</span><span><i class="player"></i> YOUR GUIDANCE PATH</span></div></div><aside><dl><div><dt>MISSION GET</dt><dd>058:02:26</dd></div><div><dt>ACTIVE EVENT</dt><dd>V41 N20 / COARSE ALIGN</dd></div><div><dt>NEXT CRITICAL BURN</dt><dd>FREE RETURN / 061:29:43</dd></div></dl><p id="flight-path-note">V41 N20 loads alignment data. The documented free-return and PC+2 path are shown for mission context.</p><p class="trajectory-disclaimer">Mission-phase geometry from the Apollo 13 timeline. Player trace is a consequence projection, not a navigation-grade orbital solution.</p></aside></div>`;
document.querySelector('.flight-monitor')?.after(flightDirector);
const aquariusChapter = document.querySelector<HTMLElement>('.chapter-grid .chapter:nth-child(2)');
if (aquariusChapter) {
  aquariusChapter.classList.remove('held');
  aquariusChapter.classList.add('available');
  aquariusChapter.innerHTML = '<span class="chapter-no">02</span><p class="eyebrow">AQUARIUS · EVIDENCE-GATED</p><h3>Preserve the platform</h3><p>Take the hotseat for the reviewed V41 N20 command set. Audio and command values are verified; the wider spacecraft state remains explicitly unreconstructed.</p><button class="text-button" id="launch-aquarius">Take the hotseat <span>→</span></button>';
}
const client = new WorkerClient();
const elements = {
  status: byId('engine-status'), computer: byId('computer-state'), version: byId('engine-version'),
  cycles: byId('cycle-readout'), hash: byId('erasable-hash'), channelTen: byId('channel-ten'),
  screenReader: byId('screen-reader-output'), pause: byId<HTMLButtonElement>('pause-button'),
  restart: byId<HTMLButtonElement>('restart-button'), training: byId('training-list'),
  qualificationStatus: byId('qualification-status'), completion: byId('qualification-complete'), debrief: byId('training-debrief'), coreWords: byId('core-words'), trace: byId('trace-log'), tryThis: byId<HTMLElement>('try-this'),
  aquariusSteps: byId('aquarius-steps'), aquariusStatus: byId('aquarius-rehearsal-status'),
  guidanceMode: byId('guidance-mode'), guidanceTarget: byId('guidance-target'), guidanceEffect: byId('guidance-effect'), missionExplore: byId<HTMLElement>('mission-explore'),
  flightPathReference: bySvgPathId('flight-path-reference'), flightPathPlayer: bySvgPathId('flight-path-player'), flightPathState: byId('flight-path-state'), flightPathNote: byId('flight-path-note'),
  telemetryTime: byId('telemetry-time'), telemetryAlt: byId('telemetry-alt'), telemetryHdot: byId('telemetry-hdot'), telemetryVel: byId('telemetry-vel'), telemetryProp: byId('telemetry-prop'), telemetryDps: byId('telemetry-dps'), telemetryCycles: byId('telemetry-cycles'), attitudePitch: byId('attitude-pitch'), attitudeRoll: byId('attitude-roll'), attitudeYaw: byId('attitude-yaw'), attitudeVehicle: bySvgId('attitude-vehicle'),
};
const controlTitle = (() => {
  const heading = document.querySelector<HTMLHeadingElement>('.control-bay h3');
  if (!heading) throw new Error('Missing control-bay heading');
  return heading;
})();
const qualificationListMarkup = elements.training.innerHTML;
let paused = false;
const qualification = new QualificationRun();
const aquarius = new AquariusCoarseRun();
const missionClock = new MissionClock();
const traceEntries: string[] = [];
const cuePlayer = new TranscriptCuePlayer();
let missionAnglesQueued = false;

client.addEventListener('message', (event) => handleWorkerMessage((event as CustomEvent<WorkerResponse>).detail));
client.addEventListener('error', (event) => setFailure((event as CustomEvent<string>).detail));
dsky.addEventListener('dsky-key', (event) => { const { key, down } = (event as CustomEvent<{ key: AgcKey; down: boolean }>).detail; sendKey(key, down); });

elements.pause.addEventListener('click', () => setPaused(!paused));
elements.restart.addEventListener('click', () => { const restartMission = aquarius.isRunning(); missionClock.reset(); qualification.reset(); aquarius.reset(); dsky.reset(); elements.channelTen.textContent = 'AWAITING RELAY'; traceEntries.length = 0; missionAnglesQueued = false; if (restartMission) { aquarius.start(); stageAquariusConsole(); updateAquarius(); appendTrace('MISSION  Aquarius rehearsal restarted'); elements.computer.textContent = 'Aquarius rehearsal restored to a fresh ROM'; } else { updateTraining(); updateAquarius(); appendTrace('SYSTEM  fresh instance requested'); elements.computer.textContent = 'Rebuilding exact boot state'; } client.restart(); });
byId<HTMLButtonElement>('focus-dsky').addEventListener('click', () => document.querySelector('.console-section')?.scrollIntoView({ behavior: 'smooth' }));
byId<HTMLButtonElement>('launch-training').addEventListener('click', () => document.querySelector('.console-section')?.scrollIntoView({ behavior: 'smooth' }));
byId<HTMLButtonElement>('about-button').addEventListener('click', () => document.querySelector('#fidelity')?.scrollIntoView({ behavior: 'smooth' }));
byId<HTMLButtonElement>('play-aquarius-cue').addEventListener('click', () => cuePlayer.preview(AQUARIUS_V41_N20_CUE, (message) => { byId('aquarius-audio-status').textContent = message; }));
byId<HTMLButtonElement>('stop-aquarius-cue').addEventListener('click', () => { cuePlayer.stop(); byId('aquarius-audio-status').textContent = 'Reviewed cue stopped.'; });
byId<HTMLButtonElement>('start-aquarius-rehearsal').addEventListener('click', activateAquariusMission);
byId<HTMLButtonElement>('launch-aquarius').addEventListener('click', activateAquariusMission);
byId<HTMLButtonElement>('leave-aquarius-rehearsal').addEventListener('click', leaveAquariusMission);
byId<HTMLButtonElement>('show-icdu-angles').addEventListener('click', () => runExperiment('angles'));
document.querySelectorAll<HTMLButtonElement>('[data-experiment]').forEach((button) => button.addEventListener('click', () => runExperiment(button.dataset.experiment)));
updateFlightDirector();

window.addEventListener('keydown', (event) => {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  const key = keyboardKey(event);
  if (!key) return;
  event.preventDefault(); sendKey(key, true);
});
window.addEventListener('keyup', (event) => { if (event.code === 'Space') { event.preventDefault(); client.key('PRO', false); } });
window.addEventListener('blur', () => client.key('PRO', false));
document.addEventListener('visibilitychange', () => { if (document.hidden) { client.key('PRO', false); setPaused(true); } });
client.start(new URL('wasm/yaAGC.wasm', document.baseURI).href, new URL('roms/LM131R1.bin', document.baseURI).href, 'LM131R1 · Apollo 13 LM ROM');

function handleWorkerMessage(message: WorkerResponse): void {
  if (message.type === 'ready') { elements.status.textContent = 'ONLINE'; elements.computer.textContent = 'LM131R1 ready — select a key'; elements.version.textContent = message.engineVersion; return; }
  if (message.type === 'error') { setFailure(message.message); return; }
  if (message.type === 'restarted') { dsky.reset(); appendTrace('SYSTEM  fresh instance restored'); elements.computer.textContent = 'Fresh LM131R1 instance restored'; return; }
  if (message.type !== 'frame') return;
  missionClock.sync(message.cycle);
  updateTelemetry(message.cycle);
  elements.cycles.textContent = `CYCLE ${message.cycle.toString().padStart(8, '0')}`;
  elements.hash.textContent = message.erasableHash.toUpperCase();
  elements.coreWords.textContent = `ERASABLE 0000–0007 · ${message.coreWords.map((word) => word.toString(8).padStart(5, '0')).join(' ')}`;
  for (const output of message.events) {
    dsky.applyChannel(output.channel, output.value);
    if (output.channel === 0o10 && output.value !== 0) elements.channelTen.textContent = output.value.toString(8).padStart(5, '0');
    if (output.value !== 0 && (output.channel === 0o10 || output.channel === 0o11 || output.channel === 0o13 || output.channel === 0o163)) appendTrace(`OUT ${output.channel.toString(8).padStart(3, '0')}  ${output.value.toString(8).padStart(5, '0')}`);
  }
}

function sendKey(key: AgcKey, down = true): void {
  client.key(key, down);
  if (down && key !== 'PRO') {
    appendTrace(`IN  015  ${(keyCodes[key] ?? 0).toString(8).padStart(5, '0')}  ${key}`);
    recordQualification(key);
    elements.computer.textContent = `${key} sent to channel 015`;
    elements.screenReader.textContent = `${key} sent to the Apollo guidance computer.`;
  }
}

function appendTrace(entry: string): void {
  if (traceEntries.at(-1) === entry) return;
  traceEntries.push(entry); if (traceEntries.length > 10) traceEntries.shift();
  elements.trace.innerHTML = traceEntries.map((line) => `<li>${line}</li>`).join('');
}

function recordQualification(key: AgcKey): void {
  if (aquarius.isRunning()) { aquarius.accept(key, missionClock.snapshot().cycle); updateAquarius(); return; }
  qualification.accept(key, missionClock.snapshot().cycle);
  updateTraining();
}

function updateAquarius(): void {
  const snapshot = aquarius.snapshot();
  const items = [...elements.aquariusSteps.querySelectorAll('li')];
  items.forEach((item, index) => { item.classList.toggle('done', index < snapshot.completedSteps); item.classList.toggle('active', aquarius.isRunning() && index === snapshot.completedSteps && !snapshot.complete); });
  if (!aquarius.isRunning()) { elements.aquariusStatus.textContent = 'Audio cue reviewed · rehearsal not staged.'; elements.missionExplore.hidden = true; updateGuidanceTelemetry(); updateFlightDirector(); return; }
  elements.aquariusStatus.textContent = snapshot.message;
  if (snapshot.complete) {
    const replay = snapshot.historicalReplay;
    elements.missionExplore.hidden = false;
    elements.computer.textContent = replay ? 'V41 N20 accepted — displaying live ICDU angles' : 'Alternate alignment accepted — historical Apollo 13 replay diverged';
    elements.screenReader.textContent = replay ? 'Aquarius command set accepted. Displaying the resulting ICDU angles.' : 'Alternate alignment accepted. This run has diverged from the documented Apollo 13 values.';
    if (!missionAnglesQueued) { missionAnglesQueued = true; window.setTimeout(() => runExperiment('angles'), 650); }
  }
  updateGuidanceTelemetry();
  updateFlightDirector();
}

function stageAquariusConsole(): void {
  const controlBay = document.querySelector<HTMLElement>('.control-bay');
  const actions = controlBay?.querySelector('.control-actions');
  if (controlBay && actions) controlBay.insertBefore(missionReview, actions);
  missionReview.classList.add('mission-console');
  controlTitle.textContent = 'Aquarius rehearsal';
  elements.training.dataset.mode = 'aquarius';
  elements.training.innerHTML = '<li class="active"><b>01</b><span>Enter <strong>V41 N20</strong>.</span></li><li><b>02</b><span>Enter <strong>+30243</strong>.</span></li><li><b>03</b><span>Enter <strong>+34778</strong>, then <strong>+00813</strong>.</span></li>';
  elements.qualificationStatus.textContent = 'Type a wrong key? Press CLR to clear the DSKY, then restart V41 N20.';
  elements.completion.hidden = true;
  elements.tryThis.hidden = true;
}

function activateAquariusMission(): void {
  missionClock.reset();
  aquarius.start();
  missionAnglesQueued = false;
  stageAquariusConsole();
  dsky.reset();
  traceEntries.length = 0;
  appendTrace('MISSION  Aquarius V41 N20 rehearsal staged');
  client.restart();
  elements.computer.textContent = 'Aquarius hotseat staged — enter V41 N20';
  updateAquarius();
  document.querySelector('.console-section')?.scrollIntoView({ behavior: 'smooth' });
}

function leaveAquariusMission(): void {
  cuePlayer.stop();
  aquarius.reset();
  missionAnglesQueued = false;
  missionReview.classList.remove('mission-console');
  document.querySelector('.chapters')?.before(missionReview);
  missionClock.reset();
  qualification.reset();
  updateTraining();
  updateAquarius();
  dsky.reset();
  traceEntries.length = 0;
  appendTrace('SYSTEM  returned to training bench');
  client.restart();
  elements.computer.textContent = 'Training bench restored';
}

function updateTraining(): void {
  if (elements.training.dataset.mode === 'aquarius') {
    elements.training.innerHTML = qualificationListMarkup;
    delete elements.training.dataset.mode;
  }
  controlTitle.textContent = 'Qualification run';
  const items = [...elements.training.querySelectorAll('li')];
  const snapshot = qualification.snapshot();
  items.forEach((item, index) => { item.classList.toggle('done', index < snapshot.completedSteps); item.classList.toggle('active', index === snapshot.completedSteps && !snapshot.complete); });
  elements.qualificationStatus.textContent = snapshot.message;
  const outcomes = snapshot.events.length ? `${snapshot.events.length} input${snapshot.events.length === 1 ? '' : 's'} · ${snapshot.assistance} correction${snapshot.assistance === 1 ? '' : 's'} · last at cycle ${snapshot.events.at(-1)!.cycle}` : 'No operator inputs recorded.';
  elements.debrief.textContent = outcomes;
  if (snapshot.complete) { elements.completion.hidden = false; elements.tryThis.hidden = false; elements.computer.textContent = 'Input path qualified — continue exploring the real console'; elements.screenReader.textContent = 'Input qualification complete.'; return; }
  if (snapshot.diverged) { elements.completion.hidden = true; elements.tryThis.hidden = true; elements.computer.textContent = 'Training divergence — Exact restart restores the immutable boot state'; elements.screenReader.textContent = 'Training divergence. Exact restart is available.'; return; }
  elements.completion.hidden = true; elements.tryThis.hidden = true;
}

function runExperiment(id: string | undefined): void {
  const commands: Record<string, readonly { key: AgcKey; wait?: number }[]> = {
    lights: ['VERB', '3', '5', 'ENTR'].map((key) => ({ key: key as AgcKey })),
    angles: ['VERB', '0', '6', 'NOUN', '2', '0', 'ENTR'].map((key) => ({ key: key as AgcKey })),
    monitor: ['VERB', '1', '6', 'NOUN', '2', '0', 'ENTR'].map((key) => ({ key: key as AgcKey })),
    coarse: [
      ...['VERB', '4', '1', 'NOUN', '2', '0'].map((key) => ({ key: key as AgcKey })),
      { key: 'ENTR', wait: 650 },
      ...['PLUS', '3', '0', '2', '4', '3', 'ENTR'].map((key) => ({ key: key as AgcKey })),
      ...['PLUS', '3', '4', '7', '7', '8', 'ENTR'].map((key) => ({ key: key as AgcKey })),
      ...['PLUS', '0', '0', '8', '1', '3', 'ENTR'].map((key) => ({ key: key as AgcKey })),
    ],
  };
  const steps = id ? commands[id] : undefined;
  if (!steps) return;
  let offset = 0;
  steps.forEach((step) => { window.setTimeout(() => sendKey(step.key), offset); offset += step.wait ?? 145; });
}

function updateTelemetry(cycle: number): void {
  const mission = aquarius.snapshot();
  if (aquarius.isRunning() && mission.complete) {
    const [outer, inner, middle] = mission.values;
    elements.telemetryTime.textContent = 'GET 58:02:26';
    elements.telemetryAlt.textContent = 'NO BURN';
    elements.telemetryHdot.textContent = '0.0 m/s';
    elements.telemetryVel.textContent = 'UNCHANGED';
    elements.telemetryProp.textContent = 'UNCHANGED';
    elements.telemetryDps.textContent = '0%';
    elements.telemetryCycles.textContent = cycle.toString().padStart(8, '0');
    elements.attitudePitch.textContent = formatAlignment(middle);
    elements.attitudeRoll.textContent = formatAlignment(outer);
    elements.attitudeYaw.textContent = formatAlignment(inner);
    elements.attitudeVehicle.setAttribute('transform', 'rotate(0) translate(0 0)');
    return;
  }
  const sample = sampleBenchTelemetry(cycle);
  elements.telemetryTime.textContent = sample.elapsed;
  elements.telemetryAlt.textContent = `${sample.altitudeKm.toFixed(2).padStart(6, '0')} km`;
  elements.telemetryHdot.textContent = `${sample.altitudeRateMps >= 0 ? '+' : ''}${sample.altitudeRateMps.toFixed(1).padStart(5, '0')} m/s`;
  elements.telemetryVel.textContent = `${sample.velocityMps.toFixed(0).padStart(4, '0')} m/s`;
  elements.telemetryProp.textContent = `${sample.propellantPercent.toFixed(1)}%`;
  elements.telemetryDps.textContent = `${sample.throttlePercent.toFixed(0)}%`;
  elements.telemetryCycles.textContent = cycle.toString().padStart(8, '0');
  elements.attitudePitch.textContent = formatAngle(sample.pitchDeg);
  elements.attitudeRoll.textContent = formatAngle(sample.rollDeg);
  elements.attitudeYaw.textContent = formatAngle(sample.yawDeg);
  elements.attitudeVehicle.setAttribute('transform', `rotate(${sample.rollDeg.toFixed(2)}) translate(${sample.yawDeg.toFixed(2)} ${(-sample.pitchDeg).toFixed(2)})`);
}

function updateGuidanceTelemetry(): void {
  const mission = aquarius.snapshot();
  if (!aquarius.isRunning() || !mission.complete) {
    elements.guidanceMode.textContent = aquarius.isRunning() ? 'AWAITING V41 DATA' : 'TRAINING BENCH';
    elements.guidanceTarget.textContent = 'No coarse-alignment target loaded';
    elements.guidanceEffect.textContent = aquarius.isRunning() ? 'V41 N20 will load a guidance alignment target; it does not command a burn.' : 'No mission command active.';
    return;
  }
  const [outer, inner, middle] = mission.values;
  const historical = mission.historicalReplay === true;
  elements.guidanceMode.textContent = historical ? 'DOCUMENTED APOLLO 13 TARGET' : 'ALTERNATE GUIDANCE TARGET';
  elements.guidanceTarget.textContent = `O ${formatAlignment(outer)} · I ${formatAlignment(inner)} · M ${formatAlignment(middle)}`;
  elements.guidanceEffect.textContent = historical ? 'V41 accepts the alignment target. No physical turn, RCS firing, or DPS burn is commanded by this entry.' : 'The real ROM accepted your alternate target. This run no longer follows the Apollo 13 evidence path; return outcome is not assessed by this rehearsal.';
}

function updateFlightDirector(): void {
  const mission = aquarius.snapshot();
  const projection = projectGuidanceOutcome(mission.complete ? mission.values : undefined);
  elements.flightPathReference.setAttribute('d', svgPath(projection.historical));
  elements.flightPathPlayer.setAttribute('d', svgPath(projection.player));
  elements.flightPathState.textContent = projection.status;
  elements.flightPathState.dataset.state = projection.state;
  elements.flightPathNote.textContent = projection.note;
}

function formatAngle(value: number): string { return `${value >= 0 ? '+' : ''}${value.toFixed(1).padStart(4, '0')}°`; }
function formatAlignment(value: number): string { return `${value >= 0 ? '+' : '−'}${(Math.abs(value) / 100).toFixed(2).padStart(6, '0')}°`; }

function setPaused(next: boolean): void {
  paused = next;
  missionClock.setPaused(paused);
  client.pause(paused);
  elements.pause.textContent = paused ? 'Resume' : 'Pause';
  elements.computer.textContent = paused ? 'Paused safely' : 'Running original flight software';
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
function bySvgId(id: string): SVGGElement { const element = document.getElementById(id); if (!(element instanceof SVGGElement)) throw new Error(`Missing SVG ${id}`); return element; }
function bySvgPathId(id: string): SVGPathElement { const element = document.getElementById(id); if (!(element instanceof SVGPathElement)) throw new Error(`Missing SVG path ${id}`); return element; }
