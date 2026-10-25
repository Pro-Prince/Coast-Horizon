import * as route from './route.js';
import {BRIDGE,ROAD_HALF,ROAD_WIDTH} from './game-config.js';

import {batchStaticGroup} from './coast-art.js';
// Shared lightweight suspension construction; each span has its own palette and height.
export function addBridge({THREE,scene,mesh,mat,bridge=BRIDGE}){
 const group=new THREE.Group();group.name='coast-suspension-bridge';scene.add(group);
 const steel=mat(bridge.color||'#b95036'),cable=mat(bridge.color||'#aa4b35'),stone=mat('#c6c3aa'),deck=mat('#c5bbaa');
 const {start,end,height,towerHeight,ramp}=bridge,towers=[start+18,end-18];
 function vector(x,y,z){const p=route.point(x,z);return new THREE.Vector3(p.x,y,p.z);}
 function piece(geo,material,x,y,z){const p=vector(x,y,z),n=mesh(geo,material,group,p.x,p.y,p.z,true);n.rotation.y=route.angle(z);return n;}
 function bar(a,b,r,material){const delta=b.clone().sub(a);const n=mesh(new THREE.CylinderGeometry(r,r,delta.length(),8),material,group,0,0,0,true);n.position.copy(a).add(b).multiplyScalar(.5);n.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return n;}
 // The road surface is already elevated; these slabs and trusses support it.
 for(let z=start;z<end;z+=2.5)piece(new THREE.BoxGeometry(ROAD_WIDTH+3.2,.55,2.54),deck,0,height-.32,z+1.25);
 for(const z of towers){
  for(const side of [-1,1]){
   piece(new THREE.BoxGeometry(2.5,4.2,3.6),stone,side*(ROAD_HALF+1.3),1.5,z);
   piece(new THREE.BoxGeometry(1.05,height+towerHeight,1.5),steel,side*(ROAD_HALF+1.3),(height+towerHeight)/2,z);
  }
  for(const y of [height+12,height+21,height+towerHeight-.7])piece(new THREE.BoxGeometry(ROAD_WIDTH+3.65,1.05,1.3),steel,0,y,z);
 }
 function cableY(z){
  if(z<towers[0])return height+.3+(towerHeight-.3)*(z-start)/(towers[0]-start);
  if(z>towers[1])return height+.3+(towerHeight-.3)*(end-z)/(end-towers[1]);
  const t=(z-towers[0])/(towers[1]-towers[0]);return height+6+(towerHeight-6)*(2*t-1)**2;
 }
 for(const side of [-1,1]){
  const x=side*(ROAD_HALF+1.3),points=[];
  // Cable ends terminate inside anchored concrete blocks, never in mid-air.
  for(const z of [start,end]){
   piece(new THREE.BoxGeometry(2,1.65,3.2),stone,x,height+.45,z);
   piece(new THREE.BoxGeometry(1.25,.2,2.4),steel,x,height+1.3,z);
   bar(vector(x,height-.55,z),vector(x,height+.65,z),.18,steel);
  }
  for(let z=start;z<=end;z+=1)points.push(vector(x,cableY(z),z));
  const curve=new THREE.CatmullRomCurve3(points),main=new THREE.Mesh(new THREE.TubeGeometry(curve,120,.14,7,false),cable);main.castShadow=true;group.add(main);
  for(let z=start+4;z<end;z+=4)bar(vector(x,height-.1,z),vector(x,cableY(z),z),.055,cable);
  for(let z=start;z<end;z+=4){
   bar(vector(side*(ROAD_HALF+.45),height-.5,z),vector(side*(ROAD_HALF+.45),height-1.25,z+4),.09,steel);
   bar(vector(side*(ROAD_HALF+.45),height-1.25,z),vector(side*(ROAD_HALF+.45),height-.5,z+4),.09,steel);
  }
  // Continuous rails and closely spaced posts protect the driving lanes.
  for(let z=start-ramp;z<end+ramp;z+=4){
   const y=route.elevation(z),nextY=route.elevation(z+4),railX=side*(ROAD_HALF+.15);
   for(const railY of [.35,.85])bar(vector(railX,y+railY,z),vector(railX,nextY+railY,z+4),.065,steel);
   piece(new THREE.BoxGeometry(.13,.98,.13),steel,railX,y+.48,z);
  }
 }
 // Stone embankments support the climb at both ends.
 for(const [a,b] of [[start-ramp,start],[end,end+ramp]])for(let z=a;z<b;z+=2){const h=route.elevation(z+1);if(h>.05)piece(new THREE.BoxGeometry(ROAD_WIDTH+.8,h,2.1),stone,0,h/2-.35,z+1);}
 batchStaticGroup(THREE,group,{cellSize:70});return group;
}
