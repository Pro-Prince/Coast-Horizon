import {TUMBLEWEEDS,weedPose} from './tumbleweeds.js';
import {duneLayout,roadDistance} from './scenery-layout.js';
import {createCorn} from './corn.js';
import {scenicRoadClearance} from './scenic-roads.js';
import {boundInstances} from './render-bounds.js';
import * as route from './route.js';
import {biomeAt,outerLandWidth,tumbleweedPose} from './biomes.js';
import {ROAD_HALF} from './game-config.js';

export function addBiomeWorld({THREE,scene,segments,mat,groundDetails,renderer}){
 const terrainMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1});
 const duneMat=mat('#d0ac74'),sand=mat('#dfbd83'),cactus=mat('#6f8c56'),rock=mat('#b98c65');
 if(groundDetails){groundDetails.apply(terrainMaterial,'vertex');groundDetails.apply(duneMat,0);groundDetails.apply(sand,0);}
 const corn=createCorn(THREE,renderer);
 const palettes=['#8eaa62','#d5b47d','#82964c'].map(c=>new THREE.Color(c).convertSRGBToLinear());
 function groundColor(z){const b=biomeAt(z);return new THREE.Color(palettes[0].r*b.coast+palettes[1].r*b.desert+palettes[2].r*b.field,palettes[0].g*b.coast+palettes[1].g*b.desert+palettes[2].g*b.field,palettes[0].b*b.coast+palettes[1].b*b.desert+palettes[2].b*b.field);}
 const cylinder=new THREE.CylinderGeometry(1,1,1,8),sphere=new THREE.SphereGeometry(1,10,7),stone=new THREE.DodecahedronGeometry(1,0),box=new THREE.BoxGeometry(1,1,1);
 const matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0),cropBatches=[],weeds=[];let cactusCount=0,cornCount=0,signPlaced=false;
 function instances(parent,geometry,material,parts){if(!parts.length)return null;const m=new THREE.InstancedMesh(geometry,material,parts.length);m.frustumCulled=false;m.receiveShadow=true;m.castShadow=false;
  parts.forEach((p,i)=>{q.setFromAxisAngle(p.horizontal?new THREE.Vector3(0,0,1):up,p.horizontal?Math.PI/2:(p.angle||0));matrix.compose(new THREE.Vector3(p.x,p.y,p.z),q,new THREE.Vector3(p.w,p.h,p.d));m.setMatrixAt(i,matrix);});m.instanceMatrix.needsUpdate=true;boundInstances(THREE,m);parent.add(m);return m;}
 function terrain(segment){
  const positions=[],colors=[],indices=[],blends=[];
  for(let j=0;j<=10;j++){const z=segment.at-25+j*5,c=groundColor(z),xs=[-outerLandWidth(z),-30,-ROAD_HALF,0,ROAD_HALF,30,650];
   xs[1]=Math.max(xs[0],xs[1]);
   for(const x of xs){const p=route.point(x,z);positions.push(p.x,-.045,p.z);colors.push(c.r,c.g,c.b);blends.push(1-biomeAt(z).desert);}
   if(j<10)for(let i=0;i<6;i++){const k=j*7+i;indices.push(k,k+7,k+1,k+1,k+7,k+8);}
  }
  // Wide terrain ribbons can fold at tight bends; keep every face upward.
  for(let i=0;i<indices.length;i+=3){const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3;const normalY=(positions[b+2]-positions[a+2])*(positions[c]-positions[a])-(positions[b]-positions[a])*(positions[c+2]-positions[a+2]);if(normalY<0)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setAttribute('groundBlend',new THREE.Float32BufferAttribute(blends,1));g.setIndex(indices);g.computeVertexNormals();const m=new THREE.Mesh(g,terrainMaterial);m.receiveShadow=true;g.computeBoundingSphere();m.frustumCulled=true;segment.group.add(m);
 }
 const rowMat=mat('#879956'),barnMat=mat('#b46448'),roofMat=mat('#e6d2a2'),siloMat=mat('#b9bda6');
 for(const segment of segments){const b=biomeAt(segment.at);if(b.inland<.001)continue;terrain(segment);
  let seed=(segment.at*7381+321)>>>0;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  if(b.desert>.03){const trunks=[],caps=[],rocks=[];
   for(let i=0;i<14;i++){if(random()>b.desert)continue;const side=b.inland<.98?1:i%2?1:-1,x=side*(10+random()*95),z=segment.at-24+random()*48,p=route.point(x,z),h=2.1+random()*3.4,r=.27+random()*.2;if(scenicRoadClearance(x,z)||roadDistance(p.x,p.z)<ROAD_HALF+2)continue;cactusCount++;
    trunks.push({x:p.x,y:h/2,z:p.z,w:r,h,d:r});caps.push({x:p.x,y:h,z:p.z,w:r,h:r,d:r});
    for(const arm of [-1,1]){const y=h*(.35+random()*.2),reach=.55+random()*.55,tip=h*(.75+random()*.15);trunks.push({x:p.x+arm*reach/2,y,z:p.z,w:r*.65,h:reach,d:r*.65,horizontal:true},{x:p.x+arm*reach,y:(y+tip)/2,z:p.z,w:r*.65,h:tip-y,d:r*.65});caps.push({x:p.x+arm*reach,y:tip,z:p.z,w:r*.65,h:r*.65,d:r*.65});}
   }
   for(let i=0;i<4;i++){const x=(b.inland<.98?1:i%2?1:-1)*(16+random()*110),z=segment.at-24+random()*48,p=route.point(x,z),size=1+random()*3;if(scenicRoadClearance(x,z)||roadDistance(p.x,p.z)<ROAD_HALF+size+2)continue;rocks.push({x:p.x,y:size*.35,z:p.z,w:size,h:size*.65,d:size*.8,angle:random()*6});}
   const dunes=duneLayout(segment.at,random);instances(segment.group,sphere,duneMat,dunes);
   instances(segment.group,cylinder,cactus,trunks);instances(segment.group,sphere,cactus,caps);instances(segment.group,stone,rock,rocks);
   // Flat, tapered drifts cross the asphalt without creating invisible obstacles.
   if(segment.at%200===0&&b.desert>.8){const pos=[],idx=[];for(let j=0;j<=12;j++){const z=segment.at-7+j*1.1,half=Math.sin(j/12*Math.PI)*ROAD_HALF*.78,center=Math.sin(j*.28)*1.3;for(const x of [center-half,center+half]){const p=route.point(x,z);pos.push(p.x,.022,p.z);}if(j<12){const k=j*2;idx.push(k,k+2,k+1,k+1,k+2,k+3);}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();const drift=new THREE.Mesh(g,sand);drift.receiveShadow=true;segment.group.add(drift);}

  }
  if(b.field>.03){
   const rows=[],stalks=[],farStalks=[];
   for(const side of [-1,1])for(let row=0;row<44;row++){
    const x=side*(10.5+row*1.15);for(let j=0;j<5;j++){const z=segment.at-20+j*10,p=route.point(x,z);if(scenicRoadClearance(x,z))continue;rows.push({x:p.x,y:.015,z:p.z,w:.85,h:.018,d:10.2,angle:route.angle(z)});}
    if(row<44)for(let j=0;j<42;j++){if(random()>b.field)continue;const z=segment.at-24+j*1.15+(row%2)*.55+random()*.2,p=route.point(x+(random()-.5)*.4,z),size=.9+random()*.2;if(scenicRoadClearance(x,z))continue;(row<2?stalks:farStalks).push({x:p.x,y:0,z:p.z,w:size,h:size,d:size,angle:random()*6});}
   }
   instances(segment.group,box,rowMat,rows);
   for(const [geo,material] of [[corn.leaves,corn.foliage],[corn.structure,corn.stalk]]){const crops=instances(segment.group,geo,material,stalks);if(crops){crops.layers.set(1);cropBatches.push({m:crops,z:segment.at,near:true});}}const nearProxy=instances(segment.group,corn.distant,corn.distantMaterial,stalks);if(nearProxy){nearProxy.layers.set(1);cropBatches.push({m:nearProxy,z:segment.at,proxy:true});}cornCount+=stalks.length;
   const distant=instances(segment.group,corn.distant,corn.distantMaterial,farStalks);if(distant){distant.layers.set(1);cropBatches.push({m:distant,z:segment.at});cornCount+=farStalks.length;}
   if(segment.at%650===0&&b.field>.9){const p=route.point(100,segment.at),g=new THREE.Group();g.position.set(p.x,0,p.z);segment.group.add(g);
    const body=new THREE.Mesh(new THREE.BoxGeometry(13,6,19),barnMat);body.position.y=3;g.add(body);const roof=new THREE.Mesh(new THREE.ConeGeometry(1,1,4),roofMat);roof.scale.set(9.8,4,14);roof.rotation.y=Math.PI/4;roof.position.y=8;g.add(roof);
    const silo=new THREE.Mesh(new THREE.CylinderGeometry(3,3,10,12),siloMat);silo.position.set(13,5,0);g.add(silo);const cap=new THREE.Mesh(new THREE.ConeGeometry(3.1,2.4,12),roofMat);cap.position.set(13,11.2,0);g.add(cap);
   }
  }
 }
 const weedMat=mat('#947344');
 const twigPoints=[];for(let i=0;i<100;i++){const a=i*2.39996,b=Math.acos(1-2*(i+.5)/100),r=.72+(i%7)*.04;
  const x=Math.sin(b)*Math.cos(a),y=Math.cos(b),z=Math.sin(b)*Math.sin(a);twigPoints.push(x*.32,y*.32,z*.32,x*r,y*r,z*r,x*r,y*r,z*r,x*.78-y*.2,y*.78+x*.2,z*.78);}
 const twigGeo=new THREE.BufferGeometry();twigGeo.setAttribute('position',new THREE.Float32BufferAttribute(twigPoints,3));
 const twigMat=new THREE.LineBasicMaterial({color:0x97774e});
 for(const w of TUMBLEWEEDS){const g=new THREE.Group();g.name=w.id;g.add(new THREE.LineSegments(twigGeo,twigMat));g.scale.setScalar(w.r);scene.add(g);weeds.push({g,...w});}
 return {cactusCount,cornCount,tumbleweeds:weeds.length,update(time,z){corn.clock.value=time;for(const c of cropBatches){const distance=Math.abs(route.near(c.z,z)-z);c.m.visible=distance<(c.near?85:205)&&(!c.proxy||distance>=85);}for(const w of weeds){if(Math.abs(route.near(w.z,z)-z)>330){w.g.visible=false;continue;}w.g.visible=true;const p=weedPose(w,time),wp=route.point(p.x,p.z);w.g.position.set(wp.x,p.y,wp.z);w.g.rotation.set(0,route.angle(p.z),p.roll);}}};
}
