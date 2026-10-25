// Shared deterministic ramp contact and flight, used by solo and multiplayer.
export const RAMP={length:12,height:1.8,halfWidth:1.9,minStuntSpeed:12};
export const MIN_RAMP_OVERLAP=.08; // A single tyre on the deck can lift the car.
const GRAVITY=24,SLOW_RATE=.55,SLOW_SECONDS=1;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function rampOverlap(x,ramp,heading=0){
 const half=Math.abs(Math.cos(heading))+2.2*Math.abs(Math.sin(heading));
 return Math.max(0,Math.min(x+half,ramp.x+ramp.w)-Math.max(x-half,ramp.x-ramp.w))/(2*half);
}
export function onRamp(p,ramp){return rampOverlap(p.x,ramp,p.h||0)>=MIN_RAMP_OVERLAP-1e-9&&p.z>=ramp.z-ramp.d&&p.z<=ramp.z+ramp.d;}
// Keep wheel contact once a valid wheel approach is established. Small lateral
// drift must not turn the wooden deck back into a solid wall beneath the car.
export function trackRamp(from,to,heading,speed,ramps,previous=null){
 if(speed<=0||Math.cos(heading)<.65||to.z<from.z)return null;
 const retained=ramps.find(r=>r.id===previous?.id&&Math.abs(r.z-previous.z)<1);
 if(retained&&from.z<=retained.z+retained.d&&to.z>=retained.z-retained.d-2.4&&rampOverlap(to.x,retained,heading)>.001)return retained;
 return ramps.find(r=>from.z<=r.z+r.d&&to.z>=r.z-r.d-2.4&&to.z<=r.z+r.d+12&&
  Math.max(rampOverlap(from.x,r,heading),rampOverlap(to.x,r,heading))>=MIN_RAMP_OVERLAP-1e-9)||null;
}
export function rampSurface(p,ramps,contact=null){
 const ramp=ramps.find(r=>onRamp(p,r)||(r.id===contact?.id&&Math.abs(r.z-contact.z)<1&&p.z>=r.z-r.d&&p.z<=r.z+r.d));
 return ramp?{height:Math.max(0,(p.z-ramp.z+ramp.d)/(2*ramp.d))*ramp.height,pitch:-Math.atan(ramp.height/(2*ramp.d)),ramp}:{height:0,pitch:0,ramp:null};
}
function lipX(from,to,ramp){const t=clamp((ramp.z+ramp.d-from.z)/Math.max(.0001,to.z-from.z),0,1);return from.x+(to.x-from.x)*t;}
export function crossedRamp(from,to,heading,speed,ramps,contact=null){
 if(speed<=0||Math.cos(heading)<.65||to.z<=from.z)return null;
 for(const ramp of ramps){const lip=ramp.z+ramp.d;if(from.z>lip||to.z<lip)continue;
  if(rampOverlap(lipX(from,to,ramp),ramp,heading)>=MIN_RAMP_OVERLAP-1e-9||(contact?.id===ramp.id&&Math.abs(contact.z-ramp.z)<1&&rampOverlap(lipX(from,to,ramp),ramp,heading)>.001))return ramp;
 }return null;
}
export function createJump(ramp,speed,now,startZ=ramp.z+ramp.d,contact=null){
 const vertical=Math.min(9,Math.max(1.2,speed*.15)),duration=(vertical+Math.sqrt(vertical*vertical+2*GRAVITY*ramp.height))/GRAVITY;
 const offset=contact?clamp((lipX(contact.from,contact.to,ramp)-ramp.x)/ramp.w,-1,1):0;
 const instability=clamp((Math.abs(offset)-.45)/.55,0,1)*clamp((speed-8)/32,0,1),side=Math.sign(offset);
 const barrel=speed>70&&instability>.75;
 return {id:ramp.id,start:now,startZ,height:ramp.height,speed,vertical,duration,cinematic:speed>=RAMP.minStuntSpeed,instability,side,barrel,landingRoll:side*instability*.55,landingDamage:Math.round(instability*(barrel?100:58))};
}
export function sampleJump(jump,now){
 const age=Math.max(0,(now-jump.start)/1000),slow=jump.cinematic?SLOW_SECONDS:0;
 const elapsed=Math.min(age,slow)*SLOW_RATE+Math.max(0,age-slow),done=elapsed>=jump.duration;
 const vertical=jump.vertical-GRAVITY*elapsed,progress=Math.min(1,elapsed/jump.duration),arc=Math.sin(Math.PI*progress);
 const roll=done?0:(jump.side||0)*((jump.barrel?Math.PI*2*progress*progress*(3-2*progress):1.6*(jump.instability||0)*arc)+.55*(jump.instability||0)*progress);
 return {height:done?0:Math.max(0,jump.height+jump.vertical*elapsed-.5*GRAVITY*elapsed*elapsed),pitch:done?0:-Math.atan2(vertical,Math.max(8,jump.speed)),roll,yaw:done?0:(jump.side||0)*(jump.instability||0)*.5*arc,done,elapsed,age,timeScale:age<slow?SLOW_RATE:1,progress};
}
