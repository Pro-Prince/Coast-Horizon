// A struck car moves aside, holds there briefly, then eases back into traffic.
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function impactOffset(hit,time){
 const age=Math.max(0,(time-hit.time)/1000),settle=1-smooth((age-3)/5),rise=1-Math.exp(-age*6),strength=Math.hypot(hit.dx,hit.dz),side=Math.sign(hit.spin)||Math.sign(hit.dx)||1;
 const rear=Math.abs(hit.dz)>Math.abs(hit.dx)*1.5;
 const x=rear?side*Math.min(3.8,2.5+strength*.25):hit.dx*1.25,z=hit.dz*1.6,h=Math.max(-.85,Math.min(.85,(hit.spin||0)*.75));
 return {x:((hit.carry?.x||0)+x*rise)*settle,z:((hit.carry?.z||0)+z*rise)*settle,h:Math.max(-.5,Math.min(.5,(hit.carry?.h||0)+h*rise))*(1-smooth((age-.65)/2.2)),slow:strength*rise*settle};
}
export function continueImpact(previous,hit){
 if(!previous||hit.carry)return hit;
 const carry=impactOffset(previous,hit.time);return {...hit,carry:{x:carry.x,z:carry.z,h:carry.h}};
}
