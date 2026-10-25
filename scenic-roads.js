import {courseZ} from './game-config.js';
import {stationClearance} from './fuel.js';
import {INTERSECTIONS} from './road-network.js';
import {biomeAt} from './biomes.js';
import * as route from './route.js';
import {batchStaticGroup} from './coast-art.js';

// Crossing traffic uses the shared route simulation; players retain one race route.
export const OVERPASSES=[{z:4100,color:'#6f9696'},{z:5920,color:'#ba8865'},{z:9620,color:'#839777'},{z:1850,color:'#7b9c96'},{z:4800,color:'#ba8865'},{z:7050,color:'#ba8865'},{z:8850,color:'#839777'},{z:11050,color:'#839777'}].map(o=>({...o,z:courseZ(o.z)}));
export const SIDE_ROADS=INTERSECTIONS.flatMap(z=>[{z,side:1},{z,side:-1}]);
export function scenicRoadClearance(x,z){
 return stationClearance(x,z)||OVERPASSES.some(o=>Math.abs(route.near(z,o.z)-o.z)<11&&Math.abs(x)<510)||SIDE_ROADS.some(o=>Math.abs(route.near(z,o.z)-o.z)<9&&x*o.side>6&&x*o.side<510);
}
export function addScenicRoads({THREE,scene,mat,roadMaterial}){
 const groups=[],moving=[];
 const asphalt=roadMaterial?roadMaterial.clone():mat('#797970'),concrete=mat('#d6cbb4'),line=mat('#f5efd4'),beach=mat('#d9cfa2'),grass=mat('#92a967');
 if(roadMaterial)asphalt.onBeforeCompile=roadMaterial.onBeforeCompile;
 function box(parent,w,h,d,x,y,z,material){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.receiveShadow=true;parent.add(m);return m;}
 function root(z){const g=new THREE.Group(),p=route.point(0,z);g.position.set(p.x,route.elevation(z),p.z);g.rotation.y=route.angle(z);scene.add(g);groups.push({g,z});return g;}
 function road(g,x1,y1,x2,y2,{bridge=false,rail=null,markings=true}={}){
  const dx=x2-x1,dy=y2-y1,length=Math.hypot(dx,dy),slope=Math.atan2(dy,dx),y=(y1+y2)/2;
  const deck=box(g,length,bridge?.65:.12,10.5,(x1+x2)/2,y-(bridge?.35:.06),0,concrete);deck.rotation.z=slope;
  const top=box(g,length,.035,9.8,(x1+x2)/2,y+.025,0,asphalt);top.rotation.z=slope;const uv=top.geometry.attributes.uv,pos=top.geometry.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,(pos.getX(i)+(x1+x2)/2)/2,pos.getZ(i)/2);
  if(markings)for(const edge of [-1,1]){const stripe=box(g,length,.012,.14,(x1+x2)/2,y+.05,edge*4.55,line);stripe.rotation.z=slope;
   if(rail){const bar=box(g,length,.2,.18,(x1+x2)/2,y+1,edge*5.05,rail);bar.rotation.z=slope;}
  }
  if(markings)for(let x=x1+3;x<x2-2;x+=9){const yy=y1+(x-x1)/dx*dy,m=box(g,3,.016,.15,x,yy+.06,0,line);m.rotation.z=slope;
   if(rail)for(const edge of [-1,1])box(g,.12,.9,.12,x,yy+.5,edge*5.05,rail);
  }
 }
 function island(g){
  // A low, bounded island with a beach rim; the approach lands on its flat top.
  const n=48,positions=[-390,1.1,0],indices=[],colors=[],green=new THREE.Color('#92a967').convertSRGBToLinear(),tan=new THREE.Color('#d9cfa2').convertSRGBToLinear();colors.push(green.r,green.g,green.b);
  for(const [r,y] of [[.78,1.1],[.9,.3],[1,-.9]])for(let i=0;i<n;i++){const a=i/n*Math.PI*2;positions.push(-390+Math.cos(a)*124*r,y,Math.sin(a)*82*r);const c=r<.85?green:tan;colors.push(c.r,c.g,c.b);}
  for(let i=0;i<n;i++){const j=(i+1)%n;indices.push(0,1+j,1+i);for(let r=0;r<2;r++){const a=1+r*n+i,b=1+r*n+j,c=1+(r+1)*n+i,d=1+(r+1)*n+j;indices.push(a,b,c,b,d,c);}}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();g.add(new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1})));
  road(g,-440,1.12,-330,1.12);
  // Turnaround at the island village, rather than another road ending in water.
  const ring=new THREE.Mesh(new THREE.RingGeometry(15,25,48),asphalt);ring.rotation.x=-Math.PI/2;ring.position.set(-440,1.16,0);g.add(ring);
  for(const [x,z] of [[-390,32],[-430,40],[-375,-35]]){box(g,10,5,12,x,3.6,z,concrete);box(g,11,.45,13,x,6.3,z,line);for(const dx of [-2.5,2.5])box(g,1.5,1.7,.06,x+dx,4,z-6.02,mat('#729b98'));}
  const treeMat=mat('#6f914f');for(const [x,z,h] of [[-355,29,8],[-402,-44,10],[-440,-31,7],[-460,29,9],[-370,45,7]]){box(g,.4,h/2,.4,x,1.1+h/4,z,concrete);const tree=new THREE.Mesh(new THREE.SphereGeometry(1,10,7),treeMat);tree.scale.set(2.4,h/2,2.4);tree.position.set(x,1.1+h/2,z);g.add(tree);}
 }
 for(const crossing of OVERPASSES){
  const g=root(crossing.z),rail=mat(crossing.color),coastal=biomeAt(crossing.z).coast>.02,left=coastal?-230:-60;
  road(g,left,10,60,10,{bridge:true,rail});
  // Sloped meshes provide continuous surfaces, without the old staircase walls.
  road(g,60,10,180,.08,{bridge:true,rail});road(g,180,.08,510,.08);
  if(coastal){island(g);road(g,-330,1.12,-230,10,{bridge:true,rail});}
  else {road(g,-180,.08,-60,10,{bridge:true,rail});road(g,-510,.08,-180,.08);}
  for(let x=Math.ceil(left/35)*35;x<=60;x+=35){if(Math.abs(x)<13)continue;for(const z of [-3.7,3.7])box(g,1.6,10,1.6,x,4.5,z,concrete);box(g,3,.65,10,x,8.9,0,concrete);}
  batchStaticGroup(THREE,g,{cellSize:55});
  for(let i=0;i<2;i++)moving.push({car:null,parent:g,z:crossing.z,phase:i*140,side:i?1:-1,left,coastal});
 }
 for(const at of INTERSECTIONS){
  const g=root(at);
  // Flush asphalt across the main road. No gates or roadside buildings at the mouths.
  road(g,-510,.034,-8,.034);road(g,-8,.034,8,.034,{markings:false});road(g,8,.034,510,.034);
  for(const side of [-1,1]){
   box(g,.38,.018,4.1,side*9.5,.105,-side*2.25,line);
   for(let i=0;i<5;i++)box(g,2.4,.018,.65,side*12,.108,-3.2+i*1.6,line);
  }
  batchStaticGroup(THREE,g,{cellSize:55});
 }
 return {overpasses:OVERPASSES.length,sideRoads:SIDE_ROADS.length,setCarTemplate(car,paint){
  for(const [i,m] of moving.entries()){const c=car.clone(true),body=paint.clone();body.color.set(['#b8b3a0','#91a7b2','#c5a866'][i%3]).convertSRGBToLinear();const flame=c.getObjectByName('nitro-flame');if(flame)c.remove(flame);
   c.traverse(n=>{if(n.material===paint)n.material=body;if(n.isLight)n.intensity=0;if(n.name==='suspended-body')n.rotation.set(0,0,0);if(n.name.startsWith('wheel-steering-'))n.rotation.y=0;});batchStaticGroup(THREE,c);m.car=c;m.parent.add(c);
  }
 },update(time,z){
  for(const entry of groups)entry.g.visible=Math.abs(route.near(entry.z,z)-z)<560;
  for(const m of moving)if(m.car&&m.parent.visible){const start=m.coastal?-420:-480,end=480,length=end-start,phase=(time*12+m.phase)%length,x=m.side>0?start+phase:end-phase;
   const height=x>180?.08:x>60?10-(x-60)/120*9.92:x>=m.left?10:m.coastal?(x<=-330?1.12:1.12+(x+330)/100*8.88):(x<=-180?.08:.08+(x+180)/120*9.92);
   m.car.position.set(x,height,m.side*2.2);m.car.rotation.y=m.side*Math.PI/2;m.car.rotation.z=0;
  }
 }};
}
