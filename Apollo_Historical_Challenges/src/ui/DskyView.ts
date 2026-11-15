import { DskyDecoder, dskyLamps, type DskyKey } from '../agc/DskyDecoder';

const keys: ReadonlyArray<DskyKey> = ['VERB', 'NOUN', 'PLUS', 'MINUS', '7', '8', '9', 'CLR', '4', '5', '6', 'PRO', '1', '2', '3', 'KEY_REL', '0', 'ENTR', 'RSET'];
const keyLabels: Record<DskyKey, string> = { VERB: 'VERB', NOUN: 'NOUN', PLUS: '+', MINUS: '−', '7': '7', '8': '8', '9': '9', CLR: 'CLR', '4': '4', '5': '5', '6': '6', PRO: 'PRO', '1': '1', '2': '2', '3': '3', KEY_REL: 'KEY REL', '0': '0', ENTR: 'ENTR', RSET: 'RSET' };

const keyPositions: Record<DskyKey, readonly [number, number]> = {
  PLUS: [29.4, 67.5], '7': [37.7, 67.5], '8': [45.9, 67.5], '9': [54.4, 67.5], CLR: [62.7, 67.5], ENTR: [71.1, 67.5],
  VERB: [25.3, 76], MINUS: [33.6, 76], '4': [41.9, 76], '5': [50.2, 76], '6': [58.5, 76], PRO: [66.8, 76], RSET: [75.1, 76],
  NOUN: [29.4, 83.8], '0': [37.7, 83.8], '1': [45.9, 83.8], '2': [54.4, 83.8], '3': [62.7, 83.8], KEY_REL: [71.1, 83.8],
};

const lampPositions: Partial<Record<string, readonly [number, number, number, number]>> = {
  'UPLINK ACTY': [22.7, 9, 8.5, 7.2], TEMP: [33.2, 9, 8.5, 7.2], 'NO ATT': [22.7, 18, 8.5, 7.2],
  'GIMBAL LOCK': [33.2, 18, 8.5, 7.2], STBY: [22.7, 27, 8.5, 7.2], PROG: [33.2, 27, 8.5, 7.2],
  'KEY REL': [22.7, 36, 8.5, 7.2], RESTART: [33.2, 36, 8.5, 7.2], 'OPR ERR': [22.7, 45, 8.5, 7.2], TRACKER: [33.2, 45, 8.5, 7.2],
};

export class DskyView extends HTMLElement {
  private decoder = new DskyDecoder();
  private readonly root = this.attachShadow({ mode: 'open' });

  connectedCallback(): void {
    this.root.innerHTML = `<style>${styles}</style><section class="instrument" aria-label="Live Apollo-style display and keyboard"><img class="panel-photo" src="./images/dsky-front-dsky-v2.png" alt="Front-on period guidance-computer instrument panel"><div class="photo-tint" aria-hidden="true"></div><div class="lamp-overlay" aria-hidden="true">${dskyLamps.map((lamp) => {
      const position = lampPositions[lamp];
      return position ? `<i class="lamp" data-lamp="${lamp}" style="--x:${position[0]}%;--y:${position[1]}%;--w:${position[2]}%;--h:${position[3]}%"></i>` : '';
    }).join('')}</div><div class="display" aria-live="polite"><span class="field-label program-label">PROG</span><span class="field-label verb-label">VERB</span><span class="field-label noun-label">NOUN</span><output class="program" data-field="program">  </output><output class="verb" data-field="verb">  </output><output class="noun" data-field="noun">  </output><div class="registers">${[0, 1, 2].map((row) => `<div class="register"><output class="sign" data-sign="${row}"> </output><output data-register="${row}">     </output></div>`).join('')}</div></div><div class="keypad">${keys.map((key) => { const [x, y] = keyPositions[key]; return `<button data-key="${key}" style="--x:${x}%;--y:${y}%" aria-label="${key.replace('_', ' ')}">${keyLabels[key]}</button>`; }).join('')}</div><span class="photo-credit">PROJECT-GENERATED PANEL · LIVE RELAY OVERLAY</span></section>`;
    this.root.querySelectorAll<HTMLButtonElement>('button[data-key]').forEach((button) => {
      const key = button.dataset.key as DskyKey;
      if (key === 'PRO') {
        button.addEventListener('pointerdown', () => this.dispatch('PRO', true));
        ['pointerup', 'pointercancel', 'pointerleave'].forEach((event) => button.addEventListener(event, () => this.dispatch('PRO', false)));
      } else button.addEventListener('click', () => this.dispatch(key, true));
    });
  }

