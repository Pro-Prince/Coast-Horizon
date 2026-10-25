// Visual-only coastal materials and static rendering batches. No driving state.
export function installCoastMaterials(THREE,renderer,{roadMat,sandMat,grassMat}){
 const loader=new THREE.TextureLoader();
 const road=loader.load('/materials/coast/asphalt.jpg',()=>{window.__DRIVE_ASSETS.asphalt=true;});
 road.encoding=THREE.sRGBEncoding;road.wrapS=road.wrapT=THREE.RepeatWrapping;
 road.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
 roadMat.color.set('#d7d7d2').convertSRGBToLinear();roadMat.map=road;roadMat.roughness=.94;roadMat.envMapIntensity=.12;roadMat.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
 vec4 coastSample=mapTexelToLinear(texture2D(map,vUv));
 diffuseColor*=vec4(mix(vec3(.18),coastSample.rgb,.55),coastSample.a);
 #endif`);};roadMat.needsUpdate=true;
 const groundDetails=createGroundDetails(THREE,renderer);
 groundDetails.apply(sandMat,0);groundDetails.apply(grassMat,1);
 return groundDetails;
}

// World-space detail stays continuous across road segments and blends between
// biomes. Mirrored wrapping avoids hard tile seams; distance fading avoids shimmer.
function createGroundDetails(THREE,renderer){
 const loader=new THREE.TextureLoader();
 function load(name){const texture=loader.load('/materials/coast/'+name+'.jpg',()=>{window.__DRIVE_ASSETS[name]=true;});texture.wrapS=texture.wrapT=THREE.MirroredRepeatWrapping;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return texture;}
 const sand=load('desert-sand'),field=load('countryside-ground');
 return {apply(material,blend){if(!material)return;material.roughness=.96;material.envMapIntensity=.1;
  material.onBeforeCompile=shader=>{
   shader.uniforms.uSandDetail={value:sand};shader.uniforms.uFieldDetail={value:field};
   shader.vertexShader='varying vec3 vGroundWorld;varying float vGroundBlend;\n'+(blend==='vertex'?'attribute float groundBlend;\n':'')+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
    vec4 detailPosition=vec4(transformed,1.0);
    #ifdef USE_INSTANCING
     detailPosition=instanceMatrix*detailPosition;
    #endif
    vGroundWorld=(modelMatrix*detailPosition).xyz;
    vGroundBlend=${blend==='vertex'?'groundBlend':blend.toFixed(1)};`);
   shader.fragmentShader='uniform sampler2D uSandDetail;uniform sampler2D uFieldDetail;varying vec3 vGroundWorld;varying float vGroundBlend;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    vec2 groundUv=vGroundWorld.xz/vec2(3.0,6.0);
    float sandGrain=dot(texture2D(uSandDetail,groundUv).rgb,vec3(.299,.587,.114));
    float fieldGrain=dot(texture2D(uFieldDetail,groundUv).rgb,vec3(.299,.587,.114));
    float groundGrain=mix((sandGrain-.78)*.7,(fieldGrain-.57)*.95,vGroundBlend);
    float groundFade=1.0-smoothstep(45.0,160.0,distance(cameraPosition,vGroundWorld));
    diffuseColor.rgb*=1.0+groundGrain*groundFade;`);
  };
  material.customProgramCacheKey=()=>`ground-detail-${blend}`;material.needsUpdate=true;
 }};
}

// Merge immutable opaque meshes and same-colour contact-shadow planes.
// Preserve collider nodes, materials and
// segment visibility; wheels, traffic, wind grass and all physics stay separate.
export function batchStaticGroup(THREE,root,{preserveColliders=false,cellSize=0}={}){
 root.updateMatrixWorld(true);
 const inverse=new THREE.Matrix4().copy(root.matrixWorld).invert(),groups=new Map();
 root.traverse(n=>{
  if(!n.isMesh||n.isInstancedMesh||Array.isArray(n.material)||(n.material.transparent&&!(n.material.isMeshBasicMaterial&&!n.material.depthWrite))||!n.visible)return;
  let parent=n.parent;while(parent&&parent!==root){if(!parent.visible)return;parent=parent.parent;}
  const center=new THREE.Vector3().setFromMatrixPosition(n.matrixWorld).applyMatrix4(inverse);
  const cell=cellSize?`${Math.floor(center.x/cellSize)},${Math.floor(center.z/cellSize)}`:'';
  const key=[cell,n.material.uuid,n.castShadow,n.receiveShadow,Object.keys(n.geometry.attributes).sort().join(',')].join(':');
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(n);
 });
 for(const nodes of groups.values()){
  if(nodes.length<2)continue;
  const first=nodes[0],attributes={},matrix=new THREE.Matrix4(),indexParts=[];let vertexCount=0,indexCount=0;
  for(const n of nodes){
   // Keep indexed vertices: expanding each triangle duplicated foliage vertices
   // more than fivefold and defeated the GPU vertex cache.
   const g=n.geometry.clone(),count=g.attributes.position.count;
   const indices=g.index?g.index.array:Uint32Array.from({length:count},(_,i)=>i);
   indexParts.push({indices,base:vertexCount});vertexCount+=count;indexCount+=indices.length;
   matrix.multiplyMatrices(inverse,n.matrixWorld);g.applyMatrix4(matrix);
   for(const [name,attribute] of Object.entries(g.attributes)){
    if(!attributes[name])attributes[name]={size:attribute.itemSize,parts:[],length:0};
    attributes[name].parts.push(attribute.array);attributes[name].length+=attribute.array.length;
   }
   if(preserveColliders&&n.userData.collider){const proxy=new THREE.Object3D();proxy.userData={...n.userData};proxy.position.copy(n.position);n.parent.add(proxy);}
   n.parent.remove(n);g.dispose();
  }
  const geo=new THREE.BufferGeometry();
  for(const [name,attribute] of Object.entries(attributes)){
   const array=new Float32Array(attribute.length);let at=0;for(const part of attribute.parts){array.set(part,at);at+=part.length;}
   geo.setAttribute(name,new THREE.BufferAttribute(array,attribute.size));
  }
  const indices=vertexCount>65535?new Uint32Array(indexCount):new Uint16Array(indexCount);let offset=0;
  for(const part of indexParts)for(const index of part.indices)indices[offset++]=index+part.base;
  geo.setIndex(new THREE.BufferAttribute(indices,1));
  geo.computeBoundingSphere();const batch=new THREE.Mesh(geo,first.material);batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;batch.name='static-art-batch';root.add(batch);
 }
}

// The route is built once in world coordinates. Do not rebuild thousands of
// stationary matrices every frame, including the hidden 9 km behind the player.
export function freezeScenery(root){
 root.updateMatrixWorld(true);
 const moving=[];root.traverse(n=>{if(n.userData.movingScenery)moving.push(n);});
 root.updateMatrixWorld=function(){if(this.visible)for(const n of moving)n.updateMatrixWorld(true);};
}
