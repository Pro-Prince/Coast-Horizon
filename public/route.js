import {impactOffset} from './traffic-impact.js';
import {INTERSECTIONS,atIntersection,inDangerTurns} from './road-network.js';
import {STATIONS} from './fuel.js';
// Deterministic 10 km coastal, desert and farmland circuit. Road coordinates are metres.
import {ROAD_HALF,BRIDGE,BRIDGES,CIRCUIT_LENGTH,TRAFFIC_COUNT,CRASH_SITE} from './game-config.js';
import {RAMP} from './stunts.js';
export const LENGTH=CIRCUIT_LENGTH;
export const wrap=z=>((z%LENGTH)+LENGTH)%LENGTH;
export const near=(z,reference)=>reference+((z-reference+LENGTH/2)%LENGTH+LENGTH)%LENGTH-LENGTH/2;
// A long coastal arc turns inland through the desert, then returns through farmland.
const knots=[[0,0],[0,400],[0,800],[100,1100],[400,1250],[750,1200],[950,1050],[1010,990],[1080,890],[990,780],[1080,670],[990,560],[1080,450],[990,340],[970,160],[1100,60],[1300,160],[1500,400],[1850,500],[2200,320],[2350,0],[2280,-350],[2450,-700],[2450,-1150],[2200,-1400],[1800,-1480],[1500,-1300],[1200,-1450],[850,-1650],[450,-1500],[200,-1200],[100,-850],[0,-400]].map(([x,z])=>({x,z}));
function spline(t){
 const count=knots.length,i=Math.floor(t)%count,u=t-Math.floor(t),a=knots[(i+count-1)%count],b=knots[i],c=knots[(i+1)%count],d=knots[(i+2)%count];
 const out={};
 for(const axis of ['x','z']){
  const A=-a[axis]+3*b[axis]-3*c[axis]+d[axis],B=2*a[axis]-5*b[axis]+4*c[axis]-d[axis],C=c[axis]-a[axis];
  out[axis]=.5*(A*u*u*u+B*u*u+C*u+2*b[axis]);out['d'+axis]=.5*(3*A*u*u+2*B*u+C);out['dd'+axis]=3*A*u+B;
 }
 return out;
}
// Arc-length sampling prevents acceleration and stretched road markings at spline knots.
const STEPS=knots.length*128,arc=[0];let previous=spline(0);
for(let i=1;i<=STEPS;i++){const p=spline(i/STEPS*knots.length);arc.push(arc[i-1]+Math.hypot(p.x-previous.x,p.z-previous.z));previous=p;}
const scale=LENGTH/arc[STEPS];
function sample(z){
 const distance=wrap(z)/scale;let lo=0,hi=STEPS;
 while(hi-lo>1){const mid=(lo+hi)>>1;if(arc[mid]<=distance)lo=mid;else hi=mid;}
 const t=(lo+(distance-arc[lo])/(arc[hi]-arc[lo]))/STEPS*knots.length,p=spline(t),speed=Math.hypot(p.dx,p.dz);
 return {x:p.x*scale,z:p.z*scale,angle:Math.atan2(p.dx,p.dz),curvature:(p.dz*p.ddx-p.dx*p.ddz)/(speed*speed*speed*scale)};
}
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export const onBridge=z=>BRIDGES.some(b=>wrap(z)>=b.start&&wrap(z)<=b.end);
export const bridgeApproach=z=>BRIDGES.some(b=>wrap(z)>b.start-b.ramp&&wrap(z)<b.end+b.ramp);
export function elevation(z){z=wrap(z);return Math.max(...BRIDGES.map(b=>b.height*Math.min(smooth((z-b.start+b.ramp)/b.ramp),smooth((b.end+b.ramp-z)/b.ramp))));}
export const grade=z=>(elevation(z+.05)-elevation(z-.05))/.1;
// Broad sheltered bays make the bridge crossings read as water, not empty parkland.
export function coastOffset(z,normal){
 z=wrap(z);return Math.max(normal,...BRIDGES.map((b,i)=>{
  const blend=Math.min(smooth((z-b.start+25)/25),smooth((b.end+25-z)/25));
  return normal+([64,96,130][i]-normal)*blend;
 }));
}
export function coastOutline(normal,steps=768){return Array.from({length:steps},(_,i)=>{const z=i/steps*LENGTH;return point(coastOffset(z,normal),z);});}
export function bridgeBarriers(z,range=20){const out=[];for(const b of BRIDGES)for(let at=b.start-b.ramp;at<=b.end+b.ramp;at+=8)for(const side of [-1,1]){const nz=near(at,z);if(Math.abs(nz-z)<range)out.push({id:'bridge-rail-'+side+'-'+at,kind:'barrier',x:side*(ROAD_HALF+.15),z:nz,h:0,w:.16,d:4.05});}return out;}
export function center(){return 0;}
export function tangent(){return 0;}
export function point(x,z){const p=sample(z);return {x:p.x+x*Math.cos(p.angle),z:p.z-x*Math.sin(p.angle)};}
export function angle(z){return sample(z).angle;}
export function curvature(z){return sample(z).curvature;}
export function headingChange(from,to){const a=angle(to)-angle(from);return Math.atan2(Math.sin(a),Math.cos(a));}
// Measure physical travel rather than centreline progress: inside lanes cover
// more route metres per second in tight bends. Callers bound large jumps first.
export function travelDistance(from,to){
 const dx=to.x-from.x,dz=to.z-from.z,steps=Math.min(128,Math.max(1,Math.ceil(Math.abs(dz)/2)));let distance=0;
 for(let i=0;i<steps;i++){const t=(i+.5)/steps,x=from.x+dx*t,z=from.z+dz*t;distance+=Math.hypot(dx/steps,dz/steps*Math.max(.3,1-x*curvature(z)));}
 return distance;
}
export function outline(offset=0,steps=512){return Array.from({length:steps},(_,i)=>point(offset,i/steps*LENGTH));}
export const bounds=(()=>{const p=outline();return {minX:Math.min(...p.map(p=>p.x)),maxX:Math.max(...p.map(p=>p.x)),minZ:Math.min(...p.map(p=>p.z)),maxZ:Math.max(...p.map(p=>p.z))};})();
const boundary=outline();
export function containsPoint(boundary,x,z){
 let inside=false;
 for(let i=0,j=boundary.length-1;i<boundary.length;j=i++){
  const a=boundary[i],b=boundary[j];if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;
 }
 return inside;
}
export const inland=(x,z)=>containsPoint(boundary,x,z);
const landBoundary=coastOutline(-9.85,768);
export const onLand=(x,z)=>containsPoint(landBoundary,x,z);
export function hazards(nearZ,range=400){
  const out=[];
  for(let i=0;i<Math.floor(LENGTH/360);i++)for(const kind of ['works','rock']){
    const side=i%2?1:-1,z=near(130+i*360+(kind==='rock'?140:0),nearZ);
    if(Math.abs(z-nearZ)<=range&&!bridgeApproach(z)&&!inDangerTurns(z)&&!atIntersection(z,45)){
      // A stable mixed layout: friends see the same ramps and roadworks each lap.
      const ramp=kind==='works'&&(i===0||i%8===5),type=ramp?'ramp':kind;
      out.push({id:type+'-'+i,kind:type,x:(kind==='works'?side:-side)*(kind==='works'?ROAD_HALF-2.35:ROAD_HALF-1.1),z,w:ramp?RAMP.halfWidth:kind==='works'?1.65:.85,d:ramp?RAMP.length/2:kind==='works'?.65:.9,height:ramp?RAMP.height:undefined,side:kind==='works'?side:-side});
    }
  }return out;
}
export const ramps=(z,range=40)=>hazards(z,range).filter(o=>o.kind==='ramp');
export function pickups(nearZ,range=350){
  const out=STATIONS.map(s=>({...s,kind:'fuel',z:near(s.z,nearZ)}));
  for(let section=0;section<LENGTH;section+=3000){
   for(const [i,z] of [60,390,900,1280,1940,2740].entries())if(section+z<LENGTH)out.push({id:'nitro-'+(section/3000*6+i),kind:'nitro',x:i%2?-1.9:1.9,z:near(section+z,nearZ)});
   for(const [i,z] of [185,1040,2080,2820].entries())if(section+z<LENGTH)out.push({id:'repair-'+(section/3000*4+i),kind:'repair',x:i%2?1.9:-1.9,z:near(section+z,nearZ)});
  }
  return out.filter(o=>Math.abs(o.z-nearZ)<=range);
}
export function lane(z,preferred=1){
  let x=preferred*ROAD_HALF*.5;
  for(const o of hazards(z,40)){
    const t=Math.max(0,Math.min(1,(36-Math.abs(z-o.z))/20)),blend=t*t*(3-2*t);
    if(o.kind==='works'||o.kind==='ramp')x=x*(1-blend)-o.side*ROAD_HALF*.5*blend;
    else if(Math.sign(x)===o.side)x-=o.side*.8*blend;
  }
  const dz=Math.abs(near(z,CRASH_SITE.z)-CRASH_SITE.z),blend=smooth((52-dz)/20);x=x*(1-blend)+ROAD_HALF*.5*blend;
  return x;
}
export function traffic(nearZ,time,range=340,impacts=[]){
  const out=[];
  for(let i=0;i<TRAFFIC_COUNT;i++){
    const preferred=i%3===1?-1:1;
    let z=near(i*LENGTH/TRAFFIC_COUNT+68+time/1000*11,nearZ);
    if(Math.abs(z-nearZ)>range+30)continue;
    let x=lane(z,preferred),h=Math.atan((lane(z+.1,preferred)-lane(z-.1,preferred))/.2),v=11;
    for(const hit of impacts){if(hit.target!==('1:'+i))continue;const age=(time-hit.time)/1000;if(age<0||age>8)continue;
      const offset=impactOffset(hit,time);x+=offset.x;z+=offset.z;h+=offset.h;v=Math.max(3,11-offset.slow);

    }
    h=Math.max(-.55,Math.min(.55,h));const clearance=1+2.2*Math.abs(Math.sin(h));x=Math.max(-ROAD_HALF+clearance,Math.min(ROAD_HALF-clearance,x));
    if(Math.abs(z-nearZ)<=range)out.push({id:'1:'+i,x,z,h,v});
  }
  for(const [i,at] of INTERSECTIONS.entries())for(let lane=0;lane<2;lane++){
    const direction=lane?1:-1,z=near(at+direction*2.2,nearZ),x=direction*(((time/1000*10+i*71+lane*280)%700)-350),id='cross:'+(i*2+lane);
    if(Math.abs(z-nearZ)>range||Math.abs(x)>150)continue;
    let pose={id,x,z,h:direction*Math.PI/2,v:10};
    for(const hit of impacts){if(hit.target!==id)continue;const age=(time-hit.time)/1000;if(age<0||age>8)continue;const offset=impactOffset(hit,time);pose.x+=offset.x;pose.z+=offset.z;pose.h+=offset.h;}
    out.push(pose);
  }return out;
}
export function safeSpawn(role,z,time){
  for(let n=0;n<30;n++){
    const blocked=hazards(z,15).some(o=>Math.abs(o.z-z)<9)||traffic(z,time,20).some(o=>Math.abs(o.z-z)<14);
    if(!blocked)return {x:role==='host'?1.65:-1.65,z,h:0,v:0};z-=12;
  }return {x:role==='host'?1.65:-1.65,z,h:0,v:0};
}

