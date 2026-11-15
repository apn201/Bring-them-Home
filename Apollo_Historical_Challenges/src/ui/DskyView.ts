import { DskyDecoder, dskyLamps, type DskyKey } from '../agc/DskyDecoder';

const keys: ReadonlyArray<DskyKey> = ['VERB', 'NOUN', 'PLUS', 'MINUS', '7', '8', '9', 'CLR', '4', '5', '6', 'PRO', '1', '2', '3', 'KEY_REL', '0', 'ENTR', 'RSET'];

const keyPositions: Record<DskyKey, readonly [number, number]> = {
  VERB: [38, 73], NOUN: [44, 85], PLUS: [46, 64], MINUS: [51, 75],
  '7': [55, 59], '8': [64, 55], '9': [73, 52], CLR: [82, 49],
  '4': [57, 70], '5': [66, 67], '6': [75, 63], PRO: [84, 60],
  '1': [59, 81], '2': [68, 77], '3': [77, 73], KEY_REL: [87, 71],
  '0': [55, 90], ENTR: [88, 47], RSET: [90, 58],
};

const lampPositions: Partial<Record<string, readonly [number, number, number, number]>> = {
  'UPLINK ACTY': [20, 18, 11, 5], TEMP: [34, 15, 11, 5], 'NO ATT': [21, 28, 11, 5],
  'GIMBAL LOCK': [35, 25, 11, 6], STBY: [23, 38, 11, 5], PROG: [36, 35, 11, 5],
  'KEY REL': [25, 48, 11, 5], RESTART: [38, 45, 11, 5], 'OPR ERR': [27, 58, 11, 5],
  TRACKER: [40, 55, 11, 5],
};

export class DskyView extends HTMLElement {
  private decoder = new DskyDecoder();
  private readonly root = this.attachShadow({ mode: 'open' });

  connectedCallback(): void {
    this.root.innerHTML = `<style>${styles}</style><section class="instrument" aria-label="Apollo DSKY, working computer controls over a historical NASA photograph"><img class="panel-photo" src="./images/nasa-dsky-f8.jpg" alt="Apollo-derived DSKY instrument photographed by NASA"><div class="photo-tint" aria-hidden="true"></div><div class="lamp-overlay" aria-hidden="true">${dskyLamps.map((lamp) => {
      const position = lampPositions[lamp];
      return position ? `<i class="lamp" data-lamp="${lamp}" style="--x:${position[0]}%;--y:${position[1]}%;--w:${position[2]}%;--h:${position[3]}%"></i>` : '';
    }).join('')}</div><div class="display" aria-live="polite"><output class="program" data-field="program">  </output><output class="verb" data-field="verb">  </output><output class="noun" data-field="noun">  </output><div class="registers">${[0, 1, 2].map((row) => `<div class="register"><output class="sign" data-sign="${row}"> </output><output data-register="${row}">     </output></div>`).join('')}</div></div><div class="keypad">${keys.map((key) => { const [x, y] = keyPositions[key]; return `<button data-key="${key}" style="--x:${x}%;--y:${y}%" aria-label="${key.replace('_', ' ')}"></button>`; }).join('')}</div><span class="photo-credit">NASA EC96-43408-1 · LIVE RELAY OVERLAY</span></section>`;
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

const styles = `:host{display:block;width:min(100%,720px);color:#d9ffc2;font-family:ui-monospace,monospace}.instrument{isolation:isolate;position:relative;aspect-ratio:1.265/1;overflow:hidden;background:#071015;box-shadow:0 20px 42px #000b,0 0 0 1px #798077}.panel-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:brightness(.72) saturate(.72) contrast(1.14) sepia(.08)}.photo-tint{position:absolute;inset:0;pointer-events:none;background:linear-gradient(130deg,#001a1d35,#1d130b20 50%,#00121644);mix-blend-mode:screen}.lamp-overlay,.keypad{position:absolute;inset:0}.lamp{position:absolute;left:var(--x);top:var(--y);width:var(--w);height:var(--h);border-radius:3px;opacity:0;transform:skewY(-6deg);transition:opacity 90ms,box-shadow 90ms;background:#eaff9a;mix-blend-mode:screen}.lamp.on{opacity:.5;box-shadow:0 0 6px 2px #d9ff75,0 0 15px 4px #9ade55;background:#efffa1}.display{position:absolute;left:40.5%;top:4%;width:35%;height:50%;overflow:hidden;clip-path:polygon(6% 0,99% 0,90% 100%,0 100%);transform:rotate(-4deg) skewY(-2deg);transform-origin:top left;pointer-events:none;color:#dcff8d;text-shadow:0 0 3px #9dff5a,0 0 9px #7dff4d;filter:drop-shadow(0 0 3px #85fa4d)}.display output{position:absolute;display:block;background:transparent;font:700 clamp(11px,2.1vw,23px)/1 ui-monospace,monospace;letter-spacing:.06em;white-space:pre;color:inherit}.program{left:22%;top:4%}.verb{left:14%;top:28%}.noun{left:62%;top:19%}.registers{position:absolute;left:12%;top:48%;width:81%;display:grid;gap:7%}.register{display:grid;grid-template-columns:11% 1fr;align-items:center;min-height:clamp(17px,3vw,33px)}.register output{position:static;font-size:clamp(15px,2.8vw,30px);letter-spacing:.035em}.register .sign{letter-spacing:0}.keypad button{position:absolute;left:var(--x);top:var(--y);width:8%;height:10.5%;transform:translate(-50%,-50%) skewY(-7deg);border:0;border-radius:8%;background:transparent;cursor:pointer}.keypad button:hover{background:#bdff6e12;box-shadow:inset 0 0 0 1px #ccff7388,0 0 10px #bdff6e55}.keypad button:active{background:#d4ff7b32;box-shadow:inset 0 0 0 2px #edffae,0 0 15px #d4ff7b}.keypad button:focus-visible{outline:2px solid #dfff84;outline-offset:2px;background:#d4ff7b25}.photo-credit{position:absolute;right:2%;bottom:1.5%;padding:3px 5px;background:#051417aa;color:#bddeab;font-size:clamp(6px,.95vw,9px);letter-spacing:.08em}@media(max-width:520px){.photo-credit{font-size:6px}.lamp.on{box-shadow:0 0 4px 1px #caff63,0 0 10px 2px #9ade55}}`;
