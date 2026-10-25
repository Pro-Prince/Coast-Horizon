import {stationWidth} from './fuel.js';
import {ROAD_HALF} from './game-config.js';
import {PIER,pierDelta} from './seaside.js';
// Oriented vehicle footprint, not just its centre. Keep body and tyres clear of the curb.
export function carFootprint(heading){return {x:1.08*Math.abs(Math.cos(heading))+2.2*Math.abs(Math.sin(heading)),z:2.2*Math.abs(Math.cos(heading))+1.08*Math.abs(Math.sin(heading))};}
export function curbContact(from,to,heading,altitude=0){
 if(altitude>.48)return null;
 const footprint=carFootprint(heading),edge=ROAD_HALF-.20-footprint.x;
 if(to.x>edge)return {x:edge,nx:-1};
 // The pier opening must clear the whole car, including diagonal approaches.
 const opening=Math.abs(pierDelta(to.z))+footprint.z<PIER.halfWidth-.2;
 const rightEdge=-edge-stationWidth(to.z);
 if(to.x<rightEdge&&!opening){
  // A car already on the pier can leave its open sides and sink in the sea.
  if(from.x< -ROAD_HALF-.5&&Math.abs(pierDelta(from.z))<PIER.halfWidth+5)return null;
  return {x:rightEdge,nx:1};
 }
 return null;
}
