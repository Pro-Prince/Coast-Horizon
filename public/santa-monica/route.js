import {DATA} from './map-data.js';
import {sweep} from '../route.js';
export {sweep};
export const openWorld=true,LENGTH=0;
export const point=(x,z)=>({x,z}),near=z=>z,wrap=z=>z,angle=()=>0,curvature=()=>0,headingChange=()=>0,center=()=>0,tangent=()=>0;
export const bounds={minX:Math.min(...DATA.bounds.map(p=>p[0])),maxX:Math.max(...DATA.bounds.map(p=>p[0])),minZ:Math.min(...DATA.bounds.map(p=>p[2])),maxZ:Math.max(...DATA.bounds.map(p=>p[2]))};
export const outline=()=>DATA.bounds.map(p=>({x:p[0],z:p[2]}));
const terrain=new Map(),roadGrid=new Map(),solidGrid=new Map(),driveGrid=new Map(),CELL=32;
function insert(grid,item,minX,maxX,minZ,maxZ){for(let x=Math.floor(minX/CELL);x<=Math.floor(maxX/CELL);x++)for(let z=Math.floor(minZ/CELL);z<=Math.floor(maxZ/CELL);z++){const k=x+':'+z;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(item)}}
const cell=(grid,x,z)=>grid.get(Math.floor(x/CELL)+':'+Math.floor(z/CELL))||[];
function bary(x,z,a,b,c){const den=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);if(Math.abs(den)<1e-8)return null;const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/den,v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/den;return u>=-1e-5&&v>=-1e-5&&u+v<=1.00001?[u,v,1-u-v]:null;}
for(let i=0;i<DATA.terrainIndices.length;i+=3){const tri=DATA.terrainIndices.slice(i,i+3).map(i=>DATA.terrain[i]);insert(terrain,tri,Math.min(...tri.map(p=>p[0])),Math.max(...tri.map(p=>p[0])),Math.min(...tri.map(p=>p[2])),Math.max(...tri.map(p=>p[2])))}
for(const t of DATA.roadTriangles){const tri=[[t[0],0,t[1]],[t[2],0,t[3]],[t[4],0,t[5]]];insert(roadGrid,tri,Math.min(t[0],t[2],t[4]),Math.max(t[0],t[2],t[4]),Math.min(t[1],t[3],t[5]),Math.max(t[1],t[3],t[5]))}
export function elevation(z,x=0){for(const t of cell(terrain,x,z)){const b=bary(x,z,...t);if(b)return t.reduce((h,p,i)=>h+p[1]*b[i],0)+.08;}return 0;}
export const grade=(z,x=0,h=0)=>(elevation(z+Math.cos(h),x+Math.sin(h))-elevation(z-Math.cos(h),x-Math.sin(h)))/2;
export const onRoad=(x,z)=>cell(roadGrid,x,z).some(t=>bary(x,z,...t))||cell(driveGrid,x,z).some(o=>segmentDistance(x,z,...o)<5.5);
function addSolid(o){insert(solidGrid,o,o.x-o.r-5,o.x+o.r+5,o.z-o.r-5,o.z+o.r+5)}
export const wallSolids=DATA.walls.map(([ax,az,bx,bz],i)=>({id:'building-'+i,kind:'building',x:(ax+bx)/2,z:(az+bz)/2,h:Math.atan2(bx-ax,bz-az),w:.12,d:Math.hypot(bx-ax,bz-az)/2,r:Math.hypot(bx-ax,bz-az)/2}));wallSolids.forEach(addSolid);
DATA.trees.forEach((p,i)=>addSolid({id:'tree-'+i,kind:'tree',x:p[0],z:p[2],h:0,w:.28,d:.28,r:.28}));
export const boundary=DATA.bounds.map((a,i)=>{const b=DATA.bounds[(i+1)%4];return {id:'boundary-'+i,kind:'boundary',x:(a[0]+b[0])/2,z:(a[2]+b[2])/2,h:Math.atan2(b[0]-a[0],b[2]-a[2]),w:.6,d:Math.hypot(b[0]-a[0],b[2]-a[2])/2,r:Math.hypot(b[0]-a[0],b[2]-a[2])/2}});boundary.forEach(addSolid);
export function obstacles(x,z){return cell(solidGrid,x,z).filter(o=>Math.hypot(o.x-x,o.z-z)<o.r+10)}
export function validCoastPose(x,z){let sign=0;for(let i=0;i<4;i++){const a=DATA.bounds[i],b=DATA.bounds[(i+1)%4],v=(b[0]-a[0])*(z-a[2])-(b[2]-a[2])*(x-a[0]);if(Math.abs(v)<1e-4)continue;const s=Math.sign(v);if(sign&&s!==sign)return false;sign=s;}return true;}
export const inWater=()=>false,pierApproach=()=>false,PIER={};
export const onBridge=()=>false,bridgeApproach=()=>false,incidentZone=()=>false,bridgeBarriers=()=>[],crashObstacles=()=>[],hazards=()=>[];
export const travelDistance=(a,b)=>Math.hypot(b.x-a.x,b.z-a.z);
export const spawn=(role='host')=>({...DATA.spawn,x:role==='guest'?-1.8:1.8,z:-2});
export const safeSpawn=role=>spawn(role);
export function clear(x,z,r=2.7){return !obstacles(x,z).some(o=>{const dx=x-o.x,dz=z-o.z,c=Math.cos(o.h),s=Math.sin(o.h);return Math.abs(dx*c-dz*s)<o.w+r&&Math.abs(dx*s+dz*c)<o.d+r})}
function pathInfo(points){const distances=[0];for(let i=1;i<points.length;i++)distances.push(distances.at(-1)+Math.hypot(points[i][0]-points[i-1][0],points[i][2]-points[i-1][2]));return {points,distances,length:distances.at(-1)}}
export function samplePath(path,d){d=Math.max(0,Math.min(path.length-.001,d));let i=1;while(path.distances[i]<d)i++;const a=path.points[i-1],b=path.points[i],f=(d-path.distances[i-1])/(path.distances[i]-path.distances[i-1]||1);return {x:a[0]+(b[0]-a[0])*f,z:a[2]+(b[2]-a[2])*f,h:Math.atan2(b[0]-a[0],b[2]-a[2])}}
// Keep the full street network. Traffic uses sufficiently long, clear streets.
function segmentDistance(x,z,ax,az,bx,bz){const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-ax-dx*t,z-az-dz*t);}
export const drivePaths=DATA.roads.map(pathInfo).filter(p=>p.length>90).filter(p=>{let good=0;for(let i=1;i<10;i++){const q=samplePath(p,p.length*i/10);if(clear(q.x,q.z,5.5))good++;}return good>=6;});
for(const p of drivePaths)for(let i=1;i<p.points.length;i++){const a=p.points[i-1],b=p.points[i],o=[a[0],a[2],b[0],b[2]];insert(driveGrid,o,Math.min(a[0],b[0])-6,Math.max(a[0],b[0])+6,Math.min(a[2],b[2])-6,Math.max(a[2],b[2])+6)}
// Split traffic paths at blocked or clipped survey sections instead of sending cars
// through a building or beyond the exported world.
const trafficRuns=[];
for(const path of drivePaths){let run=[];for(let at=0;at<path.length;at+=5){const q=samplePath(path,at),ok=validCoastPose(q.x,q.z)&&clear(q.x,q.z,4);if(ok)run.push([q.x,0,q.z]);if((!ok||at+5>=path.length)&&run.length){const p=pathInfo(run);if(p.length>100)trafficRuns.push(p);run=[];}}}
export const trafficPaths=trafficRuns.sort((a,b)=>b.length-a.length).slice(0,20);
export function traffic(nearZ,time,range=300,impacts=[]){return trafficPaths.map((p,i)=>{
 const radius=1.8,arc=Math.PI*radius,usable=p.length-24,total=2*(usable+arc),phase=((time/1000*7+i*83)%total+total)%total;let q;
 if(phase<usable){q=samplePath(p,12+phase);q.x-=Math.cos(q.h)*radius;q.z+=Math.sin(q.h)*radius;}
 else if(phase<usable+arc){q=samplePath(p,p.length-12);const t=(phase-usable)/radius;q.x+=-radius*Math.cos(t)*Math.cos(q.h)+radius*Math.sin(t)*Math.sin(q.h);q.z+=radius*Math.cos(t)*Math.sin(q.h)+radius*Math.sin(t)*Math.cos(q.h);q.h+=t;}
 else if(phase<usable*2+arc){q=samplePath(p,p.length-12-(phase-usable-arc));q.h+=Math.PI;q.x-=Math.cos(q.h)*radius;q.z+=Math.sin(q.h)*radius;}
 else{q=samplePath(p,12);q.h+=Math.PI;const t=(phase-2*usable-arc)/radius;q.x+=-radius*Math.cos(t)*Math.cos(q.h)+radius*Math.sin(t)*Math.sin(q.h);q.z+=radius*Math.cos(t)*Math.sin(q.h)+radius*Math.sin(t)*Math.cos(q.h);q.h+=t;}
 const id='1:'+i;for(const hit of impacts){if(hit.target!==id)continue;const age=(time-hit.time)/1000;if(age<0||age>8)continue;const t=(1-Math.exp(-age*6))*(1-age/8)**2;q.x+=hit.dx*2.2*t;q.z+=hit.dz*2.4*t;q.h+=(hit.spin||0)*1.4*t;}return {id,...q,h:Math.atan2(Math.sin(q.h),Math.cos(q.h)),v:7};
 }).filter(p=>Math.abs(p.z-nearZ)<range);}
const items=[];trafficPaths.forEach((p,i)=>{for(const f of [.27,.7]){const q=samplePath(p,p.length*f);if(clear(q.x,q.z)&&items.every(o=>Math.hypot(o.x-q.x,o.z-q.z)>30))items.push({id:'sm-pickup-'+items.length,kind:items.length%3===0?'repair':'nitro',x:q.x,z:q.z});}});
export const pickups=(z,range=340)=>items.filter(p=>Math.abs(p.z-z)<=range);
export const lane=(_z,preferred=1)=>preferred*1.8;
export {DATA};
