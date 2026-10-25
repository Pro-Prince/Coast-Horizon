import * as route from './route.js';
import {roadDistance} from './scenery-layout.js';
import {batchStaticGroup} from './coast-art.js';
export function addHillsideSign({THREE,scene,mat}){
 const at=[4400,4600,4900].find(z=>{const p=route.point(120,z);return roadDistance(p.x,p.z)>75;})||4400;
 const p=route.point(120,at),root=new THREE.Group();root.name='VITALI-landmark';scene.add(root);
 const hill=new THREE.Mesh(new THREE.SphereGeometry(1,24,14),mat('#b8a27b'));hill.position.set(p.x,-2,p.z);hill.scale.set(50,25,60);root.add(hill);
 const front=route.point(86,at),sign=new THREE.Group();sign.position.set(front.x,17,front.z);sign.rotation.y=route.angle(at)-Math.PI/2;root.add(sign);
 const white=mat('#f5eee0'),steel=mat('#6c7165');
 const paths={V:[[-2,6,0,0],[0,0,2,6]],I:[[0,0,0,6],[-1,6,1,6],[-1,0,1,0]],T:[[-2,6,2,6],[0,0,0,6]],A:[[-2,0,0,6],[0,6,2,0],[-1.3,2.2,1.3,2.2]],L:[[-1.5,6,-1.5,0],[-1.5,0,2,0]]};
 [...'VITALI'].forEach((letter,i)=>{const g=new THREE.Group();g.position.set((i-2.5)*6.4,[.2,1.3,1.6,.9,.3,-.2][i],0);g.rotation.z=[-.045,.03,-.02,.04,-.03,.02][i];sign.add(g);
  for(const [x1,y1,x2,y2] of paths[letter]){const n=new THREE.Mesh(new THREE.BoxGeometry(1.05,Math.hypot(x2-x1,y2-y1)+.2,.38),white);n.position.set((x1+x2)/2,(y1+y2)/2,0);n.rotation.z=-Math.atan2(x2-x1,y2-y1);g.add(n);}
  const post=new THREE.Mesh(new THREE.BoxGeometry(.18,7,.18),steel);post.position.set(0,-2,-.8);g.add(post);
 });batchStaticGroup(THREE,root,{cellSize:80});
 return {at,update(z){root.visible=Math.abs(route.near(at,z)-z)<560;}};
}
