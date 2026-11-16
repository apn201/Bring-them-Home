export interface EntryState {altitude:number;velocity:number;gamma:number;range:number;dragG:number;peakG:number;blackout:boolean;phase:'entry'|'chutes'|'landed'|'skipout';elapsed:number;bankTarget:number;}
/** Reduced spherical-Earth lifting entry. Representative beta=400 kg/m²,
 * L/D=.3; log-density interpolation. Not the flown AGC P61–67 or a validated
 * entry corridor/thermal model. Initial conditions come from the final PAD. */
export class EntryDynamics {
 private state:EntryState={altitude:121920,velocity:36211*.3048,gamma:-6.49*Math.PI/180,range:0,dragG:0,peakG:0,blackout:false,phase:'entry',elapsed:0,bankTarget:0};
 step(dt:number,bankDegrees:number):void {
  const s=this.state;if(s.phase==='landed'||s.phase==='skipout')return;s.elapsed+=dt;
  if(s.phase==='chutes') {s.altitude=Math.max(0,s.altitude-9.6*dt);s.velocity=9.6;s.dragG=1;s.blackout=false;if(s.altitude===0)s.phase='landed';return;}
  const r=6371000+s.altitude,g=3.986004418e14/(r*r),v=s.velocity;
  const drag=.5*density(s.altitude)*v*v/400,lift=drag*.3;
  s.altitude+=v*Math.sin(s.gamma)*dt;s.range+=v*Math.cos(s.gamma)*dt;
  s.gamma+=(lift*Math.cos(bankDegrees*Math.PI/180)/Math.max(v,1)+(v/r-g/Math.max(v,1))*Math.cos(s.gamma))*dt;
  s.velocity=Math.max(0,v+(-drag-g*Math.sin(s.gamma))*dt);
  // Game guidance for this reduced model, not the flown AGC bank command.
  s.bankTarget=s.velocity<10000&&s.velocity>4500?90:0;
  s.dragG=drag/9.80665;s.peakG=Math.max(s.peakG,s.dragG);s.blackout=s.altitude<85000&&s.altitude>35000&&s.velocity>3200;
  if(s.altitude<3000){s.phase='chutes';s.blackout=false;}
  else if(s.elapsed>60&&s.altitude>140000&&s.gamma>0)s.phase='skipout';
 }
 snapshot():EntryState {return {...this.state};}
}
const atmosphere=[[0,1.225],[10000,.4135],[20000,.08891],[30000,.01841],[40000,.003996],[50000,.001027],[60000,.0003097],[70000,.00008283],[80000,.00001846],[90000,.000003416],[100000,.0000005606],[120000,.0000000222],[150000,.00000000208]];
function density(altitude:number):number {for(let i=1;i<atmosphere.length;i++){if(altitude<=atmosphere[i][0]){const a=atmosphere[i-1],b=atmosphere[i],fraction=Math.max(0,(altitude-a[0])/(b[0]-a[0]));return Math.exp(Math.log(a[1])+(Math.log(b[1])-Math.log(a[1]))*fraction);}}return 0;}
