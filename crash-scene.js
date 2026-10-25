import * as route from './route.js';
import {CRASH_SITE} from './game-config.js';
import {cloneCarPaint} from './imported-car.js';

export function addCrashScene({THREE,scene,car,paint,mesh,mat,col,foliageGeo,leaves,bark}){
 const group=new THREE.Group();group.name='seaside-crash-scene';scene.add(group);
 const navy=mat('#273f4c'),orange=mat('#e89c54'),white=mat('#f3eddb'),lamps=[];
 function at(x,y,z){const p=route.point(x,z);return new THREE.Vector3(p.x,y,p.z);}
 function place(n,x,z,h=0){n.position.copy(at(x,0,z));n.rotation.y=route.angle(z)+h;return n;}
 function label(text,bg,fg,w=1024,h=128){
  const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);ctx.fillStyle=fg;ctx.font='bold 84px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,w/2,h/2+4);const t=new THREE.CanvasTexture(c);t.anisotropy=4;return t;
 }
 const policeLabel=new THREE.MeshBasicMaterial({map:label('POLICE','#273f4c','#f3eddb',512,128),side:THREE.DoubleSide});
 for(const [i,o] of route.crashVehicles.entries()){
  const police=o.kind==='police',g=car.clone(true),body=cloneCarPaint(paint,police?'#f3eddb':i===0?'#ba946b':'#7d9992');
  const flame=g.getObjectByName('nitro-flame');if(flame)g.remove(flame);
  g.traverse(n=>{
   if(n.material===paint){n.material=body;
    if(!police&&n.geometry){n.geometry=n.geometry.clone();const a=n.geometry.attributes.position;for(let v=0;v<a.count;v++){
     const z=a.getZ(v),y=a.getY(v);if(z>1.05&&y<1.15){const t=Math.min(1,(z-1.05)/1.1);a.setZ(v,z-t*.48);a.setY(v,y-t*.12+Math.sin(a.getX(v)*9)*t*.04);}
    }a.needsUpdate=true;n.geometry.computeVertexNormals();}
   }
   if(n.material?.userData.carTailLamp){n.material=n.material.clone();n.material.emissiveIntensity=.08;}
   if(!police&&n.position.z>1.85)n.position.z-=.38;
   if(n.isLight)n.intensity=0;
   if(n.name==='suspended-body')n.rotation.set(police?0:.025,0,police?0:(i?-.045:.04));
   if(n.name.startsWith('wheel-steering-'))n.rotation.y=police?0:(i?-.3:.25);
  });
  if(police){
   for(const side of [-1,1]){
    const sign=mesh(new THREE.PlaneGeometry(1.1,.21),policeLabel,g,side*.975,.87,-.30,false);sign.rotation.y=side*Math.PI/2;
    mesh(new THREE.BoxGeometry(.018,.1,2.15),navy,g,side*.964,.64,0,false);
   }
   mesh(new THREE.BoxGeometry(1.12,.065,.29),navy,g,0,1.87,-.2,true);
   for(const side of [-1,1]){
    const color=side<0?'#e95346':'#4caff0',m=new THREE.MeshStandardMaterial({color:col(color),emissive:col(color),emissiveIntensity:.5,roughness:.65});
    mesh(new THREE.BoxGeometry(.48,.15,.25),m,g,side*.29,1.98,-.2,false);lamps.push({m,side,index:i});
   }
  }else{
   // Bent bonnet and displaced bumper make the parked cars clearly damaged.
   const hood=mesh(new THREE.BoxGeometry(1.4,.055,.63),body,g,0,1.03,1.3,true);hood.rotation.x=i?-.20:.24;
   const bumper=mesh(new THREE.BoxGeometry(1.48,.1,.13),navy,g,i?.1:-.1,.33,1.91,true);bumper.rotation.z=i?.11:-.10;
  }
  place(g,o.x,o.z,o.h);group.add(g);
 }
 for(const o of route.crashObstacles(CRASH_SITE.z))if(o.kind==='cone'){
  const g=new THREE.Group();mesh(new THREE.BoxGeometry(.5,.08,.5),navy,g,0,.04,0,true);mesh(new THREE.CylinderGeometry(.025,.20,.6,10),orange,g,0,.36,0,true);mesh(new THREE.CylinderGeometry(.08,.12,.13,10),white,g,0,.40,0,false);place(g,o.x,o.z);group.add(g);
 }
 for(const z of [828,850,873]){
  const tree=new THREE.Group();mesh(new THREE.CylinderGeometry(.13,.2,2,8),bark,tree,0,1,0,true);
  const top=mesh(foliageGeo,leaves[2],tree,0,3.25,0,true);top.scale.set(.82,2.65,.9);place(tree,-8.05,z);group.add(tree);
 }
 const tapeMap=label('CAUTION  •  DO NOT CROSS  •','#f7cf54','#263e36',2048,128);tapeMap.wrapS=THREE.RepeatWrapping;
 function tape(a,b){
  const length=a.distanceTo(b),tex=tapeMap.clone();tex.repeat.set(length/7,1);tex.needsUpdate=true;
  const material=new THREE.MeshBasicMaterial({map:tex});
  const positions=[],uv=[],indices=[];for(let i=0;i<=30;i++){const t=i/30,p=a.clone().lerp(b,t);p.y-=Math.sin(Math.PI*t)*.25;
   positions.push(p.x,p.y-.095,p.z,p.x,p.y+.095,p.z);uv.push(1-t,0,1-t,1);if(i<30){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();group.add(new THREE.Mesh(geo,material));
  const back=geo.clone(),uvBack=back.attributes.uv;for(let i=0;i<uvBack.count;i++)uvBack.setX(i,1-uvBack.getX(i));const reversed=[...indices];for(let i=0;i<reversed.length;i+=3)[reversed[i+1],reversed[i+2]]=[reversed[i+2],reversed[i+1]];back.setIndex(reversed);group.add(new THREE.Mesh(back,material));
 }
 // Tape hangs across the sea-side trees and closes both ends of the incident.
 for(const [a,b] of [[828,850],[850,873]]){tape(at(-7.85,2.6,a),at(-7.85,2.7,b));tape(at(-7.85,1.5,a),at(-7.85,1.35,b));}
 for(const z of [828,873]){const post=mesh(new THREE.CylinderGeometry(.055,.055,1.25,8),navy,group,0,0,0,true);post.position.copy(at(-2.5,.625,z));tape(at(-2.5,1.18,z),at(-7.85,1.5,z));}
 return {update(time,z){group.visible=Math.abs(route.near(CRASH_SITE.z,z)-z)<380;for(const l of lamps)l.m.emissiveIntensity=.15+((Math.floor(time/420)+l.index+(l.side>0?1:0))%2)*1.1;}};
}
