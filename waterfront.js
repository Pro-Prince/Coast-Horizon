import * as route from './route.js';
import {biomeAt} from './biomes.js';

function distance(x,z,outline){
 let nearest=Infinity;
 for(let i=0;i<outline.length;i++){
  const a=outline[i],b=outline[(i+1)%outline.length],dx=b.x-a.x,dz=b.z-a.z;
  const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));
  nearest=Math.min(nearest,Math.hypot(x-a.x-dx*t,z-a.z-dz*t));
 }
 return nearest;
}

// One deterministic city layout, generated once. No per-frame building work.
export function waterfrontLayout(occupied=[]){
 const road=route.outline(0,512),shore=route.coastOutline(-9.85,768),out=[];
 const colors=['#e4c5a4','#d6d8be','#dcb69b','#e9dac0','#b9cdc3'];
 let seed=62018;
 const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let at=32;at<route.LENGTH;at+=32){
  if(biomeAt(at).coast<.9)continue;
  for(const offset of [80,112,144,176]){
   const p=route.point(offset,at),x=p.x,z=p.z;
   const roadDistance=distance(x,z,road);
   if(roadDistance<65||roadDistance>205||!route.onLand(x,z)||distance(x,z,shore)<20)continue;
   if(out.some(b=>Math.abs(b.x-x)<22&&Math.abs(b.z-z)<22))continue;
   if(occupied.some(b=>x+12>b.minX&&x-12<b.maxX&&z+12>b.minZ&&z-12<b.maxZ))continue;
   if(![-12,12].every(dx=>[-12,12].every(dz=>route.onLand(x+dx,z+dz))))continue;
   out.push({x,z,w:12+random()*5,d:12+random()*5,h:9+Math.floor(random()*5)*3.2,color:colors[out.length%colors.length]});
  }
 }
 return out;
}
