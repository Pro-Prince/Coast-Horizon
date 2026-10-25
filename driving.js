import {CIRCUIT_LENGTH,BRIDGES,courseZ} from './game-config.js';
// Shared, deterministic driving rules. Percentages describe remaining car condition.
export const LAPS=3;
export const LAP_METRES=CIRCUIT_LENGTH;
export const TOTAL_METRES=LAPS*LAP_METRES;
export function performanceFor(health){
  const h=Math.max(0,Math.min(100,health));
  if(h>=80)return 1;
  if(h>=20)return .32+(h-20)/60*.68;
  return h/20*.32;
}
export function repairedCondition(health){return health>0?Math.min(100,health+50):0;}
export function damageFor(strength){return strength<.3?0:Math.min(24,Math.max(3,Math.round(strength*4)));}
export function advanceDistance(distance,delta){return Math.min(TOTAL_METRES,distance+delta);}
export function lapState(distance){
  const completed=Math.max(0,Math.min(LAPS,Math.floor(distance/LAP_METRES)));
  return {completed,lap:Math.min(LAPS,completed+1),remaining:LAPS-completed,finished:completed===LAPS};
}
// The surface normal gives the push direction. Offset rear hits add yaw; even a
// centered rear impact gets a small stable left/right deflection, never randomness.
export function crashImpulse(from,heading,velocity,obstacle,contact){
  const relativeX=Math.sin(heading)*velocity-Math.sin(obstacle.h||0)*(obstacle.v||0);
  const relativeZ=Math.cos(heading)*velocity-Math.cos(obstacle.h||0)*(obstacle.v||0);
  const closing=Math.max(0,-relativeX*contact.nx-relativeZ*contact.nz);
  const strength=Math.min(5,closing*.16);
  const dx=-contact.nx*strength,dz=-contact.nz*strength;
  const side=(from.x-obstacle.x)*Math.cos(obstacle.h||0)-(from.z-obstacle.z)*Math.sin(obstacle.h||0);
  const along=dz*Math.cos(obstacle.h||0)+dx*Math.sin(obstacle.h||0);
  const fallback=String(obstacle.id).split('').reduce((n,c)=>n+c.charCodeAt(0),0)%2?1:-1;
  const spin=Math.max(-1.4,Math.min(1.4,dx*.18-along*(Math.abs(side)>.12?side*.22:fallback*.16)));
  return {dx,dz,spin,strength};
}

// A lap is earned by crossing the bridge and the rest of the course in order,
// then the painted finish line. Distance alone (or driving back and forth) cannot finish.
export const FINISH_Z=2.55;
export const LAP_GATES=[...BRIDGES.flatMap(b=>[b.start,b.end]),...([2800,3500,7000,10000].map(courseZ)),LAP_METRES-250,FINISH_Z];
export const newRace=()=>({completed:0,checkpoint:0});
export const raceState=race=>lapState(race.completed*LAP_METRES);
export function advanceRace(race,from,to){
 const next={...race};if(to<=from||next.completed>=LAPS)return next;
 let cursor=from;
 while(next.completed<LAPS){
  const gate=LAP_GATES[next.checkpoint],wrapped=((cursor%LAP_METRES)+LAP_METRES)%LAP_METRES;
  let delta=((gate-wrapped)%LAP_METRES+LAP_METRES)%LAP_METRES;
  if(delta<1e-7)delta=LAP_METRES;
  cursor+=delta;if(cursor>to+1e-7)break;
  if(++next.checkpoint===LAP_GATES.length){next.completed++;next.checkpoint=0;}
 }
 return next;
}
