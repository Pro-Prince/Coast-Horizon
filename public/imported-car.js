import {batchStaticGroup} from './coast-art.js';
// Clean, texture-free hatchback surfaces follow the supplied model's proportions.
export const CAR_COLORS={host:'#b83b32',guest:'#3c7d9e',traffic:['#91928a','#94725a','#d6b25b']};
// Axles measured from the supplied GLB, kept separate from the suspension body.
const AXLES=[[-.895,.31,1.397],[.866,.31,1.397],[-.895,.31,-1.472],[.866,.31,-1.472]];
export async function loadCarAsset(){
 return {axles:AXLES};
}
export function cloneCarPaint(material,color){const copy=material.clone();if(color)copy.color.set(color).convertSRGBToLinear();return copy;}
export function createImportedCar(template,{THREE,scene,col,mesh,shadowBlob,detail=1}){
 const car=new THREE.Group(),bodyVisual=new THREE.Group();bodyVisual.name='suspended-body';car.add(bodyVisual);scene.add(car);
 const paint=new THREE.MeshStandardMaterial({color:col(CAR_COLORS.host),roughness:.47,metalness:0,envMapIntensity:.38});paint.userData.importedCar=true;
 const glass=new THREE.MeshStandardMaterial({color:col('#203c42'),roughness:.45,metalness:0,envMapIntensity:.25});
 const trim=new THREE.MeshStandardMaterial({color:col('#364942'),roughness:.85,metalness:0});
 const rearMat=new THREE.MeshStandardMaterial({color:col('#982a2a'),emissive:col('#a52923'),emissiveIntensity:.08,roughness:.38,envMapIntensity:.25});
 rearMat.userData.carTailLamp=true;
 const headMat=new THREE.MeshStandardMaterial({color:col('#f7efd1'),emissive:col('#f7e6ba'),emissiveIntensity:.13,roughness:.8});
 // Rounded side profiles make complete, smooth surfaces without baked reflections,
 // warped texture detail or pieces of the generated car intersecting the new wheels.
 function smoothGeometry(geometry){
  const positions=geometry.attributes.position,unique=[],indices=[],lookup=new Map();
  for(let i=0;i<positions.count;i++){
   const xyz=[positions.getX(i),positions.getY(i),positions.getZ(i)],key=xyz.map(v=>Math.round(v*100000)).join(',');
   if(!lookup.has(key)){lookup.set(key,unique.length/3);unique.push(...xyz);}indices.push(lookup.get(key));
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(unique,3));g.setIndex(indices);g.computeVertexNormals();geometry.dispose();return g;
 }
 function taper(n){
  n.updateMatrix();n.geometry.applyMatrix4(n.matrix);n.position.set(0,0,0);n.rotation.set(0,0,0);
  const a=n.geometry.attributes.position;for(let i=0;i<a.count;i++){
   const y=a.getY(i),t=THREE.MathUtils.clamp((y-1.06)/.72,0,1);a.setX(i,a.getX(i)*(1-.13*t));
  }
  a.needsUpdate=true;n.geometry.computeVertexNormals();return n;
 }
 function profileMesh(shape,width,bevel,material,isCabin=false){
  const geo=new THREE.ExtrudeGeometry(shape,{depth:width,bevelEnabled:true,bevelSegments:Math.max(3,Math.round(10*detail)),steps:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:Math.max(8,Math.round(24*detail))});
  geo.rotateY(-Math.PI/2);geo.translate(width/2,0,0);
  if(!isCabin){const a=geo.attributes.position;for(let i=0;i<a.count;i++)a.setX(i,a.getX(i)*(1-.075*THREE.MathUtils.smoothstep(Math.abs(a.getZ(i)),1.4,2.15)));}
  const clean=smoothGeometry(geo),pos=clean.attributes.position,norm=clean.attributes.normal;
  // Flat door panels need flat normals: smoothing the large cap triangles
  // creates diagonal highlights across an otherwise clean painted surface.
  for(let i=0;i<pos.count;i++){
   const edge=(width/2+bevel)*(isCabin?1:1-.075*THREE.MathUtils.smoothstep(Math.abs(pos.getZ(i)),1.4,2.15));
   if(Math.abs(Math.abs(pos.getX(i))-edge)<.0001)norm.setXYZ(i,Math.sign(pos.getX(i)),0,0);
  }
  const n=mesh(clean,material,bodyVisual,0,0,0,true);return isCabin?taper(n):n;
 }
 const outline=new THREE.Shape();
 outline.moveTo(-2.015,.31);outline.quadraticCurveTo(-2.075,.33,-2.075,.53);
 outline.lineTo(-2.04,.86);outline.quadraticCurveTo(-2.02,1.025,-1.79,1.045);
 outline.lineTo(-.7,1.075);outline.lineTo(.72,1.04);outline.lineTo(1.62,.98);
 outline.quadraticCurveTo(2.015,.94,2.04,.73);outline.lineTo(2.04,.44);
 outline.quadraticCurveTo(2.035,.31,1.96,.31);outline.lineTo(1.397+.395,.31);
 outline.absarc(1.397,.31,.395,0,Math.PI,false);outline.lineTo(-1.472+.395,.31);
 outline.absarc(-1.472,.31,.395,0,Math.PI,false);outline.lineTo(-2.015,.31);
 outline.closePath();profileMesh(outline,1.73,.10,paint);
 const cabin=new THREE.Shape();cabin.moveTo(-1.72,1.035);cabin.lineTo(-1.575,1.62);
 cabin.quadraticCurveTo(-1.55,1.72,-1.32,1.735);cabin.quadraticCurveTo(-.3,1.80,.51,1.695);
 cabin.quadraticCurveTo(.60,1.69,.665,1.595);cabin.lineTo(1.06,1.035);cabin.closePath();
 profileMesh(cabin,1.43,.115,paint,true);
 function roundRect(w,h,r){const sh=new THREE.Shape(),x=-w/2,y=-h/2;
  sh.moveTo(x+r,y);sh.lineTo(x+w-r,y);sh.quadraticCurveTo(x+w,y,x+w,y+r);sh.lineTo(x+w,y+h-r);sh.quadraticCurveTo(x+w,y+h,x+w-r,y+h);sh.lineTo(x+r,y+h);sh.quadraticCurveTo(x,y+h,x,y+h-r);sh.lineTo(x,y+r);sh.quadraticCurveTo(x,y,x+r,y);return sh;}
 function panel(w,h,r,material,x,y,z,rx=0,ry=0){const g=new THREE.ShapeGeometry(roundRect(w,h,r),Math.max(6,Math.round(20*detail)));material.polygonOffset=true;material.polygonOffsetFactor=-1;material.polygonOffsetUnits=-2;const n=mesh(g,material,bodyVisual,x,y,z,false);n.rotation.set(rx,ry,0);n.receiveShadow=false;return n;}
 function lens(w,h,r,material,x,y,z,ry=0){
  const g=new THREE.ExtrudeGeometry(roundRect(w,h,r),{depth:.016,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:3,steps:1,curveSegments:Math.max(6,Math.round(16*detail))});
  const n=mesh(smoothGeometry(g),material,bodyVisual,x,y,z,false);n.rotation.y=ry;n.receiveShadow=false;
 }
 // One clean pane at each end, with no interior image or reflection pasted on it.
 taper(panel(1.36,.515,.075,glass,0,1.405,.935,-.615,0));
 taper(panel(1.34,.47,.065,glass,0,1.395,-1.755,.243,Math.PI));
 // Side windows have a body-coloured central pillar and gently rounded corners.
 function sidePane(points,side){
  const s=new THREE.Shape();for(let i=0;i<points.length;i++){
   const p=points[i],prev=points[(i+points.length-1)%points.length],next=points[(i+1)%points.length];
   const a=p.map((v,k)=>v+(prev[k]-v)*.06),b=p.map((v,k)=>v+(next[k]-v)*.06);
   if(i===0)s.moveTo(...a);else s.lineTo(...a);s.quadraticCurveTo(...p,...b);
  }s.closePath();const g=new THREE.ShapeGeometry(s,Math.max(5,Math.round(12*detail)));g.rotateY(-Math.PI/2);
  const n=mesh(g,glass,bodyVisual,side*.838,0,0,false);n.material.side=THREE.DoubleSide;n.receiveShadow=false;taper(n);
 }
 for(const side of [-1,1]){
  sidePane([[-1.51,1.15],[-1.40,1.59],[-1.34,1.62],[-.49,1.62],[-.46,1.59],[-.46,1.15]],side);
  sidePane([[-.35,1.15],[-.35,1.59],[-.32,1.62],[.49,1.62],[.55,1.57],[.85,1.15]],side);
  const mirror=mesh(new THREE.SphereGeometry(1,20,12),paint,bodyVisual,side*.955,1.18,.69,true);mirror.scale.set(.135,.085,.17);
  mesh(new THREE.BoxGeometry(.035,.033,.18),trim,bodyVisual,side*.97,.97,-.25,false);
  lens(.30,.25,.10,headMat,side*.635,.75,2.165);
  lens(.16,.285,.075,rearMat,side*.665,.785,-2.193,Math.PI);
 }
 // Restrained sculpted details read at gameplay distance without noisy decals.
 const satin=new THREE.MeshStandardMaterial({color:col('#afbfb0'),roughness:.55,metalness:.08,envMapIntensity:.28});
 const lampInset=new THREE.MeshStandardMaterial({color:col('#edb694'),roughness:.4,envMapIntensity:.2});
 const badge=mesh(new THREE.SphereGeometry(1,12,8),satin,bodyVisual,0,.93,-2.18,false);badge.scale.set(.037,.037,.014);
 panel(.32,.025,.012,trim,.08,1.19,-1.81,.243,Math.PI);
 lens(.38,.028,.014,rearMat,0,1.675,-1.625,Math.PI);
 for(const side of [-1,1])lens(.12,.045,.018,lampInset,side*.665,.735,-2.216,Math.PI);
 // A quiet dark plate and simple grille avoid stark white patches and tiny markings.
 panel(.45,.135,.035,trim,0,.67,-2.183,0,Math.PI);
 panel(.67,.075,.035,trim,0,.46,2.15);
 panel(.38,.11,.025,trim,0,.605,2.15);
 // Glass is softly shaded toward the sill; paint keeps the shared role colours.
 bodyVisual.traverse(n=>{
  if(!n.isMesh||n.material!==glass)return;
  const pos=n.geometry.attributes.position,colors=[];
  for(let i=0;i<pos.count;i++){const v=.60+.40*THREE.MathUtils.smoothstep(pos.getY(i),-.22,.23);colors.push(v,v,v);}
  n.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 });glass.vertexColors=true;
 batchStaticGroup(THREE,bodyVisual);
 const wheelMeshes=[],steerPivots=[],WHEEL_R=.31;
 // Concentric tyres and recessed rims remain centered on their axles.
 const rubber=new THREE.MeshStandardMaterial({color:col('#30352f'),roughness:1,metalness:0});
 const rim=new THREE.MeshStandardMaterial({color:col('#aeb6aa'),roughness:.86,metalness:0});
 const recess=new THREE.MeshStandardMaterial({color:col('#535d53'),roughness:1,metalness:0});
 const profile=[[.205,-.14],[.267,-.14],[.298,-.12],[WHEEL_R,-.085],[WHEEL_R,.085],[.298,.12],[.267,.14],[.205,.14],[.205,-.14]].map(([r,x])=>new THREE.Vector2(r,x));
 const tyreGeo=new THREE.LatheGeometry(profile,Math.max(16,Math.round(48*detail)));tyreGeo.rotateZ(Math.PI/2);
 const discGeo=new THREE.CylinderGeometry(.212,.212,.245,Math.max(16,Math.round(40*detail)));discGeo.rotateZ(Math.PI/2);
 const lipGeo=new THREE.TorusGeometry(.21,.012,6,Math.max(16,Math.round(40*detail)));lipGeo.rotateY(Math.PI/2);
 const spokeGeo=new THREE.BoxGeometry(.018,.155,.04);
 const hubGeo=new THREE.CylinderGeometry(.06,.06,.025,24);hubGeo.rotateZ(Math.PI/2);
 // Merge the rim details once so every car needs only three draw calls per wheel.
 const rimPositions=[],rimNormals=[];
 function rimPart(geometry,x,y,z,angle=0){
  const flat=geometry.index?geometry.toNonIndexed():geometry.clone();
  flat.applyMatrix4(new THREE.Matrix4().makeRotationX(angle).setPosition(x,y,z));
  rimPositions.push(...flat.attributes.position.array);rimNormals.push(...flat.attributes.normal.array);flat.dispose();
 }
 for(const side of [-1,1]){
  rimPart(lipGeo,side*.135,0,0);rimPart(hubGeo,side*.145,0,0);
  for(let spoke=0;spoke<5;spoke++){
   const angle=spoke*Math.PI*2/5;rimPart(spokeGeo,side*.137,Math.cos(angle)*.124,Math.sin(angle)*.124,angle);
  }
 }
 const rimGeo=new THREE.BufferGeometry();rimGeo.setAttribute('position',new THREE.Float32BufferAttribute(rimPositions,3));rimGeo.setAttribute('normal',new THREE.Float32BufferAttribute(rimNormals,3));
 lipGeo.dispose();hubGeo.dispose();spokeGeo.dispose();
 for(let i=0;i<4;i++){
  const pivot=new THREE.Group(),rolling=new THREE.Group();
  pivot.name='wheel-steering-'+i;pivot.position.fromArray(template.axles[i]);pivot.position.y=WHEEL_R;
  mesh(tyreGeo,rubber,rolling,0,0,0,true);mesh(discGeo,recess,rolling,0,0,0,true);mesh(rimGeo,rim,rolling,0,0,0,true);
  rolling.userData.radius=WHEEL_R;pivot.add(rolling);car.add(pivot);wheelMeshes.push(rolling);if(i<2)steerPivots.push(pivot);
 }

 // Moving cars use the existing smooth contact shadow; only static scenery
 // enters the cached shadow map, avoiding stale self-shadow flicker.
 car.traverse(n=>{if(n.isMesh)n.castShadow=false;});
 const contact=shadowBlob(car,0,0,4.2,6.5);
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;
 const context=shadowCanvas.getContext('2d'),gradient=context.createRadialGradient(64,64,12,64,64,64);
 gradient.addColorStop(0,'rgba(15,25,26,.78)');gradient.addColorStop(.55,'rgba(15,25,26,.48)');gradient.addColorStop(1,'rgba(15,25,26,0)');context.fillStyle=gradient;context.fillRect(0,0,128,128);
 contact.material=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2});contact.position.y=.035;
 const rearLight=new THREE.PointLight(0xff3311,0,3);rearLight.position.set(0,.55,-2.3);car.add(rearLight);
 const tip=new THREE.Object3D();tip.position.set(-.68,.36,-2.12);car.add(tip);
 return {car,paint,bodyVisual,wheelMeshes,steerPivots,WHEEL_R,rearMat,rearLight,exhaustTips:[tip]};
}
