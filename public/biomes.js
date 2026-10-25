import {CIRCUIT_LENGTH} from './game-config.js';
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function biomeAt(z){
 z=(((z%CIRCUIT_LENGTH)+CIRCUIT_LENGTH)%CIRCUIT_LENGTH)*12000/CIRCUIT_LENGTH;
 const inland=smooth((z-2900)/700)*(1-smooth((z-10800)/850));
 const farm=smooth((z-7200)/700);
 const desert=inland*(1-farm),field=inland*farm,coast=1-inland;
 return {coast,desert,field,inland,name:field>=desert&&field>coast?'CORN COUNTRY':desert>coast?'DESERT':'COAST'};
}

// The road travels well inland: solid ground extends past the coastal shoreline.
export const outerLandWidth=z=>9.85+biomeAt(z).inland*720;

export function tumbleweedPose(z,time){
 const phase=((time*.95+z*.37)%52+52)%52;
 return {x:phase-26,z:z+Math.sin(time*.12+z)*2,y:.48+Math.abs(Math.sin(phase*2))*.08,roll:-phase/.48};
}