  applyChannel(channel: number, value: number): void {
    const state = this.decoder.apply(channel, value);
    this.root.querySelector<HTMLOutputElement>('[data-field="program"]')!.textContent = state.program;
    this.root.querySelector<HTMLOutputElement>('[data-field="verb"]')!.textContent = state.verb;
    this.root.querySelector<HTMLOutputElement>('[data-field="noun"]')!.textContent = state.noun;
    state.registers.forEach((value, row) => { this.root.querySelector<HTMLOutputElement>(`[data-register="${row}"]`)!.textContent = value; this.root.querySelector<HTMLOutputElement>(`[data-sign="${row}"]`)!.textContent = state.signs[row]; });
    this.root.querySelectorAll<HTMLElement>('[data-lamp]').forEach((lamp) => lamp.classList.toggle('on', state.lamps.has(lamp.dataset.lamp!)));
  }

  reset(): void {
    this.decoder = new DskyDecoder();
    this.root.querySelectorAll<HTMLOutputElement>('[data-field]').forEach((field) => { field.textContent = '  '; });
    this.root.querySelectorAll<HTMLOutputElement>('[data-register]').forEach((field) => { field.textContent = '     '; });
    this.root.querySelectorAll<HTMLOutputElement>('[data-sign]').forEach((field) => { field.textContent = ' '; });
    this.root.querySelectorAll<HTMLElement>('[data-lamp]').forEach((lamp) => lamp.classList.remove('on'));
  }

  private dispatch(key: DskyKey, down: boolean): void { this.dispatchEvent(new CustomEvent<{ key: DskyKey; down: boolean }>('dsky-key', { detail: { key, down }, bubbles: true })); }
}

customElements.define('apollo-dsky', DskyView);

const styles = `:host{display:block;width:min(100%,620px);color:#d9ffc2;font-family:ui-monospace,monospace}.instrument{isolation:isolate;position:relative;aspect-ratio:4/5;overflow:hidden;background:#071015;box-shadow:0 20px 42px #000b,0 0 0 1px #798077}.panel-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:brightness(.74) saturate(.7) contrast(1.1)}.photo-tint{position:absolute;inset:0;pointer-events:none;background:linear-gradient(130deg,#001a1d20,#1d130b16 50%,#00121628);mix-blend-mode:screen}.lamp-overlay,.keypad{position:absolute;inset:0}.lamp{position:absolute;left:var(--x);top:var(--y);width:var(--w);height:var(--h);border-radius:7px;opacity:0;background:#f0ffa5;mix-blend-mode:screen;transition:opacity 90ms,box-shadow 90ms}.lamp.on{opacity:.58;box-shadow:0 0 7px 2px #d9ff75,0 0 17px 4px #9ade55}.display{position:absolute;left:48.1%;top:7.5%;width:33.5%;height:45.5%;overflow:hidden;border-radius:3%;pointer-events:none;color:#dcff8d;text-shadow:0 0 3px #9dff5a,0 0 8px #7dff4d}.display output{position:absolute;display:block;background:transparent;font:700 clamp(10px,1.8vw,18px)/1 ui-monospace,monospace;letter-spacing:.035em;white-space:pre;color:inherit}.field-label{position:absolute;color:#a6bd9d;font:700 clamp(5px,.72vw,8px)/1 ui-monospace,monospace;letter-spacing:.08em}.program-label,.program{left:10%}.verb-label,.verb{left:40%}.noun-label,.noun{left:69%}.field-label{top:12%}.program,.verb,.noun{top:20%}.registers{position:absolute;left:10%;top:42%;width:82%;display:grid;gap:18%}.register{display:grid;grid-template-columns:11% 1fr;align-items:center;min-height:clamp(15px,2.4vw,25px)}.register output{position:static;font-size:clamp(12px,2.2vw,23px);letter-spacing:.01em}.register .sign{letter-spacing:0}.keypad button{position:absolute;left:var(--x);top:var(--y);width:8.1%;height:5.5%;transform:translate(-50%,-50%);border:0;border-radius:13%;background:transparent;color:#c4cbc2;font:700 clamp(6px,.85vw,10px)/1 ui-monospace,monospace;text-shadow:0 1px #000;cursor:pointer}.keypad button:hover{background:#bdff6e12;box-shadow:inset 0 0 0 1px #ccff7388,0 0 10px #bdff6e55}.keypad button:active{background:#d4ff7b32;box-shadow:inset 0 0 0 2px #edffae,0 0 15px #d4ff7b}.keypad button:focus-visible{outline:2px solid #dfff84;outline-offset:2px;background:#d4ff7b25}.photo-credit{position:absolute;right:2%;bottom:1.5%;padding:3px 5px;background:#051417aa;color:#bddeab;font-size:clamp(5px,.75vw,8px);letter-spacing:.08em}@media(max-width:520px){.photo-credit{font-size:5px}.lamp.on{box-shadow:0 0 4px 1px #caff63,0 0 10px 2px #9ade55}}`;
