import * as route from './route.js';
import {loadSurfaces} from './surfaces.js';
import {foliageAssets} from './foliage.js';
export async function createSantaWorld({THREE,scene,mat,mesh}){
 const [model,meta,surfaces]=await Promise.all([new THREE.GLTFLoader().loadAsync('/santa-monica/district.glb'),fetch('/santa-monica/district.json').then(r=>r.json()),loadSurfaces(THREE)]);
 surfaces.district(model.scene);scene.add(model.scene);const cells=[];
 const register=n=>{n.geometry.computeBoundingSphere();const c=n.geometry.boundingSphere;cells.push({n,x:c.center.x,z:c.center.z,r:c.radius,shadow:n.castShadow});};
 model.scene.traverse(n=>{if(!n.isMesh)return;n.geometry.computeVertexNormals();n.castShadow=n.name.startsWith('buildings');n.receiveShadow=true;register(n)});
 // Draw the full connected street network; junctions are open in every direction.
 const roadMat=surfaces.surface('asphalt','#9ca3a6',.3);roadMat.side=THREE.DoubleSide;roadMat.polygonOffset=true;roadMat.polygonOffsetFactor=-1;roadMat.polygonOffsetUnits=-2;
 const paint=mat('#e7d7a1'),batches=new Map();
 function ribbon(a,b,width,y,material){const dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz);if(l<.01)return;const nx=dz/l,nz=-dx/l;const k=Math.floor(a.x/100)+':'+Math.floor(a.z/100)+':'+material.uuid;let g=batches.get(k);if(!g){g={p:[],uv:[],ix:[],material};batches.set(k,g)}const off=g.p.length/3;for(const [p,s]of[[a,-1],[a,1],[b,-1],[b,1]]){const x=p.x+nx*width*s,z=p.z+nz*width*s;g.p.push(x,route.elevation(z,x)+y,z);g.uv.push(x/18,z/18)}g.ix.push(off,off+2,off+1,off+1,off+2,off+3);}
 for(const path of route.drivePaths){for(let s=0;s<path.length-1;s+=3){const a=route.samplePath(path,s),b=route.samplePath(path,Math.min(path.length,s+3));ribbon(a,b,5.5,.06,roadMat);if(Math.floor(s/3)%4===0&&route.clear(a.x,a.z,1))ribbon(a,b,.065,.09,paint);}}
 for(const g of batches.values()){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(g.p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(g.uv,2));geo.setIndex(g.ix);geo.computeVertexNormals();const n=new THREE.Mesh(geo,g.material);n.name='city-streets';n.receiveShadow=true;scene.add(n);register(n)}
 const foliage=foliageAssets(THREE),bark=mat('#77654f'),trunk=new THREE.CylinderGeometry(.15,.25,1,6),matrix=new THREE.Matrix4(),quat=new THREE.Quaternion(),buckets=new Map();
 for(const p of route.DATA.trees){const k=Math.floor(p[0]/90)+':'+Math.floor(p[2]/90);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(p)}
 for(const list of buckets.values()){
  const canopy=new THREE.InstancedMesh(foliage.geometry,foliage.material,list.length),core=new THREE.InstancedMesh(foliage.coreGeometry,foliage.coreMaterial,list.length),stems=new THREE.InstancedMesh(trunk,bark,list.length);
  let x=0,z=0;list.forEach((p,i)=>{const w=Math.max(.8,Math.min(4,p[3])),h=Math.max(1.1,Math.min(6,p[4])),top=Math.max(h+1,Math.min(10,p[5]));matrix.compose(new THREE.Vector3(p[0],p[1]+top,p[2]),quat,new THREE.Vector3(w,h,w));canopy.setMatrixAt(i,matrix);core.setMatrixAt(i,matrix);matrix.compose(new THREE.Vector3(p[0],p[1]+top*.5,p[2]),quat,new THREE.Vector3(1,top,1));stems.setMatrixAt(i,matrix);x+=p[0];z+=p[2]});
  for(const n of [canopy,core,stems]){n.name='city-trees';n.frustumCulled=false;n.receiveShadow=true;scene.add(n);cells.push({n,x:x/list.length,z:z/list.length,r:70,shadow:false})}
 }
 // Visible survey edge: low barriers show where this exported district ends.
 const railMat=mat('#d4cbb3'),postMat=mat('#546b69'),posts=[];
 for(const edge of route.boundary){const c=Math.cos(edge.h),s=Math.sin(edge.h);for(let t=-edge.d;t<edge.d;t+=6){const x=edge.x+s*t,z=edge.z+c*t;if(!route.onRoad(x,z))continue;posts.push([x,z,edge.h])}}
 for(const [x,z,h]of posts){const n=mesh(new THREE.BoxGeometry(.3,.7,5.7),railMat,scene,x,route.elevation(z,x)+.45,z,false);n.rotation.y=h;const pole=mesh(new THREE.BoxGeometry(.4,1.1,.4),postMat,scene,x,route.elevation(z,x)+.55,z,false);for(const m of [n,pole]){m.geometry=m.geometry.clone();m.updateMatrixWorld();m.geometry.applyMatrix4(m.matrixWorld);m.position.set(0,0,0);m.rotation.set(0,0,0);register(m)}}
 const svg=document.getElementById('cityMap'),dot=document.getElementById('cityDot'),peer=document.getElementById('cityPeer'),hint=document.getElementById('cityHint');
 const minX=route.bounds.minX,minZ=route.bounds.minZ,scale=124/Math.max(route.bounds.maxX-minX,route.bounds.maxZ-minZ),mx=x=>8+(x-minX)*scale,my=z=>8+(z-minZ)*scale;
 svg.querySelector('path').setAttribute('d',route.DATA.roads.map(path=>path.map((p,i)=>(i?'L':'M')+mx(p[0]).toFixed(1)+','+my(p[2]).toFixed(1)).join(' ')).join(' '));let frame=0;
 return {meta,update(x,z,other){dot.setAttribute('cx',mx(x));dot.setAttribute('cy',my(z));peer.style.display=other?.visible?'':'none';if(other?.visible){peer.setAttribute('cx',mx(other.position.x));peer.setAttribute('cy',my(other.position.z))}hint.textContent=route.obstacles(x,z).some(o=>o.kind==='boundary'&&Math.abs((x-o.x)*Math.cos(o.h)-(z-o.z)*Math.sin(o.h))<35)?'EDGE OF MAP · TURN BACK':'SANTA MONICA · FREE DRIVE';if(++frame%6)return;for(const c of cells){const d=Math.hypot(c.x-x,c.z-z);c.n.visible=d<c.r+310;c.n.castShadow=c.shadow&&d<c.r+45;}},dispose(){}};
}
