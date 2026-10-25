import {STATIONS,stationWidth,stationDelta} from './fuel.js';
import * as route from './route.js';
import {ROAD_HALF} from './game-config.js';
import {batchStaticGroup} from './coast-art.js';
export function addGasStations({THREE,scene,mat}){
 const groups=[],cream=mat('#f6e8c8'),paint=mat('#d89643'),asphalt=mat('#68625e'),dark=mat('#26554c'),white=mat('#fff5d6');
 function box(g,w,h,d,x,y,z,m){const p=route.point(x,z),n=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);n.position.set(p.x,y,p.z);n.rotation.y=route.angle(z);n.receiveShadow=true;g.add(n);return n;}
 for(const s of STATIONS){const g=new THREE.Group();scene.add(g);groups.push({g,z:s.z});
  const vertices=[],indices=[];
  for(let i=0;i<=130;i++){const z=s.z-65+i,w=stationWidth(z);for(const x of [-ROAD_HALF+.1,-ROAD_HALF-w]){const p=route.point(x,z);vertices.push(p.x,.045,p.z);}if(i<130){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();const pavement=new THREE.Mesh(geo,asphalt);pavement.material=asphalt;pavement.receiveShadow=true;g.add(pavement);
  for(let dz=-64;dz<65;dz+=2){const z=s.z+dz,w=stationWidth(z);if(w<.1)continue;
   const a=route.point(-ROAD_HALF-stationWidth(z-1),z-1),b=route.point(-ROAD_HALF-stationWidth(z+1),z+1),edge=new THREE.Mesh(new THREE.BoxGeometry(.18,.36,Math.hypot(b.x-a.x,b.z-a.z)+.08),cream);edge.position.set((a.x+b.x)/2,.15,(a.z+b.z)/2);edge.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);g.add(edge);
  }
  box(g,17,3,32,-23.8,-1.5,s.z,cream);
  // Pumps sit beyond the open driving bay; the glowing pickup stays in its centre.
  box(g,8,.35,22,-22,.10,s.z,cream);box(g,8,.45,22,-22,4.6,s.z,paint);
  for(const dz of [-8,8]){box(g,.3,4.4,.3,-23,2.2,s.z+dz,cream);box(g,1.2,1.9,.9,-19,1,s.z+dz,white);box(g,1.22,.55,.92,-19,1.35,s.z+dz,dark);}
  box(g,5,3,10,-26,1.5,s.z,cream);box(g,.05,1.5,7,-23.45,1.8,s.z,dark);
  const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#26554c';ctx.fillRect(0,0,512,256);ctx.fillStyle='#fff1b5';ctx.textAlign='center';ctx.font='bold 65px sans-serif';ctx.fillText('FUEL →',256,102);ctx.font='28px sans-serif';ctx.fillText('PULL IN · FILL UP',256,166);
  const signMat=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c)});
  box(g,.2,4,.2,-9,2,s.z-48,cream);const sign=box(g,4,2,.14,-9,4.3,s.z-48,signMat);sign.rotation.y+=Math.PI;

  // A service-station silhouette: lit canopy fascia, pump islands, hoses,
  // glazed shopfront and a tall roadside fuel-price pylon.
  const navy=mat('#213d42'),red=mat('#c97650'),glazing=mat('#527a80');
  box(g,8.15,.18,22.15,-22,4.32,s.z,white);
  box(g,5.3,.32,10.4,-26,3.18,s.z,navy);
  box(g,.12,2.2,7.6,-23.4,1.4,s.z,glazing);
  for(const dz of [-3.8,0,3.8])box(g,.16,2.5,.12,-23.3,1.5,s.z+dz,cream);
  for(const dz of [-8,8]){
   box(g,1.3,.32,1.05,-19,1.95,s.z+dz,red);
   box(g,.12,.33,.35,-18.3,1.2,s.z+dz,navy);
   const a=route.point(-18.4,s.z+dz),b=route.point(-18,s.z+dz+.5),c=route.point(-18.3,s.z+dz+.85);
   const hose=new THREE.CatmullRomCurve3([new THREE.Vector3(a.x,1.6,a.z),new THREE.Vector3(b.x,.4,b.z),new THREE.Vector3(c.x,1.1,c.z)]);
   g.add(new THREE.Mesh(new THREE.TubeGeometry(hose,12,.045,5,false),navy));
  }
  function board(x,y,z,w,h,lines){
   const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;const ct=canvas.getContext('2d');ct.fillStyle='#19383f';ct.fillRect(0,0,512,512);
   ct.fillStyle='#e7b36c';ct.fillRect(0,0,512,100);ct.textAlign='center';ct.font='bold 45px sans-serif';ct.fillStyle='#19383f';ct.fillText(lines[0],256,68);
   ct.fillStyle='#f5f1e7';ct.font='bold 58px sans-serif';ct.fillText(lines[1],256,212);ct.font='32px sans-serif';ct.fillText(lines[2],256,307);ct.fillStyle='#e7b36c';ct.font='28px sans-serif';ct.fillText(lines[3],256,425);
   const tex=new THREE.CanvasTexture(canvas);tex.encoding=THREE.sRGBEncoding;
   const q=box(g,w,h,.18,x,y,z,navy),pos=route.point(x,z);const face=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex}));face.position.copy(q.position);face.rotation.y=route.angle(z)+Math.PI;face.position.x-=Math.sin(route.angle(z))*.105;face.position.z-=Math.cos(route.angle(z))*.105;g.add(face);
  }
  box(g,.38,9,.38,-30,4.5,s.z-25,navy);
  board(-30,8,s.z-25,4.4,5.5,['COAST FUEL','OPEN 24H','FUEL · COFFEE','SERVICE AREA →']);
  board(-23,3.4,s.z-11.15,5,1.6,['COAST FUEL','FILL & GO','FULL TANK','WELCOME']);
  for(const dz of [-16,16])for(let x=-17;x>-27;x-=2)box(g,1.3,.015,.15,x,.065,s.z+dz,white);
  batchStaticGroup(THREE,g,{cellSize:35});
 }
 return {count:groups.length,update(z){for(const e of groups)e.g.visible=Math.abs(stationDelta(z,e.z))<420;}};
}
