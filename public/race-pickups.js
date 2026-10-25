import * as route from './route.js';
import {rivals,rivalCruiseSpeed} from './race-grid.js';
import {performanceFor,repairedCondition,damageFor} from './driving.js';
import {consumeFuel,stationWidth} from './fuel.js';
import {ROAD_HALF,MAX_SPEED} from './game-config.js';
import {impactOffset} from './traffic-impact.js';
import {trackRamp,crossedRamp,createJump,sampleJump,rampSurface} from './stunts.js';

export const RACE_STEP=100;
const FINISH=route.LENGTH*3+2.55;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
const items=route.pickups(route.LENGTH/2,route.LENGTH).map(o=>({...o,z:route.wrap(o.z)}));
export const pickupLap=z=>Math.max(0,Math.floor((z+.001)/route.LENGTH));
export const pickupKey=(id,lap)=>id+'@'+lap;
export function createRaceWorld(startAt){return {startAt,time:startAt,claims:{},revision:0,cars:rivals(startAt,startAt).map((o,i)=>({...o,previousX:o.x,previousZ:o.z,previousH:o.h,lateralV:0,health:100,fuel:100,boostUntil:0,pace:1-i*.008,side:i%2?-1:1,target:null,finishedAt:0}))};}
export function pickupAvailable(world,id,lap){return lap>=0&&lap<3&&!world?.claims[pickupKey(id,lap)];}
export function claimPickup(world,item,lap,owner,time){
 if(!world||lap>2||!pickupAvailable(world,item.id,lap))return false;
 world.claims[pickupKey(item.id,lap)]={owner,time,kind:item.kind};world.revision++;
 const car=world.cars.find(c=>c.id===owner);
 if(car){if(item.kind==='nitro')car.boostUntil=time+5000;else if(item.kind==='repair')car.health=repairedCondition(car.health);else if(item.kind==='fuel')car.fuel=100;}
 return true;
}
export function damageRival(world,hit){const c=world?.cars.find(c=>c.id===hit.target);if(c){c.health=Math.max(0,c.health-damageFor(Math.hypot(hit.dx,hit.dz)));world.revision++;}}
function want(c,o,time){return o.kind==='fuel'?c.fuel<70:o.kind==='repair'?c.health>0&&c.health<100:c.boostUntil<=time;}
function ahead(c,world,time){
 let best=null;
 for(const base of items){const lap=pickupLap(c.z),z=base.z+lap*route.LENGTH,d=z-c.z;
  if(d< -2||d>85||!pickupAvailable(world,base.id,lap)||!want(c,base,time))continue;
  if(!best||d<best.z-c.z)best={...base,z,lap};
 }
 return best;
}
// Five racers make decisions at 10 Hz from the same pre-step snapshot. Rendering
// interpolates their poses; overtaking never requires a route search each frame.
function driveAround(c,others,time,wantedX,targetSpeed){
 const look=Math.max(35,c.v*2+12),obstacles=[...others.filter(o=>o.id!==c.id),...route.traffic(c.z,time,look+12),...route.hazards(c.z,look+12).filter(o=>o.kind!=='ramp'),...route.crashObstacles(c.z)];
 const nearby=obstacles.map(o=>({...o,z:route.near(o.z,c.z)})).filter(o=>o.z-c.z> -9&&o.z-c.z<look);
 const blocks=x=>nearby.filter(o=>o.z>=c.z-1&&Math.abs(o.x-x)<(o.w||1)+1.2);
 const leader=blocks(wantedX).sort((a,b)=>a.z-b.z)[0];
 if(leader){
  const candidates=[route.lane(c.z,-1),route.lane(c.z,1)];
  let best=null,bestScore=Infinity;
  for(const x of candidates){
   // Do not cut into a car alongside or cross through it during a lane change.
   if(nearby.some(o=>o.v!==undefined&&Math.abs(o.z-c.z)<4.5&&Math.sign(o.x-c.x)===Math.sign(x-c.x)&&o.x>=Math.min(c.x,x)-2.1&&o.x<=Math.max(c.x,x)+2.1))continue;
   if(blocks(x).some(o=>o.z-c.z<Math.max(18,c.v*1.6)))continue;
   const score=Math.abs(x-c.x)+(time<(c.passUntil||0)&&Math.sign(x)!==c.passSide?4:0);
   if(score<bestScore){best=x;bestScore=score;}
  }
  if(best!==null&&Math.abs(best-wantedX)>1){wantedX=best;c.passSide=Math.sign(best);c.passUntil=time+2200;}
 }
 // Brake for the car actually in front until there is physical passing room.
 for(const o of nearby){const gap=o.z-c.z-(o.d||2.2)-2.2;
  if(gap< -1||Math.abs(o.x-c.x)>(o.w||1)+1.15)continue;
  const speed=o.v||0,safe=Math.sqrt(Math.max(0,speed*speed+2*12*Math.max(0,gap-3)));
  const escaping=Math.abs(wantedX-o.x)>Math.abs(c.x-o.x)+1&&gap>=1.5;
  targetSpeed=Math.min(targetSpeed,escaping?Math.max(3,safe):safe);
 }
 return {wantedX,targetSpeed,nearby};
}
function move(c,world,time,others){
 c.previousX=c.x;c.previousZ=c.z;c.previousH=c.h;c.previousY=c.y||0;c.previousPitch=c.pitch||0;c.previousRoll=c.roll||0;
 if(c.jump&&sampleJump(c.jump,time).done){c.health=Math.max(0,c.health-c.jump.landingDamage);c.jump=null;c.rampContact=null;c.lateralV=0;c.y=c.pitch=c.roll=0;}
 if(c.jump){
  c.z=Math.min(FINISH,c.z+c.v*RACE_STEP/1000);c.progress=c.z;
  const flight=sampleJump(c.jump,time);c.y=flight.height;c.pitch=flight.pitch;c.roll=flight.roll;
  c.fuel=consumeFuel(c.fuel,c.z-c.previousZ);return;
 }
 if(c.finishedAt||c.health<=0||c.fuel<=0){c.v=0;return;}
 let target=c.target;
 if(!target||target.z<c.z-3||!pickupAvailable(world,target.id,target.lap)||!want(c,target,time))target=c.target=ahead(c,world,time);
 const gas=target?.kind==='fuel';
 let wantedX=route.lane(c.z,time<(c.passUntil||0)?c.passSide:c.side),targetSpeed=Math.min(MAX_SPEED*c.pace,rivalCruiseSpeed(c.z)*1.1)*performanceFor(c.health)*(time<c.boostUntil?2:1);
 if(target){const blend=smooth((85-Math.abs(target.z-c.z))/40);wantedX+=(target.x-wantedX)*blend;if(gas)targetSpeed=Math.min(targetSpeed,17);}
 if(c.x<-ROAD_HALF+.8)targetSpeed=Math.min(targetSpeed,17);
 const ramps=route.ramps(c.z,100),ramp=ramps.filter(r=>r.z+r.d>=c.z&&r.z-r.d-c.z<85).sort((a,b)=>a.z-b.z)[0];
 // Racers line up early for a clear ramp, without abandoning an urgent fuel stop.
 if(ramp&&!gas&&(!target||target.z>ramp.z+ramp.d))wantedX=ramp.x;
 const decision=driveAround(c,others,time,wantedX,targetSpeed);({wantedX,targetSpeed}=decision);
 // Continue out of a gas bay along its tapered exit, never through the curb.
 const minimum=-ROAD_HALF+1-stationWidth(c.z)*.9;
 wantedX=clamp(wantedX,minimum,ROAD_HALF-1);
 c.v+=clamp(targetSpeed-c.v,-1.6,time<c.boostUntil?2.2:1.35);
 // Lateral travel must be possible at the current forward speed. This prevents
 // nearly stopped cars sliding sideways and pointing at the verge.
 const lateralLimit=Math.min(3.8,c.v*Math.tan(.30));
 const error=wantedX-c.x,desiredLateral=clamp(error*2,-lateralLimit,lateralLimit);
 c.lateralV=(c.lateralV||0)+clamp(desiredLateral-(c.lateralV||0),-.65,.65);
 c.lateralV=clamp(c.lateralV,-lateralLimit,lateralLimit);
 const desiredHeading=c.v>.25?Math.atan2(c.lateralV,c.v):0;
 const turn=clamp(desiredHeading-c.h,-.055,.055),travelHeading=clamp(c.h+turn,-.30,.30);
 const dx=Math.tan(travelHeading)*c.v*RACE_STEP/1000;
 const clearance=1+2.2*Math.abs(Math.sin(travelHeading));
 let nextX=clamp(c.x+dx,minimum+clearance-1,ROAD_HALF-clearance);
 for(const o of decision.nearby){if(o.v===undefined||Math.abs(o.z-c.z)>5.5)continue;
  if(c.x>o.x&&nextX<c.x)nextX=Math.max(nextX,Math.min(c.x,o.x+2.25));
  else if(c.x<o.x&&nextX>c.x)nextX=Math.min(nextX,Math.max(c.x,o.x-2.25));
 }
 c.x=nextX;
 let nextZ=Math.min(FINISH,c.z+c.v*RACE_STEP/1000);
 c.v=Math.min(c.v,(nextZ-c.z)*1000/RACE_STEP);c.z=nextZ;c.progress=c.z;c.h=c.v>.25?clamp(Math.atan2(c.x-c.previousX,Math.max(.01,c.z-c.previousZ)),-.30,.30):c.h*.8;
 const from={x:c.previousX,z:c.previousZ},to={x:c.x,z:c.z,h:c.h};
 c.rampContact=trackRamp(from,to,c.h,c.v,ramps,c.rampContact);
 const crossed=crossedRamp(from,to,c.h,c.v,ramps,c.rampContact);
 if(crossed){const fraction=clamp((crossed.z+crossed.d-from.z)/Math.max(.001,to.z-from.z),0,1);c.jump=createJump(crossed,c.v,time-RACE_STEP+fraction*RACE_STEP,crossed.z+crossed.d,{from,to});c.jump.cinematic=false;c.rampContact=null;}
 const surface=c.jump?sampleJump(c.jump,time):rampSurface(to,ramps,c.rampContact);
 c.y=surface.height;c.pitch=surface.pitch;c.roll=surface.roll||0;
 c.fuel=consumeFuel(c.fuel,Math.hypot(c.z-c.previousZ,c.x-c.previousX));
 if(c.z>=FINISH){c.finishedAt=time;c.v=0;}
}
export function advanceRaceWorld(world,time){
 if(!world||time<world.startAt)return world;
 const end=world.startAt+Math.floor((time-world.startAt)/RACE_STEP)*RACE_STEP;
 let steps=0;
 while(world.time+RACE_STEP<=end&&steps++<1200){
  const tick=world.time+RACE_STEP,candidates=[],others=world.cars.map(c=>({id:c.id,x:c.x,z:c.z,v:c.v,w:1,d:2.2}));
  for(const c of world.cars){move(c,world,tick,others);if(c.finishedAt||c.health<=0||c.y>=2.2)continue;
   for(const base of items){const lap=pickupLap(c.z),o={...base,z:base.z+lap*route.LENGTH};
    if(!pickupAvailable(world,o.id,lap)||!want(c,o,tick)||Math.abs(o.z-c.z)>12)continue;
    const dx=c.x-c.previousX,dz=c.z-c.previousZ,t=clamp(((o.x-c.previousX)*dx+(o.z-c.previousZ)*dz)/(dx*dx+dz*dz||1),0,1);
    if(Math.hypot(c.previousX+dx*t-o.x,c.previousZ+dz*t-o.z)<1.65)candidates.push({car:c,item:o,lap,time:world.time+t*RACE_STEP});
   }
  }
  // Time of crossing decides a contested icon; car ID breaks an exact tie.
  candidates.sort((a,b)=>a.time-b.time||a.car.id.localeCompare(b.car.id));
  for(const e of candidates)if(want(e.car,e.item,e.time)&&claimPickup(world,e.item,e.lap,e.car.id,e.time))e.car.target=null;
  world.time=tick;
  if(world.cars.every(c=>c.finishedAt||c.health<=0||c.fuel<=0)){world.time=end;break;}
 }
 return world;
}
export function raceWorldCars(world,time,impacts=[]){
 if(!world)return [];
 if(time<world.startAt)return rivals(time,world.startAt);
 const alpha=clamp((time-world.time)/RACE_STEP,0,1);
 return world.cars.map(c=>{
  const o={...c,h:(c.previousH??c.h)+(c.h-(c.previousH??c.h))*alpha,x:c.previousX+(c.x-c.previousX)*alpha,z:c.previousZ+(c.z-c.previousZ)*alpha,y:(c.previousY||0)+((c.y||0)-(c.previousY||0))*alpha,pitch:(c.previousPitch||0)+((c.pitch||0)-(c.previousPitch||0))*alpha,roll:(c.previousRoll||0)+((c.roll||0)-(c.previousRoll||0))*alpha};o.progress=o.z;
  const hit=impacts.find(h=>h.target===c.id);
  if(hit&&time>=hit.time&&time-hit.time<8000){const d=impactOffset(hit,time);o.x=clamp(o.x+d.x,-ROAD_HALF+1-stationWidth(o.z)*.9,ROAD_HALF-1);o.z+=d.z;o.h=clamp(o.h+d.h,-.55,.55);const clearance=1+2.2*Math.abs(Math.sin(o.h));o.x=clamp(o.x,-ROAD_HALF+clearance-stationWidth(o.z)*.9,ROAD_HALF-clearance);}
  return o;
 });
}
export function nearbyWorldCars(world,z,time,range=280,impacts=[]){return raceWorldCars(world,time,impacts).filter(c=>!c.finishedAt).map(c=>({...c,z:route.near(c.z,z)})).filter(c=>Math.abs(c.z-z)<=range);}
