// Small live camera pass, composited into the main canvas: no extra WebGL context per frame.
export function createRearView(THREE,renderer,scene,car){
  const frame=document.getElementById('mirrorFrame'),button=document.getElementById('toggleMirror');
  let enabled=false;try{enabled=localStorage.getItem('coast-mirror')==='on';}catch{}
  function updateControl(){frame.hidden=!enabled;document.body.classList.toggle('mirror-hidden',!enabled);if(button){button.textContent='MIRROR '+(enabled?'ON':'OFF')+' · M';button.setAttribute('aria-pressed',String(enabled));}}
  updateControl();
  const target=new THREE.WebGLRenderTarget(480,154,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:true});
  const camera=new THREE.PerspectiveCamera(57,373/119,.15,900);
  const quadScene=new THREE.Scene(),quadCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,transparent:true,
    uniforms:{view:{value:target.texture},aspect:{value:373/119}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`uniform sampler2D view;uniform float aspect;varying vec2 vUv;
      void main(){vec2 p=vec2((vUv.x-.5)*aspect,vUv.y-.5);p.x=max(abs(p.x)-(aspect*.5-.5),0.);
        if(length(p)>.499)discard;
        gl_FragColor=texture2D(view,vec2(1.-vUv.x,vUv.y));
        #include <encodings_fragment>
      }`});
  quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));
  let lastCapture=-Infinity,rect=frame.getBoundingClientRect();
  const result={frames:0,objects:0,
    get enabled(){return enabled;},
    toggle(){enabled=!enabled;lastCapture=-Infinity;try{localStorage.setItem('coast-mirror',enabled?'on':'off');}catch{}updateControl();},
    capture(){
      if(!enabled)return;const now=performance.now();if(now-lastCapture<1000/12)return;lastCapture=now;
      rect=frame.getBoundingClientRect();camera.aspect=rect.width/rect.height;camera.updateProjectionMatrix();
      const h=car.rotation.y,back=new THREE.Vector3(-Math.sin(h),0,-Math.cos(h));
      camera.position.copy(car.position).addScaledVector(back,2.3);camera.position.y+=1.9;
      camera.lookAt(camera.position.x+back.x*25,car.position.y+1.05,camera.position.z+back.z*25);
      const wasVisible=car.visible,shadows=renderer.shadowMap.autoUpdate,pendingShadow=renderer.shadowMap.needsUpdate;
      car.visible=false;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=false;
      renderer.setRenderTarget(target);renderer.render(scene,camera);
      result.objects=renderer.info.render.calls;result.frames++;
      renderer.setRenderTarget(null);car.visible=wasVisible;renderer.shadowMap.autoUpdate=shadows;renderer.shadowMap.needsUpdate=pendingShadow;
    },
    overlay(){
      if(!enabled)return;
      const auto=renderer.autoClear;renderer.autoClear=false;renderer.clearDepth();
      material.uniforms.aspect.value=rect.width/rect.height;
      renderer.setViewport(rect.left,innerHeight-rect.bottom,rect.width,rect.height);
      renderer.render(quadScene,quadCamera);
      renderer.setViewport(0,0,innerWidth,innerHeight);renderer.autoClear=auto;
    }
  };if(button)button.addEventListener('click',()=>result.toggle());return result;
}
