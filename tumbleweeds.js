import {CIRCUIT_LENGTH} from './game-config.js';
// One deterministic wind clock shared by visible plants and collision bodies.
export const TUMBLEWEEDS=[
 {id:'weed-small-0',z:3600,r:.55,phase:8}, {id:'weed-giant-0',z:3960,r:2.5,phase:2},
 {id:'weed-small-1',z:4300,r:.8,phase:29}, {id:'weed-giant-1',z:4750,r:3.1,phase:15},
 {id:'weed-small-2',z:5100,r:.65,phase:41}, {id:'weed-giant-2',z:5520,r:2.7,phase:31},
 {id:'weed-small-3',z:5800,r:1.1,phase:23}
];
const near=(z,ref)=>ref+((z-ref+CIRCUIT_LENGTH/2)%CIRCUIT_LENGTH+CIRCUIT_LENGTH)%CIRCUIT_LENGTH-CIRCUIT_LENGTH/2;
export function weedPose(w,time){const phase=((time*1.35+w.phase)%88+88)%88,x=phase-44;return {x,z:w.z+Math.sin(time*.3+w.phase)*.6,y:w.r+Math.abs(Math.sin(x/w.r))*w.r*.07,roll:-x/w.r};}
export function tumbleweedObstacles(z,time){return TUMBLEWEEDS.filter(w=>Math.abs(near(w.z,z)-z)<24).map(w=>{const p=weedPose(w,time);return {...p,y:0,z:near(p.z,z),id:w.id,kind:'tumbleweed',w:w.r*.82,d:w.r*.82,height:w.r*2,giant:w.r>2,h:0};});}
