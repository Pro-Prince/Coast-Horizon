import {trafficLODFactory} from './traffic-lod.js';
import {tumbleweedObstacles} from './tumbleweeds.js';
import {createRaceWorld,advanceRaceWorld,raceWorldCars,nearbyWorldCars,pickupAvailable,pickupLap,pickupKey,claimPickup,damageRival} from './race-pickups.js';
import {RIVAL_COLORS} from './race-grid.js';
import {trackRamp} from './stunts.js';
import {continueImpact} from './traffic-impact.js';
import {cloneCarPaint,CAR_COLORS} from './imported-car.js';
import * as defaultRoute from './route.js';
import {ROAD_HALF} from './game-config.js';
import {crashImpulse} from './driving.js';
import {batchStaticGroup} from './coast-art.js';

export function createAdventure({route=defaultRoute,THREE,scene,car,paint,trafficTemplate=car,trafficPaint=paint,mat,mesh,roundBox,col,foliage}) {
  const orange=mat('#ee9852'),ivory=mat('#f5efd8'),stone=mat('#889a8b'),dark=mat('#415853');
  const coneGeo=new THREE.CylinderGeometry(.035,.22,.65,10);
  const bandGeo=new THREE.CylinderGeometry(.11,.16,.16,10);
  const baseGeo=roundBox(.55,.10,.55,.06);
  const rockGeo=new THREE.DodecahedronGeometry(1,1);
  const railGeo=roundBox(3.3,.55,.25,.08),postGeo=roundBox(.16,.95,.18,.04);
  const stripeGeo=new THREE.BoxGeometry(.25,.57,.018);
  const makeFarCar=trafficLODFactory(THREE);
  const hazardNodes=new Map(),trafficNodes=new Map(),trafficPool=[],pickupNodes=new Map();
  let raceStart=0,raceWorld=null,isShared=()=>false,canPickup=()=>true;const pendingPickups=new Map();
  let impacts=[],cooldowns={},onImpact=()=>{},onPickup=()=>{},lastImpact=-1000;
  function place(node,x,z,h=0,y=0){const p=route.point(x,z);node.position.set(p.x,y+route.elevation(z,x),p.z);node.rotation.set(-Math.atan(route.grade(z,x,h))*(route.openWorld?1:Math.cos(h)),route.angle(z)+h,0,'YXZ');}
  let timeAnchor=performance.now(),elapsedAnchor=0,clockRate=1,previousTraffic=new Map(),collisionUntil=0,lastKind='',lastNotice='',lastFrame=0;

  function now(){return elapsedAnchor+(performance.now()-timeAnchor)*clockRate;}
  function setRate(rate){if(rate===clockRate)return;elapsedAnchor=now();timeAnchor=performance.now();clockRate=rate;}
  function sync(ms){clockRate=1;elapsedAnchor=ms;timeAnchor=performance.now();previousTraffic.clear();}
  function cone(parent,x,z) {
    mesh(baseGeo,dark,parent,x,.05,z,true);
    mesh(coneGeo,orange,parent,x,.4,z,true);
    mesh(bandGeo,ivory,parent,x,.42,z,false);
  }
  function makeHazard(o) {
    const g=new THREE.Group();scene.add(g);
    if(o.kind==='ramp'){
      const wood=mat('#b8905e',.94),edge=mat('#604d37',.95),mark=mat('#fff0b7',.85),slope=Math.atan(o.height/(o.d*2));
      const side=new THREE.Shape();side.moveTo(-o.d,.02);side.lineTo(o.d,.02);side.lineTo(o.d,o.height);side.closePath();
      const wedge=new THREE.ExtrudeGeometry(side,{depth:.12,bevelEnabled:false});wedge.rotateY(-Math.PI/2);
      for(const x of [-o.w+.12,o.w])mesh(wedge,edge,g,x,0,0,true);
      const plank=new THREE.BoxGeometry(o.w*2,.10,(o.d*2)/12-.025);
      for(let i=0;i<12;i++){const z=-o.d+(i+.5)*(o.d*2)/12,n=mesh(plank,wood,g,0,(z+o.d)/(o.d*2)*o.height+.05,z,true);n.rotation.x=-slope;}
      for(const x of [-o.w+.15,o.w-.15])for(let i=1;i<=3;i++){const z=-o.d+i*o.d*.65,h=(z+o.d)/(o.d*2)*o.height;mesh(new THREE.BoxGeometry(.13,h,.15),edge,g,x,h/2,z,true);}
      const arrowShape=new THREE.Shape();arrowShape.moveTo(-.55,-.6);arrowShape.lineTo(0,0);arrowShape.lineTo(.55,-.6);arrowShape.lineTo(.55,-.27);arrowShape.lineTo(0,.33);arrowShape.lineTo(-.55,-.27);arrowShape.closePath();
      const arrow=new THREE.ShapeGeometry(arrowShape);arrow.rotateX(-Math.PI/2);arrow.rotateY(Math.PI);
      for(const z of [-2.5,.3,3.1]){const n=mesh(arrow,mark,g,0,(z+o.d)/(o.d*2)*o.height+.12,z,false);n.rotation.x=-slope;}
      batchStaticGroup(THREE,g);
      g.userData.dispose=()=>{const materials=new Set();g.traverse(n=>{if(n.isMesh){n.geometry.dispose();for(const m of (Array.isArray(n.material)?n.material:[n.material]))materials.add(m);}});materials.forEach(m=>m.dispose());};
    }else if(o.kind==='works') {
      for(const x of [-1.4,1.4])mesh(postGeo,dark,g,x,.48,0,true);
      mesh(railGeo,ivory,g,0,.82,0,true);
      for(let i=-5;i<=5;i++)for(const side of [-1,1]) {
        const stripe=mesh(stripeGeo,orange,g,i*.28,.82,side*.14,false);stripe.rotation.z=-.35;
      }
      // Cones warn from both approaches and outline the lane that is closed.
      for(const z of [-12,-7,-3,3,7,12])cone(g,-o.side*(1.5+Math.max(0,Math.abs(z)-3)*.08),z);
      const pile=mesh(rockGeo,stone,g,o.side*.55,.55,4,true);pile.scale.set(.7,.6,1);
      cone(g,o.side*.9,6);
    } else {
      const rock=mesh(rockGeo,stone,g,0,.56,0,true);rock.scale.set(.83,.74,.88);rock.rotation.y=.7;
      const small=mesh(rockGeo,stone,g,o.side*.52,.22,1.1,true);small.scale.set(.35,.29,.38);
      cone(g,-o.side*.9,-4);cone(g,-o.side*.9,4);
    }
    if(o.kind!=='ramp'){batchStaticGroup(THREE,g);g.userData.dispose=()=>g.traverse(n=>{if(n.name==='static-art-batch')n.geometry.dispose();});}
    place(g,o.x,o.z);
    return g;
  }
  function trafficCar(id) {
    const g=trafficTemplate.clone(true),body=cloneCarPaint(trafficPaint),lamps=new Map();const flame=g.getObjectByName('nitro-flame');if(flame)g.remove(flame);
    const palette=paint.userData.importedCar?CAR_COLORS.traffic:['#d8bd78','#c98d75','#9eb7a4'];
    body.color.copy(col(palette[Math.abs(Number(id.split(':')[1]))%palette.length]));
    g.traverse(n=>{if(n.material===trafficPaint)n.material=body;if(n.material?.userData.carTailLamp){const source=n.material;if(!lamps.has(source)){const lamp=source.clone();lamp.emissiveIntensity=.08;lamps.set(source,lamp);}n.material=lamps.get(source);}if(n.isLight)n.intensity=0;if(n.name.startsWith('wheel-steering-'))n.rotation.y=0;if(n.name==='suspended-body')n.rotation.set(0,0,0);});
    const boost=new THREE.Group();boost.name='rival-boost';boost.visible=false;const flameMat=new THREE.MeshBasicMaterial({color:0x45caff});
    for(const x of [-.65,.65]){const f=new THREE.Mesh(new THREE.ConeGeometry(.14,1.5,6),flameMat);f.position.set(x,.4,-2.7);f.rotation.x=-Math.PI/2;boost.add(f);}g.add(boost);g.userData.boost=boost;
    g.userData.body=body;g.userData.lamps=[...lamps.values()];g.userData.wheels=[];g.userData.steering=[];g.traverse(n=>{if(n.name.startsWith('party-wheel-')||n.userData.radius)g.userData.wheels.push(n);if(n.name==='wheel-steering-0'||n.name==='wheel-steering-1')g.userData.steering.push(n);});const near=new THREE.Group();for(const child of [...g.children])near.add(child);g.add(near);const far=makeFarCar(body.color);far.visible=false;g.add(far);g.userData.near=near;g.userData.far=far;g.userData.distant=false;scene.add(g);return g;
  }
  function sample(z,time){return [...route.traffic(z,time,280,impacts),...(route.openWorld?[]:nearbyWorldCars(raceWorld,z,time,280,impacts))].map(o=>({...o,w:1,d:2.2,kind:'traffic'}));}
  function launchRadius(){return car.userData.launchProtected?28:0;}
  function update(z,menu=false,parkedX=0,startGuards=[]) {
    const frameTime=performance.now();
    if(raceWorld)advanceRaceWorld(raceWorld,now());
    if(frameTime-lastFrame>250)previousTraffic.clear();
    lastFrame=frameTime;
    impacts=impacts.filter(hit=>now()-hit.time<8000);
    const nearbyPickups=route.pickups(z,340),pickupIds=new Set(nearbyPickups.map(o=>o.id));
    for(const o of nearbyPickups){
      if(!pickupNodes.has(o.id)){
        const g=new THREE.Group(),glow=new THREE.MeshBasicMaterial({color:o.kind==='fuel'?0xffd76c:o.kind==='repair'?0x72ffc7:0x35dcff});
        const sh=new THREE.Shape();
        if(o.kind==='fuel'){sh.moveTo(-.45,-.7);sh.lineTo(.35,-.7);sh.lineTo(.35,.25);sh.lineTo(.65,.05);sh.lineTo(.65,-.4);sh.lineTo(.8,-.4);sh.lineTo(.8,.18);sh.lineTo(.35,.55);sh.lineTo(.35,.75);sh.lineTo(-.45,.75);const hole=new THREE.Path();hole.moveTo(-.27,.23);hole.lineTo(-.27,.56);hole.lineTo(.16,.56);hole.lineTo(.16,.23);hole.closePath();sh.holes.push(hole);
        }else if(o.kind==='repair'){
          sh.moveTo(-.12,-.68);sh.quadraticCurveTo(0,-.86,.12,-.68);sh.lineTo(.12,.04);sh.lineTo(.34,.24);sh.lineTo(.34,.55);sh.lineTo(.17,.72);sh.lineTo(.17,.37);sh.lineTo(-.17,.37);sh.lineTo(-.17,.72);sh.lineTo(-.34,.55);sh.lineTo(-.34,.24);sh.lineTo(-.12,.04);
        }else{sh.moveTo(.13,.8);sh.lineTo(-.43,-.08);sh.lineTo(-.05,-.08);sh.lineTo(-.2,-.8);sh.lineTo(.5,.18);sh.lineTo(.12,.18);}sh.closePath();
        const bolt=mesh(new THREE.ExtrudeGeometry(sh,{depth:.15,bevelEnabled:true,bevelThickness:.04,bevelSize:.04,bevelSegments:2}),glow,g,0,1.45,0,false);
        const ring=mesh(new THREE.TorusGeometry(.8,.045,8,32),glow,g,0,.08,0,false);ring.rotation.x=Math.PI/2;
        g.userData.bolt=bolt;scene.add(g);pickupNodes.set(o.id,g);
      }
      const n=pickupNodes.get(o.id);place(n,o.x,o.z);n.visible=raceWorld?pickupAvailable(raceWorld,o.id,pickupLap(o.z)):(cooldowns[o.id]||0)<=now();
      n.userData.bolt.rotation.y=now()*.002;n.userData.bolt.position.y=1.4+Math.sin(now()*.004)*.18;
    }
    for(const [id,n] of pickupNodes)if(!pickupIds.has(id))n.visible=false;
    const obstacles=route.hazards(z,330),ids=new Set(obstacles.map(o=>o.id));
    for(const [id,node] of hazardNodes)if(!ids.has(id)){scene.remove(node);node.userData.dispose?.();hazardNodes.delete(id);}
    for(const o of obstacles)if(!hazardNodes.has(o.id))hazardNodes.set(o.id,makeHazard(o));
    const cars=sample(z,now());
    if(menu&&!route.openWorld)for(const o of cars){
      if(o.rival)continue;
      // The left lane (positive road X) is reserved for passing menu traffic.
      // Hide the few cars adjacent to a multiplayer parked car if that seat occupies this lane.
      o.x=ROAD_HALF*.5;o.h=0;o.menuHidden=Math.abs(o.z-z)<12&&Math.abs(o.x-parkedX)<2.5;
    }
    if(route.openWorld)for(const o of cars){if(Math.hypot(o.x-car.position.x,o.z-car.position.z)<(menu?45:launchRadius())||startGuards.some(p=>typeof p==='object'&&Math.hypot(o.x-p.x,o.z-p.z)<28))o.menuHidden=true;}
    for(const o of cars)if(!o.rival&&!route.openWorld&&startGuards.some(at=>Math.abs(route.near(o.z,at)-at)<70))o.menuHidden=true;
    const carIds=new Set(cars.map(o=>o.id));
    for(const [id,node] of trafficNodes)if(!carIds.has(id)){node.visible=false;trafficPool.push(node);trafficNodes.delete(id);}
    for(const o of cars){
      if(!trafficNodes.has(o.id)){const n=trafficPool.pop()||trafficCar(o.id);n.userData.body.color.copy(col(o.rival?RIVAL_COLORS[Number(o.id.split(':')[1])]:CAR_COLORS.traffic[Math.abs(Number(o.id.split(':')[1]))%CAR_COLORS.traffic.length]));trafficNodes.set(o.id,n);}
      const node=trafficNodes.get(o.id);node.visible=!o.menuHidden;node.userData.boost.visible=!!o.rival&&o.boostUntil>now();node.userData.boost.scale.z=1+Math.sin(now()*.05)*.12;place(node,o.x,o.z,o.h,o.y||0);node.rotation.x+=o.pitch||0;node.rotation.z=o.roll||0;const contact=node.getObjectByName('contact-shadow');if(contact)contact.visible=!(o.y>.25);
      const distance=Math.hypot(o.x-car.position.x,o.z-z);node.userData.distant=distance>(node.userData.distant?58:76);
      node.userData.near.visible=!node.userData.distant;node.userData.far.visible=node.userData.distant;
      node.userData.far.userData.paint.color.copy(node.userData.body.color);
      if(node.userData.distant)continue;
      for(const p of node.userData.steering)p.rotation.y=Math.max(-.4,Math.min(.4,o.h*1.5));
      for(const n of node.userData.wheels)n.rotation.x=((o.id.startsWith('cross:')?o.x:o.z)/(paint.userData.importedCar?.31:.405))%(Math.PI*2);
    }
    return cars.filter(o=>!o.menuHidden);
  }
  function collide(from,to,heading,cars,velocity,altitude=0,rampContact=null) {
    const solids=[...route.hazards(to.z,20),...route.bridgeBarriers(to.z)].filter(o=>Math.abs(o.z-to.z)<22&&!(o.kind==='ramp'&&trackRamp(from,to,heading,velocity,[o],rampContact))).flatMap(o=>{
      const h=o.h??route.tangent(o.z),x=route.center(o.z)+o.x;
      const main={...o,x,h};
      if(o.kind!=='works')return [main];
      return [main,{id:o.id+'-pile',kind:'rock',x:x+Math.cos(h)*o.side*.55+Math.sin(h)*4,z:o.z-Math.sin(h)*o.side*.55+Math.cos(h)*4,h,w:.7,d:1}];
    });
    let hit=null;
    for(const o of [...solids,...(route.openWorld?[]:tumbleweedObstacles(to.z,now()/1000)),...route.crashObstacles(to.z),...(foliage?foliage(to.z):[]),...cars.filter(o=>Math.abs(o.z-to.z)<18)]) {
      const obstacleHeight=o.kind==='tumbleweed'?o.height:o.kind==='tree'?8:o.kind==='traffic'||o.kind==='peer'||o.kind==='wreck'||o.kind==='police'?1.8:o.kind==='ramp'?o.height:1.3;
      if(altitude>(o.y||0)+obstacleHeight+.25||(o.y||0)>altitude+2.05)continue;
      const prior=previousTraffic.get(o.id)||o,old={...prior,z:route.near(prior.z,o.z)};
      const contact=route.sweep(from,hit||to,heading,o,old);
      if(contact){let impulse=crashImpulse(from,heading,velocity,o,contact);
        // Continued pressure on a bumper nudges traffic aside instead of trapping the player.
        if(o.kind==='traffic'&&velocity>.5&&impulse.strength<.65&&contact.nz<-.5){const side=Math.sign(o.x-from.x)||((Number(o.id.split(':')[1])%2)?1:-1);impulse={dx:0,dz:.65,spin:side*.5,strength:.65};}
        hit={...contact,kind:o.kind,strength:impulse.strength,fatal:o.kind==='tumbleweed'&&o.giant};lastKind=o.kind;
        if(impulse.strength>=.3&&(o.kind==='traffic'||o.kind==='peer')&&performance.now()-lastImpact>750){
          lastImpact=performance.now();
          if(o.kind==='traffic')addImpact({target:o.id,...impulse,time:now()});
          onImpact({target:o.id,...impulse});
        }
      }
    }
    previousTraffic=new Map(cars.map(o=>[o.id,o]));
    return hit;
  }
  function addImpact(hit){if(!isShared())damageRival(raceWorld,hit);hit=continueImpact(impacts.find(o=>o.target===hit.target),hit);impacts=impacts.filter(o=>o.target!==hit.target);impacts.push(hit);}
  function collect(from,to){
    for(const o of route.pickups(to.z,12)){
      const lap=pickupLap(o.z),key=pickupKey(o.id,lap);
      if(!canPickup(o.kind)||(pendingPickups.get(key)||0)>now()||(raceWorld?!pickupAvailable(raceWorld,o.id,lap):(cooldowns[o.id]||0)>now()))continue;
      const dz=to.z-from.z,dx=to.x-from.x,t=Math.max(0,Math.min(1,((o.z-from.z)*dz+(o.x-from.x)*dx)/(dz*dz+dx*dx||1)));
      if(Math.hypot(from.x+dx*t-o.x,from.z+dz*t-o.z)<1.65){if(raceWorld){if(!isShared())claimPickup(raceWorld,o,lap,'player',now());pendingPickups.set(key,now()+1000);}else cooldowns[o.id]=now()+20000;onPickup(o.id,o.kind);}
    }
  }
  return {sync,now,setRate,update,collide,collect,addImpact,setRaceStart:value=>{raceStart=value;if(!value)raceWorld=null;else if(raceWorld?.startAt!==value)raceWorld=createRaceWorld(value);pendingPickups.clear();previousTraffic.clear();},
    restoreRaceWorld:value=>{if(value){raceWorld=value;raceStart=value.startAt;}},racers:()=>raceWorldCars(raceWorld,now(),impacts),
    configure:(impact,pickup,shared,allowed)=>{onImpact=impact;onPickup=pickup;isShared=shared||isShared;canPickup=allowed||canPickup;},
    restore:(hits,items)=>{impacts=hits||[];cooldowns=items||{};},
    pickup:(id,until)=>{cooldowns[id]=until;},
    debug:()=>({raceWorld,time:now(),center:0,hazards:route.hazards(car.position.z,200),traffic:sample(car.position.z,now()),pickups:route.pickups(car.position.z),cooldowns,lastCollision:lastKind})};
}
