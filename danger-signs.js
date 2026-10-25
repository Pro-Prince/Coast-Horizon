import * as route from './route.js';
import {DANGER_TURNS,roadDelta} from './road-network.js';
import {batchStaticGroup} from './coast-art.js';
export function addDangerSigns({THREE,scene,mat}){
 const root=new THREE.Group();scene.add(root);const post=mat('#505b50');
 function sign(x,z,w,h,title,subtitle){const p=route.point(x,z),g=new THREE.Group();g.position.set(p.x,route.elevation(z),p.z);g.rotation.y=route.angle(z)+Math.PI;root.add(g);
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.07,.09,2.6,6),post);pole.position.set(0,1.3,-.22);g.add(pole);
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle='#ffdc79';ctx.fillRect(0,0,512,256);ctx.strokeStyle='#374a40';ctx.lineWidth=18;ctx.strokeRect(12,12,488,232);ctx.fillStyle='#263f37';ctx.textAlign='center';ctx.font=subtitle?'bold 48px sans-serif':'bold 200px sans-serif';ctx.fillText(title,256,subtitle?100:195);if(subtitle){ctx.font='bold 34px sans-serif';ctx.fillText(subtitle,256,180);}
  const back=new THREE.Mesh(new THREE.BoxGeometry(w,h,.10),post);back.position.y=2.6;g.add(back);const texture=new THREE.CanvasTexture(canvas);texture.encoding=THREE.sRGBEncoding;const face=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture}));face.position.set(0,2.6,.057);g.add(face);
 }
 sign(8.2,3810,3.5,1.75,'TUMBLEWEEDS','GIANT ROLLERS · AVOID');
 sign(8.2,2520,3.5,1.75,'5 SHARP TURNS','BRAKE · SPACE');sign(-8.2,2610,2.4,1.2,'45 MPH','SLOW DOWN');
 DANGER_TURNS.forEach((z,i)=>{const direction=Math.sign(route.curvature(z));for(const offset of [-12,0,12])sign(-direction*8.1,z+offset,1.3,.9,direction>0?'‹':'›','');});
 batchStaticGroup(THREE,root,{cellSize:60});return {update(z){root.visible=Math.abs(roadDelta(z,3400))<1300;}};
}
