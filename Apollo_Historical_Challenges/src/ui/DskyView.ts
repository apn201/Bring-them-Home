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
  UPLINK_ACTY: [20, 18, 11, 5], TEMP: [34, 15, 11, 5], NO_ATT: [21, 28, 11, 5],
  GIMBAL_LOCK: [35, 25, 11, 6], STBY: [23, 38, 11, 5], PROG: [36, 35, 11, 5],
  KEY_REL: [25, 48, 11, 5], RESTART: [38, 45, 11, 5], OPR_ERR: [27, 58, 11, 5],
  TRACKER: [40, 55, 11, 5], COMP_ACTY: [49, 9, 7, 6],
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

const styles = `:host{display:block;width:min(100%,720px);color:#d9ffc2;font-family:ui-monospace,monospace}.instrument{isolation:isolate;position:relative;aspect-ratio:1.265/1;overflow:hidden;background:#071015;box-shadow:0 20px 42px #000b,0 0 0 1px #798077}.panel-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:brightness(.64) saturate(.66) contrast(1.16) sepia(.1)}.photo-tint{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 62% 34%,#6fa26018 0 20%,transparent 48%),linear-gradient(130deg,#001a1d4f,#1d130b2a 50%,#00121655);mix-blend-mode:screen}.lamp-overlay,.display,.keypad{position:absolute;inset:0}.lamp{position:absolute;left:var(--x);top:var(--y);width:var(--w);height:var(--h);border-radius:3px;opacity:0;transform:skewY(-6deg);transition:opacity 90ms,box-shadow 90ms;background:#d9ff70;mix-blend-mode:screen}.lamp.on{opacity:.84;box-shadow:0 0 8px 3px #caff63,0 0 22px 5px #9ade55;background:#efffa1}.display{pointer-events:none;color:#dcff8d;text-shadow:0 0 4px #9dff5a,0 0 15px #7dff4d;filter:drop-shadow(0 0 5px #85fa4d)}.display output{position:absolute;display:block;background:#91ff5b12;font:700 clamp(13px,2.45vw,29px)/1 ui-monospace,monospace;letter-spacing:.11em;white-space:pre;color:inherit}.program{left:69.5%;top:6.4%;transform:rotate(-4deg)}.verb{left:47.7%;top:17.6%;transform:rotate(-4deg)}.noun{left:63%;top:13.2%;transform:rotate(-4deg)}.registers{position:absolute;left:49%;top:26%;width:26%;transform:rotate(-4deg) skewY(-2deg);display:grid;gap:5.2%}.register{display:grid;grid-template-columns:12% 1fr;align-items:center;border-bottom:clamp(1px,.28vw,3px) solid #89ed6e;min-height:clamp(22px,4.2vw,47px)}.register output{position:static;font-size:clamp(18px,3.5vw,41px);letter-spacing:.06em}.register .sign{letter-spacing:0}.keypad button{position:absolute;left:var(--x);top:var(--y);width:8%;height:10.5%;transform:translate(-50%,-50%) skewY(-7deg);border:0;border-radius:8%;background:transparent;cursor:pointer}.keypad button:hover{background:#bdff6e1c;box-shadow:inset 0 0 0 1px #ccff73aa,0 0 14px #bdff6e80}.keypad button:active{background:#d4ff7b44;box-shadow:inset 0 0 0 2px #edffae,0 0 20px #d4ff7b}.keypad button:focus-visible{outline:2px solid #dfff84;outline-offset:2px;background:#d4ff7b25}.photo-credit{position:absolute;right:2%;bottom:1.5%;padding:3px 5px;background:#051417aa;color:#bddeab;font-size:clamp(6px,.95vw,9px);letter-spacing:.08em}@media(max-width:520px){.photo-credit{font-size:6px}.lamp.on{box-shadow:0 0 5px 2px #caff63,0 0 13px 3px #9ade55}}`;