// Continuous collision against an oriented box, including relative traffic motion.
export function sweep(from,to,heading,obstacle,previous=obstacle) {
  const a=obstacle.h||0,c=Math.cos(a),s=Math.sin(a);
  const point=(p,o)=>({x:(p.x-o.x)*c-(p.z-o.z)*s,z:(p.x-o.x)*s+(p.z-o.z)*c});
  const p=point(from,previous),q=point(to,obstacle),angle=heading-a;
  const w=obstacle.w+Math.abs(Math.cos(angle))*1+Math.abs(Math.sin(angle))*2.2;
  const d=obstacle.d+Math.abs(Math.sin(angle))*1+Math.abs(Math.cos(angle))*2.2;
  let enter=0,exit=1;
  for(const [axis,size] of [['x',w],['z',d]]) {
    const delta=q[axis]-p[axis];
    if(Math.abs(delta)<1e-8){if(Math.abs(p[axis])>=size)return null;continue;}
    let lo=(-size-p[axis])/delta,hi=(size-p[axis])/delta;
    if(lo>hi)[lo,hi]=[hi,lo];
    enter=Math.max(enter,lo);exit=Math.min(exit,hi);
    if(enter>exit)return null;
  }
  if(exit<0||enter>1)return null;
  let x=p.x+(q.x-p.x)*Math.max(0,enter-.005),z=p.z+(q.z-p.z)*Math.max(0,enter-.005);
  if(Math.abs(p.x)<w&&Math.abs(p.z)<d) {
    // An overlapped spawn may drive out freely; otherwise separate along the nearest edge.
    if(Math.abs(q.x)>=w||Math.abs(q.z)>=d)return null;
    if(w-Math.abs(p.x)<d-Math.abs(p.z))x=(Math.sign(p.x)||1)*(w+.03);
    else z=(Math.sign(p.z)||-1)*(d+.03);
  }
  const alongX=w-Math.abs(x)<d-Math.abs(z),nx=alongX?(Math.sign(x)||1):0,nz=alongX?0:(Math.sign(z)||-1);
  return {x:obstacle.x+x*c+z*s,z:obstacle.z-x*s+z*c,nx:nx*c+nz*s,nz:-nx*s+nz*c};
}

// Sea-side incident: parked vehicles and cones leave the inland lane open.
export const crashVehicles=[
 {id:'wreck-1',kind:'wreck',x:-4.85,z:847,h:.5,w:1,d:2.15},
 {id:'wreck-2',kind:'wreck',x:-5.7,z:851,h:Math.PI-.45,w:1,d:2.15},
 {id:'police-1',kind:'police',x:-4.55,z:835,h:.17,w:1,d:2.2},
 {id:'police-2',kind:'police',x:-4.9,z:865,h:Math.PI+.12,w:1,d:2.2}
];
export function incidentZone(z){return Math.abs(near(z,CRASH_SITE.z)-CRASH_SITE.z)<CRASH_SITE.radius;}
export function crashObstacles(z,range=35){return [
 ...crashVehicles,
 ...[829,834,840,846,852,858,864,870].map((at,i)=>({id:'crash-cone-'+i,kind:'cone',x:-2.5,z:at,h:0,w:.2,d:.2})),
 ...[828,850,873].map(at=>({id:'crash-tree-'+at,kind:'tree',x:-8.05,z:at,h:0,w:.55,d:.7}))
 ].map(o=>({...o,z:near(o.z,z)})).filter(o=>Math.abs(o.z-z)<range);}
