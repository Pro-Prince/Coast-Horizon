import {CIRCUIT_LENGTH,ROAD_HALF,courseZ} from './game-config.js';
export const FUEL_RANGE=CIRCUIT_LENGTH*2;
export const STATIONS=[2250,8250].map(courseZ).map((z,i)=>({id:'fuel-'+i,z,x:-13,region:i===0?'COAST':'CORN COUNTRY'}));
export const stationDelta=(z,at)=>((z-at+CIRCUIT_LENGTH/2)%CIRCUIT_LENGTH+CIRCUIT_LENGTH)%CIRCUIT_LENGTH-CIRCUIT_LENGTH/2;
export function stationWidth(z){let width=0;for(const s of STATIONS){const d=Math.abs(stationDelta(z,s.z));width=Math.max(width,10*Math.max(0,Math.min(1,(65-d)/30)));}return width;}
export const stationClearance=(x,z)=>x< -ROAD_HALF+.5&&x> -32&&STATIONS.some(s=>Math.abs(stationDelta(z,s.z))<80);
export const onForecourt=(x,z)=>stationWidth(z)>.01&&x>=-ROAD_HALF-stationWidth(z)-.2&&x<=-ROAD_HALF+1;
export const consumeFuel=(fuel,metres)=>Math.max(0,Math.min(100,fuel)-Math.max(0,metres)*100/FUEL_RANGE);
