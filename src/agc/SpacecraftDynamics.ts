import { EntryDynamics, type EntryState } from './EntryDynamics';
export interface FlightSetup { attitude: readonly number[]; rates: readonly number[]; massKg?: number; vehicle?:'lm'|'cm'; propulsion?:'dps'|'rcs'; }
export interface FlightState { elapsed: number; attitude: number[]; rates: number[]; rcs: number[]; throttle: number; firing: boolean; burnSeconds: number; deltaV: number[]; propellantUsedKg: number; vibration: number; propulsion:'dps'|'rcs'; entry?:EntryState; }
/** Reduced docked-stack flight model. Parameters are representative, not an
 * Apollo 13 ephemeris: 445 N RCS jets, 2 m lever, 44.5 kN DPS, Isp 311 s,
 * inertia [60000,180000,180000] kg m². Dynamics and encoder feedback share
 * the same integrated motion. No random needle or spacecraft animation. */
export class SpacecraftDynamics {
  private state: FlightState;
  private mass: number;
  private flexVelocity = 0;
  private flex = 0;
  private lastFlex = 0;
  private baseline: number[];
  private entry?:EntryDynamics;
  constructor(private setup: FlightSetup) {
    this.mass = setup.massKg ?? (setup.vehicle==='cm'?5500:43514);
    this.baseline = [...setup.attitude];
    this.state = { elapsed: 0, attitude: [...setup.attitude], rates: [...setup.rates], rcs: [0,0,0], throttle: .1, firing: false, burnSeconds: 0, deltaV: [0,0,0], propellantUsedKg: 0, vibration: 0, propulsion:setup.propulsion??'dps' };
  }
  beginEntry():void {this.entry=new EntryDynamics();}
  control(axis: number, direction: number): void { if (axis >= 0 && axis < 3) this.state.rcs[axis] = Math.max(-1,Math.min(1,direction)); }
  engine(firing: boolean, throttle = this.state.throttle): void { this.state.firing = firing; this.state.throttle = Math.max(.1,Math.min(1,throttle)); }
  step(dt: number): number[] {
    const s = this.state; s.elapsed += dt;
    const changes = [0,0,0];
    const inertia = this.setup.vehicle==='cm'?[3000,4000,4000]:[60000,180000,180000];
    for(let axis=0;axis<3;axis++) {
      const torque = s.rcs[axis] * 2 * (this.setup.vehicle==='cm'?93:445) * 2;
      s.rates[axis] += torque / inertia[axis] * 180 / Math.PI * dt;
      changes[axis] = s.rates[axis] * dt;
      s.attitude[axis] = (s.attitude[axis] + changes[axis] + 360) % 360;
    }
    const thrust = s.firing ? (s.propulsion==='rcs'?1780:44500 * s.throttle) : 0;
    const consumed = (thrust / ((s.propulsion==='rcs'?290:311) * 9.80665) + s.rcs.reduce((sum,value)=>sum+Math.abs(value),0) * (this.setup.vehicle==='cm'?186:890) / (290 * 9.80665)) * dt;
    this.mass = Math.max(this.setup.vehicle==='cm'?4000:10000,this.mass-consumed); s.propellantUsedKg += consumed;
    if(s.firing) {
      s.burnSeconds += dt;
      const pitch=(s.attitude[1]-this.baseline[1])*Math.PI/180;
      const yaw=(s.attitude[2]-this.baseline[2])*Math.PI/180;
      const acceleration=thrust/this.mass;
      s.deltaV[0] += acceleration*Math.cos(pitch)*Math.cos(yaw)*dt;
      s.deltaV[1] += acceleration*Math.cos(pitch)*Math.sin(yaw)*dt;
      s.deltaV[2] += acceleration*Math.sin(pitch)*dt;
    }
    // A small damped structural response to actuator loads, not random jitter.
    this.entry?.step(dt,s.attitude[0]);s.entry=this.entry?.snapshot();
    const excitation = (s.firing ? .003*s.throttle : 0) + s.rcs.reduce((sum,value)=>sum+value,0)*.001 + (s.entry?.dragG??0)*.0004;
    this.flexVelocity += (excitation - 144*this.flex - 12*this.flexVelocity)*dt;
    this.flex += this.flexVelocity*dt;
    const flexDegrees=this.flex*180/Math.PI;
    changes[1] += flexDegrees-this.lastFlex; this.lastFlex=flexDegrees;
    s.vibration=this.flex*10000;
    return changes;
  }
  snapshot(): FlightState { return { ...this.state, attitude:[...this.state.attitude], rates:[...this.state.rates], rcs:[...this.state.rcs], deltaV:[...this.state.deltaV] }; }
}
