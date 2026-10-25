// Shared, locally hosted CC0 scans. See materials/CREDITS.txt.
export async function loadSurfaces(THREE){
 const loader=new THREE.TextureLoader(),maps={};
 await Promise.all(['asphalt','plaster','concrete'].flatMap(kind=>['color','normal','roughness'].map(async role=>{
  const t=await loader.loadAsync(`/santa-monica/materials/${kind}-${role}.jpg`);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;if(role==='color')t.encoding=THREE.sRGBEncoding;(maps[kind]??={})[role]=t;
 })));
 function surface(kind,color='#ffffff',strength=.45){return new THREE.MeshStandardMaterial({color:new THREE.Color(color).convertSRGBToLinear(),map:maps[kind].color,normalMap:maps[kind].normal,normalScale:new THREE.Vector2(strength,strength),roughnessMap:maps[kind].roughness,roughness:1,metalness:0,envMapIntensity:.25});}
 function planar(geo,size=4){
  const g=geo.index?geo.toNonIndexed():geo.clone(),a=g.attributes.position,uv=[];
  for(let i=0;i<a.count;i+=3){const p=new THREE.Vector3().fromBufferAttribute(a,i),q=new THREE.Vector3().fromBufferAttribute(a,i+1),r=new THREE.Vector3().fromBufferAttribute(a,i+2),n=q.sub(p).cross(r.sub(p));
   const x=Math.abs(n.x),y=Math.abs(n.y),z=Math.abs(n.z);for(let k=0;k<3;k++){const j=i+k;uv.push((y>x&&y>z?a.getX(j):x>z?a.getZ(j):a.getX(j))/size,(y>x&&y>z?a.getZ(j):a.getY(j))/size);}
  }g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;
 }
 // Reflective window panes with frames, mullions and subtle interior depth.
 const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d'),grad=ctx.createLinearGradient(0,0,80,256);
 grad.addColorStop(0,'#9bafbf');grad.addColorStop(.38,'#667981');grad.addColorStop(.44,'#3b494c');grad.addColorStop(1,'#151f27');ctx.fillStyle=grad;ctx.fillRect(0,0,256,256);
 ctx.fillStyle='#c1b4a1';ctx.fillRect(21,27,58,179);ctx.fillStyle='#313b43';ctx.fillRect(31,36,49,179);ctx.fillStyle='#8a8070';ctx.fillRect(185,28,43,173);ctx.fillStyle='#27303a';ctx.fillRect(184,33,30,185);
 ctx.fillStyle='#283039';ctx.fillRect(0,0,256,11);ctx.fillRect(0,245,256,11);ctx.fillRect(0,0,10,256);ctx.fillRect(246,0,10,256);ctx.fillRect(124,0,6,256);ctx.fillRect(0,125,256,5);
 ctx.fillStyle='#a8a8a2';ctx.fillRect(9,9,2,236);ctx.fillRect(0,240,256,4);ctx.fillStyle='#dfeaf322';ctx.beginPath();ctx.moveTo(16,12);ctx.lineTo(120,12);ctx.lineTo(14,210);ctx.fill();
 const windowMap=new THREE.CanvasTexture(c);windowMap.encoding=THREE.sRGBEncoding;windowMap.anisotropy=8;
 const windowMat=new THREE.MeshStandardMaterial({map:windowMap,color:0xffffff,roughness:.27,metalness:.32,envMapIntensity:.65,side:THREE.DoubleSide});
 function district(model){const cache=new Map();model.traverse(n=>{if(!n.isMesh)return;
  if(n.name.startsWith('windows')){const a=n.geometry.attributes.position,uv=[];for(let i=0;i<a.count;i++)uv.push(...[[0,0],[1,0],[1,1],[0,1]][i%4]);n.geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));n.material=windowMat;n.castShadow=false;return;}
  const building=n.name.startsWith('buildings'),road=n.name.startsWith('roads'),green=n.name.startsWith('green'),kind=building?'plaster':road?'asphalt':'concrete',key=kind+n.material.uuid;let material=cache.get(key);if(!material){material=surface(kind);material.color.copy(n.material.color).lerp(new THREE.Color('#e3e1da').convertSRGBToLinear(),building?.4:road?0:.15);cache.set(key,material);}if(road)material.color.set('#9ca3a6').convertSRGBToLinear();n.material=material;n.geometry=planar(n.geometry,building?4.5:road?18:7);
 });}
 return {surface,planar,district,windowMat};
}

