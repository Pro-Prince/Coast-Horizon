import {CIRCUIT_LENGTH,courseZ} from './game-config.js';
export const INTERSECTIONS=[3750,5350,6250,7650,9350,10050].map(courseZ);
export const roadDelta=(z,at)=>((z-at+CIRCUIT_LENGTH/2)%CIRCUIT_LENGTH+CIRCUIT_LENGTH)%CIRCUIT_LENGTH-CIRCUIT_LENGTH/2;
export const atIntersection=(z,radius=6)=>INTERSECTIONS.some(at=>Math.abs(roadDelta(z,at))<radius);
export const DANGER_TURNS=[2690,2862,3033,3205,3377].map(courseZ);
export const inDangerTurns=z=>{z=((z%CIRCUIT_LENGTH)+CIRCUIT_LENGTH)%CIRCUIT_LENGTH;return z>courseZ(2600)&&z<courseZ(3460);};
