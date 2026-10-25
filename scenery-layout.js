import * as route from './route.js';
import {biomeAt} from './biomes.js';
const road=route.outline(0,2048);
export function roadDistance(x,z){let best=Infinity;for(let i=0;i<road.length;i++){const a=road[i],b=road[(i+1)%road.length],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));best=Math.min(best,Math.hypot(x-a.x-t*dx,z-a.z-t*dz));}return best;}
export function duneLayout(at,random){
 const b=biomeAt(at),out=[];
 for(const side of (b.inland>.98?[-1,1]:[1])){
  const p=route.point(side*(180+random()*110),at),d={x:p.x,y:-3,z:p.z,w:48+random()*35,h:10+random()*16,d:65+random()*45};
  // Check against the entire course, including other legs of a hairpin.
  if(roadDistance(d.x,d.z)>Math.max(d.w,d.d)+22)out.push(d);
 }return out;
}
