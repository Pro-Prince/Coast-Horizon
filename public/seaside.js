import {scenicRoadClearance} from './scenic-roads.js';
import {onForecourt,stationClearance} from './fuel.js';
import {boundInstances} from './render-bounds.js';
import {ROAD_HALF,COAST_LIMIT} from './game-config.js';
import * as route from './route.js';
import {biomeAt} from './biomes.js';
export const PIER={z:100,halfWidth:6,startX:-ROAD_HALF,endX:-52};
export const WATER_EDGE=-(ROAD_HALF+3.6);
export const pierDelta=z=>route.near(z,PIER.z)-PIER.z;
export const pierApproach=z=>Math.abs(pierDelta(z))<=PIER.halfWidth-.7;
export const onPier=(x,z)=>x>=PIER.endX+.6&&x<=PIER.startX+1&&pierApproach(z);
export const inWater=(x,z)=>onForecourt(x,z)?false:biomeAt(z).inland>.03?false:route.onBridge(z)?Math.abs(x)>ROAD_HALF+1:x<WATER_EDGE+.45&&!onPier(x,z);
export function validCoastPose(x,z){return onForecourt(x,z)||x>=COAST_LIMIT-.01||(x>=PIER.endX-5&&Math.abs(pierDelta(z))<PIER.halfWidth+5);}

export function addSeaside({THREE,scene,segments,mesh,mat,foliageGeo,leaves,bark}){
 const wood=mat('#c2a57d'),woodLight=mat('#d4bb93'),post=mat('#8b7655');
 const pier=new THREE.Group();scene.add(pier);
 function place(geo,material,x,y,z){const p=route.point(x,z),m=mesh(geo,material,pier,p.x,y,p.z,true);m.rotation.y=route.angle(z);return m;}
 for(let x=PIER.endX+.38;x<PIER.startX;x+=.78){
  place(new THREE.BoxGeometry(.75,.20,PIER.halfWidth*2),Math.round(x)%3?wood:woodLight,x,-.025,PIER.z);
 }
 for(let x=PIER.endX+1;x<-9;x+=6){
  for(const side of [-1,1]){
   place(new THREE.CylinderGeometry(.19,.24,3.2,8),post,x,-1.4,PIER.z+side*(PIER.halfWidth-.35));
   place(new THREE.CylinderGeometry(.14,.16,.75,8),post,x,.4,PIER.z+side*(PIER.halfWidth-.18));
  }
 }
 // A wide open entrance and open end let the driver explore the pier and fall off.
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#285c52';ctx.fillRect(0,0,256,128);ctx.fillStyle='#fff4d3';ctx.font='bold 37px sans-serif';ctx.textAlign='center';ctx.fillText('PIER →',128,52);ctx.font='20px sans-serif';ctx.fillText('SLOW · OPEN EDGE',128,95);
 const signMat=new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(canvas),roughness:1});
 place(new THREE.BoxGeometry(.12,2,.12),post,-ROAD_HALF-1.1,1,PIER.z-9);
 const sign=place(new THREE.BoxGeometry(2.7,1.35,.12),signMat,-ROAD_HALF-1.1,2.3,PIER.z-9);sign.rotation.y+=Math.PI;
 const plants=[];
 for(let z=28;z<route.LENGTH;z+=145){
  if(stationClearance(-8,z)||biomeAt(z).coast<.7||Math.abs(pierDelta(z))<20||route.bridgeApproach(z)||route.incidentZone(z))continue;
  const x=-ROAD_HALF-1.6,p=route.point(x,z),h=5.5+(z%4)*.45;
  place(new THREE.CylinderGeometry(.1,.17,2.5,8),bark,x,1.1,z);
  const tree=mesh(foliageGeo,leaves[Math.floor(z)%leaves.length],scene,p.x,h*.51,p.z,true);tree.scale.set(.65,h*.49,.7);
  plants.push({id:'coastal-tree-'+z,kind:'tree',x,z,w:.65,d:.7});
 }
 // Bent, tapered grass blades: darker roots, sunlit tips and a gentle shared breeze.
 const positions=[],colors=[],indices=[],base=new THREE.Color('#345222').convertSRGBToLinear(),tip=new THREE.Color('#709348').convertSRGBToLinear();
 for(let blade=0;blade<3;blade++){
  const a=blade*Math.PI*2/3,cs=Math.cos(a),sn=Math.sin(a),off=positions.length/3;
  for(const [width,y,bend] of [[.035,0,0],[.024,.28,.06],[0,.55,.16]]){
   for(const side of [-1,1]){positions.push(side*width*cs+bend*sn,y,side*width*sn-bend*cs);const c=base.clone().lerp(tip,y/.55);colors.push(c.r,c.g,c.b);}
  }
  indices.push(off,off+1,off+2,off+1,off+3,off+2,off+2,off+3,off+4,off+3,off+5,off+4);
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();
 const wind={value:0},grass=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:1,side:THREE.DoubleSide});
 grass.onBeforeCompile=shader=>{shader.uniforms.grassTime=wind;shader.vertexShader='uniform float grassTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x += sin(grassTime*1.5+instanceMatrix[3].x*.6+instanceMatrix[3].z*.4)*position.y*position.y*.25;\nfloat grassDistance=distance(cameraPosition.xz,instanceMatrix[3].xz);transformed.y *= 1.0-smoothstep(65.0,115.0,grassDistance);');};
 const grassBatches=[],tuftsPerSegment=700;
 const matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0);let seed=447;
 const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(const segment of segments){
  if(biomeAt(segment.at).coast<.3)continue;
  const batch=new THREE.InstancedMesh(geo,grass,tuftsPerSegment);batch.frustumCulled=false;batch.receiveShadow=true;batch.layers.set(1);
  for(let i=0;i<tuftsPerSegment;i++){
   const x=ROAD_HALF+1.3+Math.pow(random(),2.8)*10,z=segment.at-25+random()*50,p=route.point(x,z),size=.55+random()*.75;
   const visible=!route.bridgeApproach(z)&&!scenicRoadClearance(x,z);
   rotation.setFromAxisAngle(up,random()*Math.PI*2);matrix.compose(new THREE.Vector3(p.x,.012,p.z),rotation,new THREE.Vector3(visible?size:0,visible?size*.6:0,visible?size:0));batch.setMatrixAt(i,matrix);
  }
  batch.instanceMatrix.needsUpdate=true;boundInstances(THREE,batch);segment.group.add(batch);grassBatches.push({batch,z:segment.at});
 }
 return {update:(dt,z=0)=>{
  wind.value+=dt;
  for(const entry of grassBatches)entry.batch.visible=Math.abs(route.near(entry.z,z)-z)<150;
 },plants,grassTufts:grassBatches.length*tuftsPerSegment};
}
