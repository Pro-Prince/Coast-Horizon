// Original Little Coast steering, restored from drive_little_coast.html.
// A limited-rate steering input changes the car's direction directly, without yaw inertia or drift.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const wrapAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
const MAX_STEER=.62,STEER_RATE=3.2,MAX_SPEED=42;
export function stepHandling(state,input,speed,heading,handbrake,dt){
  const target=clamp(input,-1,1)*MAX_STEER;
  const steer=state.steer+clamp(target-state.steer,-STEER_RATE*dt,STEER_RATE*dt);
  const speedFrac=clamp(Math.abs(speed)/MAX_SPEED,0,1);
  const turnAbility=.25+.75*Math.min(speedFrac/.35,1);
  const yawRate=Math.abs(speed)>.05?steer*turnAbility*1.9*Math.sign(speed):0;
  const yaw=wrapAngle(heading+yawRate*dt);
  // Preserve braking smoke without introducing sideways sliding into the old controls.
  const tireSlip=handbrake&&Math.abs(speed)>6?.65:0;
  return {steer,yawRate,heading:yaw,travelHeading:yaw,tireSlip};
}
