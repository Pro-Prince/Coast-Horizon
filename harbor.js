import * as route from './route.js';
import {BRIDGES,ROAD_HALF} from './game-config.js';
import {batchStaticGroup} from './coast-art.js';
// Three small channel boats and a 33-yacht regatta along the coastal bays.
export const SAILBOAT_COUNT=36;
export function sailPose(index,time){
 if(index<3){const b=BRIDGES[index],t=time*.025+index*2.1;return {x:-32+50*Math.cos(t),z:(b.start+b.end)/2+10*Math.sin(t),h:Math.atan2(-50*Math.sin(t),10*Math.cos(t)),size:index===0?.36:1};}
 const i=index-3,group=Math.floor(i/11),slot=i%11,t=time*.015+i*1.7;
 return {x:-58-(slot%4)*27+Math.sin(t)*5,z:[230,760,1270][group]+Math.floor(slot/4)*40+Math.cos(t)*8,h:Math.PI*.12+Math.sin(t)*.16,size:.75+(i%4)*.14};
}
export function addHarbor({THREE,scene,mesh,mat}){
 const white=mat('#f5ebd3'),cream=mat('#ddd2b4'),navy=mat('#284f60'),wood=mat('#b88e5d');
 white.side=THREE.DoubleSide;const box=new THREE.BoxGeometry(1,1,1);
 function part(g,m,x,y,z,w,h,d){const n=mesh(box,m,g,x,y,z,false);n.scale.set(w,h,d);return n;}
 const template=new THREE.Group(),outline=new THREE.Shape();outline.moveTo(-1.3,-2.8);outline.lineTo(1.3,-2.8);outline.lineTo(1.3,1.8);outline.quadraticCurveTo(.9,3.1,0,3.65);outline.quadraticCurveTo(-.9,3.1,-1.3,1.8);outline.closePath();
 const hull=new THREE.ExtrudeGeometry(outline,{depth:.65,bevelEnabled:false,curveSegments:4});hull.rotateX(Math.PI/2);mesh(hull,navy,template,0,.6,0,false);
 part(template,cream,0,.68,0,2.35,.14,5.5);part(template,white,0,1,-.5,1.5,.8,2);part(template,wood,0,3.9,.4,.09,6.5,.09);
 for(const points of [[[.04,1.2,.5],[.04,7.1,.5],[.04,1.2,-3]],[[-.04,1.2,.75],[-.04,6.7,.75],[-.04,1.2,3]]]){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));geo.setIndex([0,1,2]);geo.computeVertexNormals();mesh(geo,white,template,0,0,0,false);}
 batchStaticGroup(THREE,template);template.updateMatrixWorld(true);
 // Shared low-poly instances: 36 boats use only a few draw calls per bay.
 const clusters=[],matrix=new THREE.Matrix4(),transform=new THREE.Object3D();
 for(const indices of [[0],[1],[2],Array.from({length:11},(_,i)=>i+3),Array.from({length:11},(_,i)=>i+14),Array.from({length:11},(_,i)=>i+25)]){
  const g=new THREE.Group(),batches=[];scene.add(g);
  template.traverse(n=>{if(!n.isMesh)return;const geometry=n.geometry.clone().applyMatrix4(n.matrixWorld),batch=new THREE.InstancedMesh(geometry,n.material,indices.length);batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);batch.castShadow=false;batch.receiveShadow=false;batch.frustumCulled=false;g.add(batch);batches.push(batch);});clusters.push({g,batches,indices});
 }
 // Chevrons warn of the tighter bends without cluttering every stretch.
 const warning=new THREE.Group();scene.add(warning);
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#f7d57b';ctx.fillRect(0,0,128,128);ctx.strokeStyle='#264b42';ctx.lineWidth=17;ctx.beginPath();ctx.moveTo(41,22);ctx.lineTo(83,64);ctx.lineTo(41,106);ctx.stroke();const signMat=mat('#ffffff');signMat.map=new THREE.CanvasTexture(canvas);
 let last=-200,signCount=0;
 for(let z=160;z<route.LENGTH-100;z+=12){if(Math.abs(route.curvature(z))<.016||z-last<130||route.bridgeApproach(z))continue;last=z;
  for(let i=0;i<3;i++){const at=z-32+i*15,x=(route.curvature(z)>0?-1:1)*(ROAD_HALF+1.15),p=route.point(x,at),g=new THREE.Group();g.position.set(p.x,route.elevation(at),p.z);g.rotation.y=route.angle(at)+Math.PI;warning.add(g);part(g,navy,0,1,0,.09,2,.09);const face=mesh(new THREE.PlaneGeometry(1.15,1.15),signMat,g,0,1.8,0,false);if(route.curvature(z)>0)face.rotation.z=Math.PI;signCount++;}
 }
 batchStaticGroup(THREE,warning,{cellSize:90});
 function update(time,z){for(const c of clusters){c.g.visible=c.indices.some(i=>Math.abs(route.near(sailPose(i,time).z,z)-z)<460);if(!c.g.visible)continue;
  c.indices.forEach((index,j)=>{const p=sailPose(index,time),world=route.point(p.x,p.z);transform.position.set(world.x,-.10+Math.sin(time*.7+index)*.025,world.z);transform.rotation.set(0,route.angle(p.z)+p.h,Math.sin(time*.45+index)*.012);transform.scale.setScalar(p.size);transform.updateMatrix();for(const b of c.batches)b.setMatrixAt(j,transform.matrix);});for(const b of c.batches)b.instanceMatrix.needsUpdate=true;
 }}
 update(0,0);return {update,count:SAILBOAT_COUNT,signCount};
}