export function refineCar(THREE,car,paint){
 paint.roughness=.3;paint.metalness=.24;paint.envMapIntensity=.8;
 car.traverse(n=>{if(!n.isMesh||!n.material||n.material===paint)return;const m=n.material,c=m.color;if(!c)return;
  // Preserve existing lamp metadata used by brakes and cloned traffic.
  if(m.userData.carTailLamp){m.roughness=.24;m.envMapIntensity=.7;return;}
  const hex=c.clone().convertLinearToSRGB().getHexString();
  if(hex==='405c59'){m.color.set('#263946').convertSRGBToLinear();m.roughness=.16;m.metalness=.38;m.envMapIntensity=1;}
  if(hex==='aeb6aa'){m.color.set('#c4c9cb').convertSRGBToLinear();m.roughness=.26;m.metalness=.8;m.envMapIntensity=.9;}
  if(hex==='364942'||hex==='30352f'){m.color.set('#23262a').convertSRGBToLinear();m.roughness=.85;}
 });
 const body=car.getObjectByName('suspended-body'),trim=new THREE.MeshStandardMaterial({color:0x151719,roughness:.65}),chrome=new THREE.MeshStandardMaterial({color:0xb8bec3,roughness:.28,metalness:.8});
 function bar(x,y,z,w,h,d,material=trim){const n=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);n.position.set(x,y,z);body.add(n);return n;}
 bar(0,.4,-2.11,1.38,.11,.08);bar(0,.83,-2.16,.24,.035,.025,chrome);bar(0,1.64,-1.69,1.13,.04,.07);bar(0,1.55,-1.79,.3,.025,.04);bar(.28,1.18,-1.81,.42,.022,.02);
 for(const side of [-1,1]){bar(side*.925,.44,0,.018,.08,2.35);bar(side*.944,.89,-.31,.024,.033,.22,chrome);bar(side*.943,.89,-1.12,.024,.033,.2,chrome);}
 const c=document.createElement('canvas');c.width=256;c.height=80;const ctx=c.getContext('2d');ctx.fillStyle='#d4d0bd';ctx.fillRect(0,0,256,80);ctx.fillStyle='#33383c';ctx.font='bold 40px monospace';ctx.textAlign='center';ctx.fillText('MONICA',128,55);const tex=new THREE.CanvasTexture(c);tex.encoding=THREE.sRGBEncoding;const plate=new THREE.Mesh(new THREE.PlaneGeometry(.4,.125),new THREE.MeshStandardMaterial({map:tex,roughness:.6}));plate.rotation.y=Math.PI;plate.position.set(0,.67,-2.155);body.add(plate);
}

export async function installLighting({THREE,renderer,scene,sky,clouds,moon,hemi,fillLight}){
 renderer.toneMappingExposure=.95;
 scene.fog.color.set('#b9c4c9').convertSRGBToLinear();scene.fog.near=230;scene.fog.far=560;
 hemi.color.setHex(0xc1d4ef);hemi.groundColor.setHex(0x625d54);hemi.intensity=.65;
 moon.color.setHex(0xffecd5);moon.intensity=2.5;moon.shadow.mapSize.set(2048,2048);moon.shadow.normalBias=.04;
 fillLight.color.setHex(0xb1c9e4);fillLight.intensity=.22;clouds.visible=false;
 sky.material.dispose();sky.material=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,
  vertexShader:'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec3 vDirection;
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
   float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(11.7,4.3);a*=.5;}return v;}
   void main(){vec3 d=normalize(vDirection);float h=max(d.y,0.);vec3 color=mix(vec3(.58,.66,.7),vec3(.13,.31,.51),pow(clamp(h*1.8,0.,1.),.55));
    vec2 p=d.xz/(max(d.y,.04)+.16)*2.3;float density=fbm(p),edge=smoothstep(.47,.66,density)*smoothstep(.02,.18,h);float shade=fbm(p+vec2(.12,.3));vec3 cloud=mix(vec3(.43,.49,.56),vec3(.98,.95,.88),smoothstep(.38,.68,shade));color=mix(color,cloud,edge*.92);
    float sun=pow(max(dot(d,normalize(vec3(.6,.63,-.55))),0.),180.);color+=vec3(1.,.75,.45)*sun*.5;gl_FragColor=vec4(color,1.);
    #include <tonemapping_fragment>
    #include <encodings_fragment>
   }`});
 const hdr=await new THREE.RGBELoader().setDataType(THREE.UnsignedByteType).loadAsync('/santa-monica/materials/street-light.hdr');
 const pmrem=new THREE.PMREMGenerator(renderer),env=pmrem.fromEquirectangular(hdr);scene.environment=env.texture;hdr.dispose();pmrem.dispose();
}
