// Shared geometry: each field is instanced, never one object per leaf or plant.
export function createCorn(THREE,renderer){
 const leafPositions=[],leafUV=[],structurePositions=[],structureColors=[];
 const stem=new THREE.Color('#758942').convertSRGBToLinear(),husk=new THREE.Color('#a0ab50').convertSRGBToLinear(),gold=new THREE.Color('#c7ad62').convertSRGBToLinear();
 function tri(a,b,c,color){structurePositions.push(...a,...b,...c);for(let n=0;n<3;n++)structureColors.push(color.r,color.g,color.b);}
 function rod(a,b,r0,r1,color,sides=4){
  const axis=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).normalize(),u=new THREE.Vector3(1,0,0);
  if(Math.abs(axis.x)>.9)u.set(0,0,1);u.cross(axis).normalize();const v=new THREE.Vector3().crossVectors(axis,u);
  const point=(p,r,t)=>[p[0]+r*(u.x*Math.cos(t)+v.x*Math.sin(t)),p[1]+r*(u.y*Math.cos(t)+v.y*Math.sin(t)),p[2]+r*(u.z*Math.cos(t)+v.z*Math.sin(t))];
  for(let i=0;i<sides;i++){const t=i/sides*Math.PI*2,s=(i+1)/sides*Math.PI*2,A=point(a,r0,t),B=point(a,r0,s),C=point(b,r1,s),D=point(b,r1,t);tri(A,B,C,color);tri(A,C,D,color);}
 }
 rod([0,0,0],[.045,2.85,0],.034,.012,stem,5);
 // Alternating long leaves arch upward, then droop, with a raised central rib.
 for(let n=0;n<7;n++){
  const angle=n*2.46,y=.48+n*.29,len=1.14-Math.abs(n-3)*.065,dx=Math.cos(angle),dz=Math.sin(angle),width=.15;
  const verts=[];
  for(let j=0;j<=4;j++){const t=j/4,r=len*t,h=y+.7*Math.sin(t*Math.PI*.72)-.48*t*t,w=width*Math.pow(Math.sin(Math.PI*t),.7);
   verts.push([[dx*r-dz*w,h-.045*Math.sin(Math.PI*t),dz*r+dx*w],[dx*r,h,dz*r],[dx*r+dz*w,h-.045*Math.sin(Math.PI*t),dz*r-dx*w]]);
  }
  for(let j=0;j<4;j++)for(let k=0;k<2;k++){
   for(const [a,b,c] of [[[j,k],[j+1,k],[j,k+1]],[[j,k+1],[j+1,k],[j+1,k+1]]]){
    for(const [r,col] of [a,b,c]){leafPositions.push(...verts[r][col]);leafUV.push(col/2,r/4);}
   }
  }
 }
 // Two tapered ears wrapped in green husks, with a small golden silk tip.
 for(const [angle,y] of [[.6,1.3],[3.6,1.7]]){
  const dx=Math.cos(angle),dz=Math.sin(angle),a=[dx*.12,y,dz*.12],b=[dx*.24,y+.48,dz*.24],c=[dx*.22,y+.6,dz*.22];
  rod(a,b,.075,.05,husk,5);rod(b,c,.042,.008,gold,4);
 }
 // Open branching tassels, replacing the old solid triangular spear.
 rod([.045,2.75,0],[.06,3.18,0],.016,.003,gold,4);
 for(let n=0;n<5;n++){const a=n*Math.PI*2/5,dx=Math.cos(a),dz=Math.sin(a);rod([.045,2.78,0],[dx*.22,3.07,dz*.22],.011,.002,gold,3);}
 function geometry(pos){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();return g;}
 const leaves=geometry(leafPositions);leaves.setAttribute('uv',new THREE.Float32BufferAttribute(leafUV,2));
 const structure=geometry(structurePositions);structure.setAttribute('color',new THREE.Float32BufferAttribute(structureColors,3));
 const farPos=[],farUV=[];
 for(const a of [0,Math.PI/2]){const dx=Math.cos(a)*1.15,dz=Math.sin(a)*1.15;
  farPos.push(-dx,0,-dz,dx,0,dz,dx,3.25,dz,-dx,0,-dz,dx,3.25,dz,-dx,3.25,-dz);farUV.push(0,0,1,0,1,1,0,0,1,1,0,1);
 }
 const distant=geometry(farPos);distant.setAttribute('uv',new THREE.Float32BufferAttribute(farUV,2));
 const atlas=new THREE.WebGLRenderTarget(256,512,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,generateMipmaps:false});
 const distantMaterial=new THREE.MeshBasicMaterial({map:atlas.texture,alphaTest:.32,side:THREE.DoubleSide});
 const texture=new THREE.TextureLoader().load('/materials/coast/corn-leaf.jpg',()=>{
  // Bake the same model once. Thousands of farther plants then cost four triangles each.
  const preview=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1.15,1.15,3.25,0,.1,20);camera.position.set(0,0,6);
  const leafMat=foliage.clone(),stemMat=stalk.clone();preview.add(new THREE.Mesh(leaves,leafMat),new THREE.Mesh(structure,stemMat));
  preview.add(new THREE.HemisphereLight(0xe3f0f4,0x69704e,.9));const sun=new THREE.DirectionalLight(0xffedcc,1.15);sun.position.set(26,40,28);preview.add(sun,new THREE.AmbientLight(0xd7e2c3,.55));
  const target=renderer.getRenderTarget(),clear=renderer.getClearColor(new THREE.Color()),alpha=renderer.getClearAlpha(),mapping=renderer.toneMapping;
  renderer.setRenderTarget(atlas);renderer.setClearColor(0x000000,0);renderer.toneMapping=THREE.NoToneMapping;renderer.clear();renderer.render(preview,camera);
  const pixels=new Uint8Array(256*512*4);renderer.readRenderTargetPixels(atlas,0,0,256,512,pixels);const baked=new THREE.DataTexture(pixels,256,512,THREE.RGBAFormat);baked.minFilter=THREE.LinearMipmapLinearFilter;baked.magFilter=THREE.LinearFilter;baked.generateMipmaps=true;baked.needsUpdate=true;distantMaterial.map=baked;distantMaterial.needsUpdate=true;
  renderer.setRenderTarget(target);renderer.setClearColor(clear,alpha);renderer.toneMapping=mapping;leafMat.dispose();stemMat.dispose();atlas.dispose();
 });texture.encoding=THREE.sRGBEncoding;texture.anisotropy=4;
 const foliage=new THREE.MeshStandardMaterial({map:texture,color:0xe6edbf,roughness:.92,side:THREE.DoubleSide});
 const stalk=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1});
 const clock={value:0};
 for(const material of [foliage,stalk,distantMaterial]){
  material.onBeforeCompile=shader=>{
   shader.uniforms.cropTime=clock;
   shader.vertexShader='uniform float cropTime;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    float cropDistance=length((viewMatrix*modelMatrix*instanceMatrix[3]).xyz);
    float sway=sin(cropTime*1.2+instanceMatrix[3].x*.18+instanceMatrix[3].z*.12);
    transformed.x+=sway*.055*pow(max(0.0,position.y)/3.2,2.0);
    transformed.y*=1.0-smoothstep(115.0,185.0,cropDistance);`);
  };
 }
 return {leaves,structure,distant,distantMaterial,foliage,stalk,clock};
}
