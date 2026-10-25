import * as route from './route.js';
import {MAX_SPEED,ROAD_HALF} from './game-config.js';
import {impactOffset} from './traffic-impact.js';

export const GRID_ROLL_MS=2500;
export const START_SEQUENCE_MS=GRID_ROLL_MS+3000;
export const RIVAL_COLORS=['#edb84b','#9476bd','#68ad91','#e48e56','#e8e5d6'];
const grid=[{z:46,side:1},{z:38,side:-1},{z:30,side:1},{z:22,side:-1},{z:14,side:1}];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
// One small travel-time lookup shared by all five drivers. Slow for tight bends,
// accelerate on straights, and avoid rebuilding a route search every frame.
let travel;
function timetable(){
 if(travel)return travel;
 const step=10,n=Math.ceil(route.LENGTH/step),times=[0],speeds=[];
 for(let i=0;i<n;i++){
  let bend=0;for(let ahead=0;ahead<=60;ahead+=10)bend=Math.max(bend,Math.abs(route.curvature(i*step+ahead)));
  speeds.push(Math.min(MAX_SPEED*.91,Math.sqrt(4.4/Math.max(.0001,bend))));
 }
 // Respect braking distance before a slow corner, across the lap seam too.
 for(let lap=0;lap<2;lap++)for(let i=n-1;i>=0;i--)speeds[i]=Math.min(speeds[i],Math.sqrt(speeds[(i+1)%n]**2+2*6*step));
 for(let i=0;i<n;i++)times.push(times[i]+step/speeds[i]);
 return travel={step,times,speeds,duration:times[n]};
}
function distanceAt(seconds){
 const {step,times,duration}=timetable(),lap=Math.floor(seconds/duration),t=seconds-lap*duration;
 let lo=0,hi=times.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(times[mid]<=t)lo=mid;else hi=mid;}
 return lap*route.LENGTH+lo*step+(t-times[lo])/(times[hi]-times[lo])*step;
}
function driverProgress(i,seconds){
 const pace=.99-i*.022,clock=Math.max(0,seconds-2.1*(1-Math.exp(-seconds/2.1)));
 return Math.min(route.LENGTH*3+2.55,grid[i].z+distanceAt(clock*pace));
}
export function rivals(time,startAt,impacts=[]){
 if(!Number.isFinite(startAt)||startAt<=0)return [];
 const elapsed=Math.max(0,(time-startAt)/1000),roll=smooth((time-(startAt-START_SEQUENCE_MS))/GRID_ROLL_MS);
 return grid.map((g,i)=>{
  const progress=time<startAt?g.z-9*(1-roll):driverProgress(i,elapsed),preferred=g.side;
  let x=route.lane(progress,preferred),h=Math.atan((route.lane(progress+.25,preferred)-route.lane(progress-.25,preferred))/.5);
  let z=progress,v=time<startAt?0:(driverProgress(i,elapsed+.025)-progress)/.025;
  const id='racer:'+i,hit=impacts.find(o=>o.target===id);
  if(hit&&time>=hit.time&&time-hit.time<8000){const offset=impactOffset(hit,time);x+=offset.x;z+=offset.z;h+=offset.h;v=Math.max(0,v-offset.slow);}
  return {id,x:clamp(x,-ROAD_HALF+1,ROAD_HALF-1),z,h,v,progress,kind:'traffic',rival:true,w:1,d:2.2};
 });
}
export function nearbyRivals(z,time,startAt,range=280,impacts=[]){
 return rivals(time,startAt,impacts).filter(o=>o.progress<route.LENGTH*3+2.55).map(o=>({...o,z:route.near(o.z,z)})).filter(o=>Math.abs(o.z-z)<=range);
}
export function racePosition(z,time,startAt,peerZ=null,cars=rivals(time,startAt)){
 const ahead=cars.filter(o=>o.finishedAt||o.progress>z+.1||o.progress>=route.LENGTH*3+2.55).length;
 return {place:1+ahead+(Number.isFinite(peerZ)&&peerZ>z+.1?1:0),total:cars.length+1+(Number.isFinite(peerZ)?1:0)};
}
export function raceTime(ms){
 const t=Math.max(0,Math.floor(ms)),minutes=Math.floor(t/60000),seconds=Math.floor(t/1000)%60;
 return minutes+':'+String(seconds).padStart(2,'0')+'.'+String(t%1000).padStart(3,'0');
}
export function countdownText(time,end){return !end||time>end+650?'':time<end-3000?'':time<end?String(Math.ceil((end-time)/1000)):'GO!';}

export function rivalCruiseSpeed(z){const t=timetable();return t.speeds[Math.min(t.speeds.length-1,Math.floor(route.wrap(z)/t.step))];}
